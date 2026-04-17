import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Text, VStack } from "@chakra-ui/react";
import { usePlaidLink } from "react-plaid-link";

type PlaidLinkButtonProps = {
  onLinked?: () => Promise<void> | void;
  buttonLabel?: string;
};

type CreateLinkTokenResponse = {
  linkToken: string;
  expiration?: string | null;
};

type ExchangePublicTokenResponse = {
  ok: boolean;
  itemId: string;
  institutionName?: string | null;
};

function getApiBaseUrlValue() {
  const rawBaseUrlValue = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  return rawBaseUrlValue || "http://localhost:5000";
}

function getStoredAuthTokenValue() {
  const possibleKeysValue = [
    "authToken",
    "token",
    "jwt",
    "accessToken",
    "igi_auth_token",
  ];

  for (const keyValue of possibleKeysValue) {
    const storedValue = localStorage.getItem(keyValue);
    if (storedValue) return storedValue;
  }

  return "";
}

async function apiPostValue<TResponseValue>(
  pathValue: string,
  bodyValue: unknown,
): Promise<TResponseValue> {
  const apiBaseUrlValue = getApiBaseUrlValue();
  const authTokenValue = getStoredAuthTokenValue();

  const headersValue: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authTokenValue) {
    headersValue.Authorization = `Bearer ${authTokenValue}`;
  }

  const responseValue = await fetch(`${apiBaseUrlValue}${pathValue}`, {
    method: "POST",
    headers: headersValue,
    credentials: "include",
    body: JSON.stringify(bodyValue),
  });

  const responseTextValue = await responseValue.text();
  let parsedValue: unknown = null;

  try {
    parsedValue = responseTextValue ? JSON.parse(responseTextValue) : null;
  } catch {
    parsedValue = responseTextValue;
  }

  if (!responseValue.ok) {
    const errorMessageValue =
      typeof parsedValue === "object" &&
      parsedValue !== null &&
      "error" in parsedValue &&
      typeof (parsedValue as { error?: unknown }).error === "string"
        ? (parsedValue as { error: string }).error
        : typeof parsedValue === "string" && parsedValue
          ? parsedValue
          : `Request failed with status ${responseValue.status}`;

    throw new Error(errorMessageValue);
  }

  return parsedValue as TResponseValue;
}

export default function PlaidLinkButton({
  onLinked,
  buttonLabel = "Link Bank Account",
}: PlaidLinkButtonProps) {
  const [linkTokenValue, setLinkTokenValue] = useState<string | null>(null);
  const [isPreparingValue, setIsPreparingValue] = useState(false);
  const [isSyncingValue, setIsSyncingValue] = useState(false);
  const [errorMessageValue, setErrorMessageValue] = useState("");
  const [statusMessageValue, setStatusMessageValue] = useState("");
  const hasFetchedInitialTokenRef = useRef(false);

  const fetchLinkTokenValue = useCallback(async () => {
    setErrorMessageValue("");
    setStatusMessageValue("Preparing Plaid Link...");
    setIsPreparingValue(true);

    try {
      const responseValue = await apiPostValue<CreateLinkTokenResponse>(
        "/api/v1/plaid/create-link-token",
        {},
      );

      if (!responseValue?.linkToken) {
        throw new Error("The server did not return a Plaid link token.");
      }

      setLinkTokenValue(responseValue.linkToken);
      setStatusMessageValue("");
    } catch (errValue) {
      const messageValue =
        errValue instanceof Error
          ? errValue.message
          : "Unable to create a Plaid link token.";

      setErrorMessageValue(messageValue);
      setStatusMessageValue("");
    } finally {
      setIsPreparingValue(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetchedInitialTokenRef.current) return;
    hasFetchedInitialTokenRef.current = true;
    void fetchLinkTokenValue();
  }, [fetchLinkTokenValue]);

  const onSuccessValue = useCallback(
    async (publicTokenValue: string, metadataValue: unknown) => {
      setErrorMessageValue("");
      setStatusMessageValue("Connecting account...");
      setIsSyncingValue(true);

      try {
        const exchangeResponseValue =
          await apiPostValue<ExchangePublicTokenResponse>(
            "/api/v1/plaid/exchange-public-token",
            {
              publicToken: publicTokenValue,
              metadata: metadataValue,
              linkToken: linkTokenValue,
            },
          );

        const itemIdValue = String(exchangeResponseValue?.itemId || "").trim();

        if (!itemIdValue) {
          throw new Error("The server did not return the linked item id.");
        }

        setStatusMessageValue("Syncing accounts...");
        await apiPostValue("/api/v1/plaid/sync-accounts", {
          itemId: itemIdValue,
        });

        setStatusMessageValue("Syncing transactions...");
        await apiPostValue("/api/v1/plaid/sync-transactions", {
          itemId: itemIdValue,
        });

        setStatusMessageValue("Refreshing balances...");
        await apiPostValue("/api/v1/plaid/refresh-balances", {
          itemId: itemIdValue,
        });

        setStatusMessageValue("Bank account linked successfully.");

        if (onLinked) {
          await onLinked();
        }

        setLinkTokenValue(null);
        hasFetchedInitialTokenRef.current = false;
        void fetchLinkTokenValue();
      } catch (errValue) {
        const messageValue =
          errValue instanceof Error
            ? errValue.message
            : "The Plaid connection completed, but syncing failed.";

        setErrorMessageValue(messageValue);
        setStatusMessageValue("");
      } finally {
        setIsSyncingValue(false);
      }
    },
    [fetchLinkTokenValue, linkTokenValue, onLinked],
  );

  const onExitValue = useCallback((errValue: unknown) => {
    if (errValue) {
      const messageValue =
        errValue instanceof Error
          ? errValue.message
          : "Plaid Link was closed before the flow finished.";

      setErrorMessageValue(messageValue);
    }

    setStatusMessageValue("");
  }, []);

  const plaidConfigValue = useMemo(
    () => ({
      token: linkTokenValue,
      onSuccess: onSuccessValue,
      onExit: onExitValue,
    }),
    [linkTokenValue, onExitValue, onSuccessValue],
  );

  const { open, ready } = usePlaidLink(plaidConfigValue);

  const isDisabledValue =
    !linkTokenValue || !ready || isPreparingValue || isSyncingValue;

  return (
    <VStack align="stretch" gap="2">
      <Button
        onClick={() => open()}
        disabled={isDisabledValue}
        loading={isPreparingValue || isSyncingValue}
      >
        {buttonLabel}
      </Button>

      {statusMessageValue ? (
        <Text fontSize="sm" color="gray.500">
          {statusMessageValue}
        </Text>
      ) : null}

      {errorMessageValue ? (
        <Text fontSize="sm" color="red.500">
          {errorMessageValue}
        </Text>
      ) : null}
    </VStack>
  );
}