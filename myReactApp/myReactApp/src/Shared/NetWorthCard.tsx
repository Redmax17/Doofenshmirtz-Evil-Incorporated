import { useEffect, useMemo, useState } from "react";
import { apiClient } from "./apiClient";
import { Box, HStack, Input, Spinner, Stack, Text } from "@chakra-ui/react";
import { formatMoney, parseMoneyInput } from "./SharedFunctions";
import {NetWorthResponse} from "./types"

export default function NetWorthCard({ accountIdValue = "all" }: { accountIdValue?: string }) {
  const [dataValue, setDataValue] = useState<NetWorthResponse | null>(null);
  const [isLoadingValue, setIsLoadingValue] = useState<boolean>(true);
  const [errorTextValue, setErrorTextValue] = useState<string>("");

  // optional manual adjustments (keeps it a "calculator")
  const [manualAssetsValueText, setManualAssetsValueText] = useState<string>("");
  const [manualLiabilitiesValueText, setManualLiabilitiesValueText] = useState<string>("");

  useEffect(() => {
    let isMountedValue = true;

    async function loadNetWorthValue() {
      setIsLoadingValue(true);
      setErrorTextValue("");

      try {

        const resValue = await apiClient.get<NetWorthResponse>(
          `/api/v1/dashboard/net-worth`,
        );

        if (!isMountedValue) return;
        setDataValue(resValue);
      } catch (errValue) {
        if (!isMountedValue) return;
        setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load net worth");
      } finally {
        if (!isMountedValue) return;
        setIsLoadingValue(false);
      }
    }

    void loadNetWorthValue();

    return () => {
      isMountedValue = false;
    };
  }, [accountIdValue]);

  const manualAssetsValue = useMemo(
    () => parseMoneyInput(manualAssetsValueText),
    [manualAssetsValueText],
  );
  const manualLiabilitiesValue = useMemo(
    () => parseMoneyInput(manualLiabilitiesValueText),
    [manualLiabilitiesValueText],
  );

  const computedTotalsValue = useMemo(() => {
    const assetsBaseValue = Number(dataValue?.assetsTotal ?? 0);
    const liabilitiesBaseValue = Number(dataValue?.liabilitiesTotal ?? 0);

    const assetsFinalValue = assetsBaseValue + manualAssetsValue;
    const liabilitiesFinalValue = liabilitiesBaseValue + manualLiabilitiesValue;
    const netWorthFinalValue = assetsFinalValue - liabilitiesFinalValue;

    return {
      assetsBaseValue,
      liabilitiesBaseValue,
      assetsFinalValue,
      liabilitiesFinalValue,
      netWorthFinalValue,
    };
  }, [dataValue, manualAssetsValue, manualLiabilitiesValue]);

  //style variables
  const pageBg = "brand.100";
  const cardBg = "brand.50";
  const cardBorder = "blackAlpha.100";
  const subtleText = "brand.700";
  const strongText = "brand.900";

  const netColorValue =
    computedTotalsValue.netWorthFinalValue > 0
      ? "accent.400"
      : computedTotalsValue.netWorthFinalValue < 0
        ? "negatives.400"
        : "brand.700";

  return (
    <Box
      bg={cardBg}
      borderWidth="1px"
      borderColor={cardBorder}
      borderRadius="18px"
      p={5}
    >
      <HStack justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" fontWeight={900} color="brand.900">
          Net Worth
        </Text>

        {isLoadingValue ? (
          <HStack gap={2}>
            <Spinner size="sm" />
            <Text fontSize="xs" color="brand.700" fontWeight={800}>
              Loading…
            </Text>
          </HStack>
        ) : null}
      </HStack>

      {errorTextValue ? (
        <Text fontSize="xs" color="negatives.400" fontWeight={800}>
          {errorTextValue}
        </Text>
      ) : null}

      {dataValue?.warning ? (
        <Text fontSize="xs" color="brand.700" fontWeight={800}>
          {dataValue.warning}
        </Text>
      ) : null}

      <Stack gap={3} mt={2}>
        <HStack justify="space-between">
          <Text fontSize="sm" color="accent.400" fontWeight={800}>
            Assets
          </Text>
          <Text fontSize="sm" color="accent.400" fontWeight={900}>
            {formatMoney(computedTotalsValue.assetsFinalValue)}
          </Text>
        </HStack>

        <HStack justify="space-between">
          <Text fontSize="sm" color="negatives.400" fontWeight={800}>
            Liabilities
          </Text>
          <Text fontSize="sm" color="negatives.400" fontWeight={900}>
            {formatMoney(computedTotalsValue.liabilitiesFinalValue)}
          </Text>
        </HStack>

        <Box h="1px" bg="blackAlpha.200" />

        <HStack justify="center" align="center">
          <Text fontSize="sm" color="brand.700" fontWeight={900}>
            Total Net Worth:
          </Text>
        </HStack>
        <HStack justify="center" align="center">
          <Text fontSize="2xl" fontWeight={900} color={netColorValue}>
              {formatMoney(computedTotalsValue.netWorthFinalValue)}
          </Text>
        </HStack>
      </Stack>
    </Box>
  );
}
