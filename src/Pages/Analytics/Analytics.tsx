/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Container, Grid, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import Layout from "../../Shared/Layout";
import AccountsToggle from "../../Shared/AccountsToggle";
import BudgetComparisonChart from "../../Shared/BudgetComparisonChart";
import NetWorthCard from "../../Shared/NetWorthCard";
import PageHeader from "../../Shared/PageHeader";
import SpendingLineChart from "../../Shared/SpendingLineChart";
import SpendingPieChart from "../../Shared/SpendingPieChart";
import StatCard from "../../Shared/StatCard";
import { apiClient } from "../../Shared/apiClient";
import { formatMoney } from "../../Shared/SharedFunctions";
import type { DashboardSummary, TimeFrameKey } from "../../Shared/types";

export default function Analytics() {
  const [summaryDataValue, setSummaryDataValue] = useState<DashboardSummary | null>(null);
  const [timeFrameValue, setTimeFrameValue] = useState<TimeFrameKey>("mtd");
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
    return timeFrameOptionsValue.find((optionValue) => optionValue.keyValue === timeFrameValue)?.labelValue ?? "Month-to-date";
  }, [timeFrameOptionsValue, timeFrameValue]);

  async function loadAnalyticsSummaryValue(): Promise<void> {
    setIsLoadingValue(true);
    setErrorTextValue("");

    try {
      const accountQueryValue = accountIdValue !== "all" ? `&accountId=${encodeURIComponent(accountIdValue)}` : "";
      const summaryResponseValue = await apiClient.get<DashboardSummary>(
        `/api/v1/dashboard/summary?timeFrame=${encodeURIComponent(timeFrameValue)}${accountQueryValue}`,
      );
      setSummaryDataValue(summaryResponseValue);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load analytics summary.");
    } finally {
      setIsLoadingValue(false);
    }
  }

  useEffect(() => {
    void loadAnalyticsSummaryValue();
  }, [timeFrameValue, accountIdValue]);

  return (
    <Layout activePage="analytics">
      <Box bg="brand.100" minH="calc(100vh - 1px)">
        <Container maxW="6xl" py={{ base: 6, md: 10 }}>
          <PageHeader
            titleValue="Analytics"
            subtitleValue="Visualize spending trends, category mix, budget performance, and net worth using the same routes already present in the dev API."
            rightContentValue={
              <>
                <AccountsToggle selectedAccountIdValue={accountIdValue} onChangeAccountIdValue={setAccountIdValue} />
                <Button size="sm" bg="brand.500" color="white" _hover={{ bg: "brand.600" }} onClick={() => void loadAnalyticsSummaryValue()}>
                  Refresh analytics
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
              <Text fontWeight={900} color="brand.900">Analytics failed to load</Text>
              <Text color="brand.700">{errorTextValue}</Text>
            </Box>
          ) : null}

          <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={6}>
            <StatCard labelValue="Income" valueValue={summaryDataValue ? formatMoney(summaryDataValue.incomeTotal) : "—"} toneColorValue="accent.400" helperValue={timeFrameLabelValue} />
            <StatCard labelValue="Spending" valueValue={summaryDataValue ? formatMoney(summaryDataValue.spendingTotal) : "—"} toneColorValue="negatives.400" helperValue={timeFrameLabelValue} />
            <StatCard labelValue="Net" valueValue={summaryDataValue ? formatMoney(summaryDataValue.netTotal) : "—"} toneColorValue="brand.600" helperValue={summaryDataValue?.dataAsOf ? `As of ${summaryDataValue.dataAsOf}` : "Loading summary…"} />
          </Grid>

          <Grid templateColumns={{ base: "1fr", xl: "1.2fr 0.8fr" }} gap={2} mb={6}>
            <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5} minH="380px">
              <HStack justify="space-between" mb={4}>
                <Text fontWeight={900} color="brand.900">Spending over time</Text>
                {isLoadingValue ? <Spinner size="sm" /> : null}
              </HStack>
              <SpendingLineChart titleValue="Spending vs income" timeFrameValue={timeFrameValue} accountIdValue={accountIdValue} />
            </Box>

            <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5} maxH="500px" width="100%" >
              <Text fontWeight={900} color="brand.900" mb={4}>Spending by category</Text>
              <SpendingPieChart timeFrame={timeFrameValue} accountIdValue={accountIdValue} />
            </Box>
          </Grid>

          <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
            <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5}>
              <Text fontWeight={900} color="brand.900" mb={4}>Budget comparison</Text>
              <BudgetComparisonChart />
            </Box>

            <NetWorthCard accountIdValue={accountIdValue} />
          </Grid>
        </Container>
      </Box>
    </Layout>
  );
}
