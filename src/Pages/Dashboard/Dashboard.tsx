/*
  This is the dashboard page the imports that are non standard include:
  Spending pie Chart: A React Component that displays a pie chart of spending by category.
  Spending Line Chart: A React Component that displays a Line/Bar Graph of spending by time.
  The Account toggle handler: handles filtering by spending account.
  A net worth card shared component: shows your net worth as well as your total assests vs liabilities.
  Budget comparison chart: A React Component that displays a Line/Bar Graph of Spending VS Budget.
  Various Types from The shared Type doc.
  Chakra elements.
*/

import { useEffect, useMemo, useState } from "react";
import Layout from "../../Shared/Layout";
import { apiClient } from "../../Shared/apiClient";
import type { DashboardSummary, TransactionRow, TimeFrameKey} from "../../Shared/types";
import SpendingPieChart from "../../Shared/SpendingPieChart";
import SpendingLineChart from "../../Shared/SpendingLineChart";
import AccountsToggle from "../../Shared/AccountsToggle";
import NetWorthCard from "../../Shared/NetWorthCard";
import BudgetComparisonChart from "../../Shared/BudgetComparisonChart";
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  HStack,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
  AbsoluteCenter,
  Center,
} from "@chakra-ui/react";
import { formatDate, negativeCheck, formatMoney, safeText, getAmountToneColor } from "../../Shared/SharedFunctions";

export default function Dashboard() {
  //Default dashboard funciton that exports the page layout itself (the Main())
  //These variables are used for the dashboard summary cards they store the values for the income spending and net growth totals
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);

  //These Variables store recent transaction data for the transaction table at the bottom of the page
  const [recentTransactions, setRecentTransactions] = useState<
    TransactionRow[]
  >([]);

  //Loading variables for page handling and sync handling
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>("");

  //Time frame is how you adjust the time frame the page looks at for transactions
  const [timeFrameValue, setTimeFrameValue] = useState<TimeFrameKey>("mtd");
  const [accountIdValue, setAccountIdValue] = useState<string>("all"); // "all" | "123"

  const timeFrameOptions: Array<{ keyValue: TimeFrameKey; labelValue: string }> =
    [
      { keyValue: "mtd", labelValue: "Month-to-date" },
      { keyValue: "last7", labelValue: "Last 7 days" },
      { keyValue: "last30", labelValue: "Last 30 days" },
      { keyValue: "ytd", labelValue: "Year-to-date" },
      { keyValue: "all", labelValue: "All time" },
    ];

    const timeFrameLabel = useMemo(() => {
      return (
        timeFrameOptions.find((o) => o.keyValue === timeFrameValue)?.labelValue ??
        "Month-to-date"
      );
    }, [timeFrameOptions, timeFrameValue]);

    const cycleTimeFrame = () => {
      setTimeFrameValue((prevValue) => {
        const currentIndex = timeFrameOptions.findIndex(
          (o) => o.keyValue === prevValue,
        );
        const nextIndex =
          currentIndex < 0
            ? 0
            : (currentIndex + 1) % timeFrameOptions.length;
        return timeFrameOptions[nextIndex].keyValue;
      });
    };
  
  //this is how it sets the badge colors for the net growth card
  const netTone = useMemo(() => {
    if (!summaryData) return "Error";
    else if (summaryData.netTotal > 0) return "Positive";
    else if (summaryData.netTotal === 0) return "Neutral";
    else return "Negative";
  }, [summaryData]);

  async function loadDashboardData(): Promise<void> {
    //this function calls the server through the apin client and pull the data that it uses for the different cards on the page
    setIsLoading(true);
    setErrorText("");

    try {
      // Try to call endpoints (can adjust these to reflect the full API once implemented)
      const accountQueryValue =
        accountIdValue && accountIdValue !== "all"
          ? `&accountId=${encodeURIComponent(accountIdValue)}`
          : "";

      const summaryValue = await apiClient.get<DashboardSummary>(
        `/api/v1/dashboard/summary?timeFrame=${encodeURIComponent(timeFrameValue)}${accountQueryValue}`,
      );

      const transactionsValue = await apiClient.get<TransactionRow[]>(
        `/api/v1/dashboard/recent-transactions?limit=8&timeFrame=${encodeURIComponent(
          timeFrameValue,
        )}${accountQueryValue}`,
      );

      setSummaryData(summaryValue);
      setRecentTransactions(transactionsValue);
    } catch (errValue) {
      setErrorText(
        errValue instanceof Error ? errValue.message : "Unknown error",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboardData();
  }, [timeFrameValue, accountIdValue]);

  // These variables pull from our theme and represent color values for consistent stylization
  const pageBg = "brand.100";
  const cardBg = "brand.50";
  const cardBorder = "blackAlpha.100";
  const subtleText = "brand.700";
  const strongText = "brand.900";


  //pulls from net tone value to set the color
  const netBadgeColor = useMemo(() => {
    if (netTone === "Positive") return { bg: "accent.500", color: "brand.900" };
    else if (netTone === "Neutral") return { bg: "brand.100", color: "brand.700" };
    else if (netTone === "Negative") return { bg: "negatives.400", color: "white" };
    else return { bg: "blackAlpha.100", color: "brand.700" };
  }, [netTone]);

  //This is the toggle button that is sued to switch the time frame on the page
  const timeFrameButton = (
    <Button
      size="xs"
      variant="outline"
      borderRadius="999px"
      borderColor="blackAlpha.200"
      bg="brand.100"
      color="brand.700"
      _hover={{ bg: "brand.200" }}
      onClick={cycleTimeFrame}
    >
      {timeFrameLabel}
    </Button>
  );

  return (
    <Layout activePage="dashboard">
      <Box bg={pageBg} minH="calc(100vh - 1px)">
        <Container maxW="6xl" py={{ base: 6, md: 10 }}>
          {/*Page Header*/}
          <Stack gap={2} mb={6}>
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <Heading size="lg" color={strongText}>
                Dashboard
              </Heading>

              <HStack gap={3} flexWrap="wrap" justify="flex-end">
                <AccountsToggle
                  selectedAccountIdValue={accountIdValue}
                  onChangeAccountIdValue={setAccountIdValue}
                />

                <Text color={subtleText}>
                  Time-Frame Toggle:<span> </span>{timeFrameButton}
                </Text>
              </HStack>
            </HStack>

            
            <Text color={subtleText}>
              {summaryData
                ? `Data from ${timeFrameLabel} as of ${summaryData.dataAsOf}`
                : "Loading overview…"}
            </Text>
          </Stack>

          {/*Did the page load? ifTrue:ifFalse*/}
          {errorText ? (
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="16px"
              p={4}
              mb={5}
            >
              <Text fontWeight={900} color={strongText} mb={1}>
                Dashboard failed to load
              </Text>
              <Text color={subtleText}>{errorText}</Text>

              <Button
                mt={3}
                bg="brand.500"
                color="white"
                _hover={{ bg: "brand.600" }}
                onClick={() => void loadDashboardData()}
              >
                Retry
              </Button>
            </Box>
          ) : null}

          {/*this holds the summary cards (income, spending, net)*/}
          <Grid templateColumns={{ base: "1fr", md: "repeat(4, 1fr)" }} gap={4}>
            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="18px"
              p={5}
            >
              <Text fontSize="sm" fontWeight={900} color="accent.400">
                Income
              </Text>
              <Text fontSize="2xl" fontWeight={900} color={strongText} mt={1}>
                {summaryData ? formatMoney(summaryData.incomeTotal) : "—"}
              </Text>

              <Box mt={2}>{timeFrameButton}</Box>
            </Box>

            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="18px"
              p={5}
            >
              <Text fontSize="sm" fontWeight={800} color="negatives.400">
                Spending
              </Text>
              <Text fontSize="2xl" fontWeight={900} color={strongText} mt={1}>
                {summaryData ? formatMoney(summaryData.spendingTotal) : "—"}
              </Text>
              
              <Box mt={2}>{timeFrameButton}</Box>
            </Box>

            <Box
              bg={cardBg}
              borderWidth="1px"
              borderColor={cardBorder}
              borderRadius="18px"
              p={5}
            >
              <HStack justify="space-between" align="start">
                <Box>
                  <Text fontSize="sm" fontWeight={800} color="brand.400">
                    Net Growth
                  </Text>
                  <Text
                    fontSize="2xl"
                    fontWeight={900}
                    color={strongText}
                    mt={1}
                  >
                    {summaryData ? formatMoney(summaryData.netTotal) : "—"}
                  </Text>
                </Box>

                <Badge
                  borderRadius="999px"
                  px={3}
                  py={1}
                  bg={netBadgeColor.bg}
                  color={netBadgeColor.color}
                >
                  {netTone}
                </Badge>
              </HStack>

              <Box mt={2}>{timeFrameButton}</Box>
            </Box>

            <NetWorthCard />

            {/*Budget comparison card*/}
           
          </Grid>
          
          <Box h="1px" w="100%" bg="blackAlpha.100" my={6} />
          
          <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="18px"
            p={{ base: 4, md: 5 }}
            mb={6}
            w="100%"
          >
            <BudgetComparisonChart />
          </Box>
          <Box h="1px" w="100%" bg="blackAlpha.100" my={6} />

          {/*Pie chart that shows spending based on categories*/}
          <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="18px"
            p={{ base: 4, md: 5 }}
            mb={6}
            w="100%"
          >
            <HStack justify="space-between" mb={1}>
              <Heading size="sm" color={strongText}>
                Spending by Category
              </Heading>
              
              {timeFrameButton}
            </HStack>

            <Center>
              <SpendingPieChart timeFrame={timeFrameValue} accountIdValue={accountIdValue} />
            </Center>
          </Box>

          {/*Line/Bar Graph that shows the spending based on time*/}
          <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="18px"
            p={{ base: 4, md: 5 }}
            mb={6}
            w="100%"
          >
            <Center>
              <SpendingLineChart timeFrameValue={timeFrameValue} accountIdValue={accountIdValue} />
            </Center>
          </Box>

          {/*Transaction table that shows the most recent transactions within the time frame set*/}
          <HStack justify="space-between" align="baseline" mb={3}>
            <Heading size="sm" color={strongText}>
              Recent transactions
            </Heading>

            {/*link to full transactions page*/}
            <Link
              href="/Transactions.html"
              color="brand.600"
              fontWeight={800}
              _hover={{ textDecoration: "none" }}
            >
              View all →
            </Link>
          </HStack>
          <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={cardBorder}
            borderRadius="18px"
            overflow="hidden"
          >
            {isLoading ? (
              <HStack p={5} gap={3}>
                <Spinner />
                <Text color={subtleText}>Loading transactions…</Text>
              </HStack>
            ) : (
              <Box overflowX="auto" p="20px" >
                <Box as="table" w="100%">
                  {/*table header and column labels*/}
                  <Box as="thead"  w='100%' bg="brand.200">
                    <Box as="tr">
                      <Box width='25%' as="th" className="headerBox">
                        Vender Name
                      </Box>
                      <Box as="th" className="headerBox">
                        Date
                      </Box>
                      <Box as="th" className="headerBox">
                        Category
                      </Box>
                      <Box as="th" className="headerBox">
                        Amount
                      </Box>
                    </Box>
                  </Box>

                  {/*Table body with data pulled earlier*/}
                  <Box as="tbody" bg="brand.50">
                    {recentTransactions.map((row) => (
                      <Box
                        as="tr"
                        key={row.transactionId}
                        color={subtleText}
                        _hover={{ bg: "blackAlpha.50" }}
                      >
                        <Box textAlign="left" as="td" py={2}>
                          {safeText(row.name)}
                        </Box>
                        <Box textAlign="center" as="td" py={2}> 
                          {formatDate(row.date)}
                        </Box>
                        <Box textAlign="center" as="td" py={2}>
                          <Badge bg="brand.100" color="brand.700">
                            {safeText(row.category)}
                          </Badge>
                        </Box>
                        <Box textAlign="center" as="td" py={2} color={negativeCheck(row.amount * -1)} fontWeight={800}>
                          {formatMoney(row.amount * -1)}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </Container>
      </Box>
    </Layout>
  );
}
