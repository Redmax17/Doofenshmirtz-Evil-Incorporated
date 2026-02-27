import { useEffect, useMemo, useState } from "react";
import { apiClient } from "./apiClient";
import {
  HStack,
  Spinner,
  Text,
  NativeSelectRoot,
  NativeSelectField,
} from "@chakra-ui/react";

type AccountOption = {
  accountId: number;
  name: string;
  mask?: string | null;
  type?: string | null;
  subtype?: string | null;
};

type AccountsToggleProps = {
  selectedAccountIdValue: string; // "all" | "123"
  onChangeAccountIdValue: (nextValue: string) => void;
};

export default function AccountsToggle({
  selectedAccountIdValue,
  onChangeAccountIdValue,
}: AccountsToggleProps) {
  const [accountsValue, setAccountsValue] = useState<AccountOption[]>([]);
  const [isLoadingValue, setIsLoadingValue] = useState<boolean>(true);
  const [errorTextValue, setErrorTextValue] = useState<string>("");

  useEffect(() => {
    let isMountedValue = true;

    async function loadAccountsValue() {
      setIsLoadingValue(true);
      setErrorTextValue("");

      try {
        const rowsValue = await apiClient.get<AccountOption[]>(
          "/api/v1/accounts",
        );

        if (!isMountedValue) return;
        setAccountsValue(rowsValue ?? []);
      } catch (errValue) {
        if (!isMountedValue) return;
        setErrorTextValue(
          errValue instanceof Error ? errValue.message : "Failed to load accounts",
        );
      } finally {
        if (!isMountedValue) return;
        setIsLoadingValue(false);
      }
    }

    void loadAccountsValue();

    return () => {
      isMountedValue = false;
    };
  }, []);

  const optionsValue = useMemo(() => {
    const baseValue = [{ accountId: -1, name: "All Accounts" }];

    const mappedValue = accountsValue.map((a) => {
      const maskSuffixValue = a.mask ? ` ••••${a.mask}` : "";
      return {
        ...a,
        name: `${a.name}${maskSuffixValue}`,
      };
    });

    return baseValue.concat(mappedValue);
  }, [accountsValue]);

  return (
    <HStack gap={2} align="center">
      <Text fontSize="sm" fontWeight={800} color="brand.700">
        Account:
      </Text>

      {isLoadingValue ? (
        <HStack gap={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="brand.700">
            Loading…
          </Text>
        </HStack>
      ) : (
       <NativeSelectRoot size="sm" maxW="260px">
        <NativeSelectField
          value={selectedAccountIdValue}
          onChange={(e) => onChangeAccountIdValue(String(e.target.value))}
        >
          {optionsValue.map((optValue) => {
            const valueValue =
              optValue.accountId === -1 ? "all" : String(optValue.accountId);

            return (
              <option key={valueValue} value={valueValue}>
                {optValue.name}
              </option>
            );
          })}
          </NativeSelectField>
        </NativeSelectRoot>


      )}

      {errorTextValue ? (
        <Text fontSize="xs" color="negatives.400" fontWeight={800}>
          {errorTextValue}
        </Text>
      ) : null}
    </HStack>
  );
}
