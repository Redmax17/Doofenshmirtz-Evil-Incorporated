/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Container, Grid, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Layout from "../../Shared/Layout";
import AccountsToggle from "../../Shared/AccountsToggle";
import PageHeader from "../../Shared/PageHeader";
import StatCard from "../../Shared/StatCard";
import TransactionsTable from "../../Shared/TransactionsTable";
import { apiClient } from "../../Shared/apiClient";
import { formatMoney } from "../../Shared/SharedFunctions";
import type { DashboardSummary, TimeFrameKey, TransactionRow } from "../../Shared/types";

export default function Transactions() {
  const [summaryDataValue, setSummaryDataValue] = useState<DashboardSummary | null>(null);
  const [transactionsValue, setTransactionsValue] = useState<TransactionRow[]>([]);
  const [timeFrameValue, setTimeFrameValue] = useState<TimeFrameKey>("last30");
  const [accountIdValue, setAccountIdValue] = useState<string>("all");
  const [isLoadingValue, setIsLoadingValue] = useState<boolean>(true);
  const [errorTextValue, setErrorTextValue] = useState<string>("");

  const timeFrameOptionsValue: Array<{ keyValue: TimeFrameKey; labelValue: string }> = [
    { keyValue: "mtd", labelValue: "Month-to-date" },
    { keyValue: "last7", labelValue: "Last 7 days" },
    { keyValue: "last30", labelValue: "Last 30 days" },
    { keyValue: "ytd", labelValue: "Year-to-date" },
    { keyValue: "all", labelValue: "All time" },
  ];

  const timeFrameLabelValue = useMemo(() => {
    return timeFrameOptionsValue.find((optionValue) => optionValue.keyValue === timeFrameValue)?.labelValue ?? "Last 30 days";
  }, [timeFrameOptionsValue, timeFrameValue]);

  async function loadTransactionsPageDataValue(): Promise<void> {
    setIsLoadingValue(true);
    setErrorTextValue("");

    try {
      const accountQueryValue = accountIdValue !== "all" ? `&accountId=${encodeURIComponent(accountIdValue)}` : "";

      const [summaryResponseValue, transactionsResponseValue] = await Promise.all([
        apiClient.get<DashboardSummary>(`/api/v1/dashboard/summary?timeFrame=${encodeURIComponent(timeFrameValue)}${accountQueryValue}`),
        apiClient.get<TransactionRow[]>(`/api/v1/dashboard/recent-transactions?limit=100&timeFrame=${encodeURIComponent(timeFrameValue)}${accountQueryValue}`),
      ]);

      setSummaryDataValue(summaryResponseValue);
      setTransactionsValue(transactionsResponseValue ?? []);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load transactions.");
    } finally {
      setIsLoadingValue(false);
    }
  }

  useEffect(() => {
    void loadTransactionsPageDataValue();
  }, [timeFrameValue, accountIdValue]);

  return (
    <Layout activePage="transactions">
      <Box bg="brand.100" minH="calc(100vh - 1px)">
        <Container maxW="6xl" py={{ base: 6, md: 10 }}>
          <PageHeader
            titleValue="Transactions"
            subtitleValue="Review recent spending and income using the same backend transaction feed already powering the dashboard."
            rightContentValue={
              <>
                <AccountsToggle selectedAccountIdValue={accountIdValue} onChangeAccountIdValue={setAccountIdValue} />
                <Button size="sm" bg="brand.500" color="white" _hover={{ bg: "brand.600" }} onClick={() => void loadTransactionsPageDataValue()}>
                  Reload
                </Button>
              </>
            }
          />

          <HStack gap={2} flexWrap="wrap" mb={6}>
            {timeFrameOptionsValue.map((optionValue) => (
              <Button
                key={optionValue.keyValue}
                size="sm"
                borderRadius="999px"
                variant={timeFrameValue === optionValue.keyValue ? "solid" : "outline"}
                bg={timeFrameValue === optionValue.keyValue ? "brand.500" : "brand.50"}
                color={timeFrameValue === optionValue.keyValue ? "white" : "brand.700"}
                borderColor="blackAlpha.200"
                _hover={{ bg: timeFrameValue === optionValue.keyValue ? "brand.600" : "brand.200" }}
                onClick={() => setTimeFrameValue(optionValue.keyValue)}
              >
                {optionValue.labelValue}
              </Button>
            ))}
          </HStack>

          {errorTextValue ? (
            <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={4} mb={5}>
              <Text fontWeight={900} color="brand.900">Transactions failed to load</Text>
              <Text color="brand.700">{errorTextValue}</Text>
            </Box>
          ) : null}

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={6}>
            <StatCard
              labelValue="Income"
              valueValue={summaryDataValue ? formatMoney(summaryDataValue.incomeTotal) : "—"}
              toneColorValue="accent.400"
              helperValue={timeFrameLabelValue}
            />
            <StatCard
              labelValue="Spending"
              valueValue={summaryDataValue ? formatMoney(summaryDataValue.spendingTotal) : "—"}
              toneColorValue="negatives.400"
              helperValue={timeFrameLabelValue}
            />
            <StatCard
              labelValue="Transactions Loaded"
              valueValue={String(transactionsValue.length)}
              toneColorValue="brand.600"
              helperValue="Uses the existing recent-transactions route with a larger limit."
            />
          </Grid>

          <Stack gap={4}>
            <HStack justify="space-between" align="center">
              <Text fontWeight={900} color="brand.900">Recent transactions</Text>
              {isLoadingValue ? (
                <HStack gap={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="brand.700">Loading {timeFrameLabelValue.toLowerCase()}…</Text>
                </HStack>
              ) : null}
            </HStack>

            <TransactionsTable
              rowsValue={transactionsValue}
              emptyTextValue="No transactions were returned for the selected account and timeframe."
            />
          </Stack>
        </Container>
      </Box>
    </Layout>
  );
}
