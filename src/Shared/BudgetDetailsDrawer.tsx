import {
  Badge,
  Box,
  Button,
  Grid,
  HStack,
  Stack,
  Text,
  Drawer,
  Portal,
} from "@chakra-ui/react";
import type {
  BudgetCategoryStatus,
  BudgetDetailResponse,
  BudgetHistoryResponse,
} from "./types";
import { calcPercentUsed, formatMoney } from "./SharedFunctions";

type BudgetDetailsDrawerProps = {
  isOpen: boolean;
  onClose: () => void;

  detailData: BudgetDetailResponse | null;
  historyData: BudgetHistoryResponse | null;

  onRefresh: () => void;
};

function toneForCategory(rowValue: BudgetCategoryStatus): { bg: string; color: string } {
  if (rowValue.budgetedAmount <= 0 && rowValue.spentAmount > 0) {
    return { bg: "blackAlpha.200", color: "brand.900" };
  }
  if (rowValue.isOver) {
    return { bg: "negatives.400", color: "white" };
  }
  return { bg: "accent.500", color: "brand.900" };
}

export default function BudgetDetailsDrawer(props: BudgetDetailsDrawerProps) {
  // Drawer state + data passed down from Budgets page
  const { isOpen, onClose, detailData, historyData, onRefresh } = props;

  const percentUsedValue = detailData
    ? calcPercentUsed(detailData.totals.spentTotal, detailData.totals.budgetedTotal)
    : 0;

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="xl"
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header borderBottomWidth="1px">
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontWeight={900} color="brand.900">
                    {detailData ? detailData.name : "Budget"}
                  </Text>
                  {detailData ? (
                    <Text fontSize="sm" color="brand.700">
                      {detailData.window.label} • {detailData.window.start} → {detailData.window.end}
                    </Text>
                  ) : (
                    <Text fontSize="sm" color="brand.700">
                      Loading…
                    </Text>
                  )}
                </Box>

                <HStack gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    borderRadius="999px"
                    borderColor="blackAlpha.300"
                    onClick={onRefresh}
                  >
                    Refresh
                  </Button>

                  <Button size="sm" borderRadius="999px" onClick={onClose}>
                    Close
                  </Button>
                </HStack>
              </HStack>
            </Drawer.Header>

            <Drawer.Body>
              {!detailData ? (
                <Text color="brand.700" mt={4}>
                  Loading budget details…
                </Text>
              ) : (
                <Stack gap={5} py={4}>
                  {/* Summary */}
                  <Box
                    borderWidth="1px"
                    borderColor="blackAlpha.200"
                    borderRadius="18px"
                    p={4}
                    bg="white"
                  >
                    <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                      <Box>
                        <Text fontSize="sm" fontWeight={900} color="brand.700">
                          Budget progress
                        </Text>
                        <Text fontSize="2xl" fontWeight={900} color="brand.900">
                          {formatMoney(detailData.totals.spentTotal)} /{" "}
                          {formatMoney(detailData.totals.budgetedTotal)}
                        </Text>
                        <Text fontSize="sm" color="brand.700">
                          Remaining: <b>{formatMoney(detailData.totals.remainingTotal)}</b>
                        </Text>
                      </Box>

                      <Badge
                        borderRadius="999px"
                        px={3}
                        py={2}
                        bg={
                          detailData.totals.budgetedTotal > 0 &&
                          detailData.totals.spentTotal > detailData.totals.budgetedTotal
                            ? "negatives.400"
                            : "accent.500"
                        }
                        color={
                          detailData.totals.budgetedTotal > 0 &&
                          detailData.totals.spentTotal > detailData.totals.budgetedTotal
                            ? "white"
                            : "brand.900"
                        }
                        fontWeight={900}
                      >
                        {percentUsedValue.toFixed(2)}% used
                      </Badge>
                    </HStack>
                  </Box>

                  {/* History */}
                  <Box
                    borderWidth="1px"
                    borderColor="blackAlpha.200"
                    borderRadius="18px"
                    p={4}
                    bg="white"
                  >
                    <Text fontWeight={900} color="brand.900" mb={2}>
                      Last budgets (history)
                    </Text>

                    {!historyData?.points?.length ? (
                      <Text color="brand.700">No history yet (or budget is brand new).</Text>
                    ) : (
                      <Stack gap={2}>
                        {historyData.points.map((p) => (
                          <HStack
                            key={`${p.windowStart}_${p.windowEnd}`}
                            justify="space-between"
                            borderWidth="1px"
                            borderColor="blackAlpha.100"
                            borderRadius="14px"
                            p={3}
                          >
                            <Box>
                              <Text fontWeight={900} color="brand.900">
                                {p.label}
                              </Text>
                              <Text fontSize="sm" color="brand.700">
                                {p.windowStart} → {p.windowEnd}
                              </Text>
                            </Box>

                            <Box textAlign="right">
                              <Text fontWeight={900} color="brand.900">
                                {formatMoney(p.spentTotal)} / {formatMoney(p.budgetedTotal)}
                              </Text>
                              <Text fontSize="sm" color="brand.700">
                                {p.percentUsed.toFixed(2)}% used
                              </Text>
                            </Box>
                          </HStack>
                        ))}
                      </Stack>
                    )}
                  </Box>

                  {/* Categories + transactions */}
                  <Box
                    borderWidth="1px"
                    borderColor="blackAlpha.200"
                    borderRadius="18px"
                    p={4}
                    bg="white"
                  >
                    <Text fontWeight={900} color="brand.900" mb={2}>
                      Current timeframe categories
                    </Text>

                    <Stack gap={2}>
                      {detailData.categories.map((row) => {
                        const toneValue = toneForCategory(row);

                        return (
                          <Box
                            key={`${row.categoryId}_${row.plaidPrimaryCategory}`}
                            borderWidth="1px"
                            borderColor="blackAlpha.100"
                            borderRadius="14px"
                            p={3}
                          >
                            <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
                              <Box>
                                <Text fontWeight={900} color="brand.900">
                                  {row.categoryName}
                                </Text>
                                <Text fontSize="sm" color="brand.700">
                                  Budgeted {formatMoney(row.budgetedAmount)} • Spent{" "}
                                  {formatMoney(row.spentAmount)}
                                </Text>
                              </Box>

                              <Badge
                                borderRadius="999px"
                                px={3}
                                py={1}
                                bg={toneValue.bg}
                                color={toneValue.color}
                                fontWeight={900}
                              >
                                {row.isOver ? "Over" : "OK"} • {formatMoney(row.remainingAmount)}
                              </Badge>
                            </HStack>

                            {detailData.transactionsByCategory[row.plaidPrimaryCategory]?.length ? (
                              <Box mt={3} bg="blackAlpha.50" borderRadius="12px" p={3}>
                                <Text fontWeight={900} color="brand.900" mb={2}>
                                  Transactions
                                </Text>

                                <Stack gap={2}>
                                  {detailData.transactionsByCategory[row.plaidPrimaryCategory].map((t) => (
                                    <HStack key={t.transactionId} justify="space-between" gap={3}>
                                      <Box>
                                        <Text fontWeight={800} color="brand.900">
                                          {t.name}
                                        </Text>
                                        <Text fontSize="sm" color="brand.700">
                                          {t.date}
                                        </Text>
                                      </Box>

                                      <Text fontWeight={900} color="brand.900">
                                        {formatMoney(t.amount)}
                                      </Text>
                                    </HStack>
                                  ))}
                                </Stack>
                              </Box>
                            ) : (
                              <Text mt={2} fontSize="sm" color="brand.700">
                                No transactions in this category yet.
                              </Text>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>

                  {/* Over budget list */}
                  {detailData.overCategories.length ? (
                    <Box
                      borderWidth="1px"
                      borderColor="blackAlpha.200"
                      borderRadius="18px"
                      p={4}
                      bg="white"
                    >
                      <Text fontWeight={900} color="brand.900" mb={2}>
                        Over budget right now
                      </Text>

                      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={3}>
                        {detailData.overCategories.map((c) => (
                          <Box
                            key={`${c.categoryId}_${c.plaidPrimaryCategory}`}
                            borderWidth="1px"
                            borderColor="blackAlpha.100"
                            borderRadius="14px"
                            p={3}
                          >
                            <Text fontWeight={900} color="brand.900">
                              {c.categoryName}
                            </Text>
                            <Text color="brand.700" fontSize="sm">
                              Spent {formatMoney(c.spentAmount)} of {formatMoney(c.budgetedAmount)}
                            </Text>

                            <Badge
                              mt={2}
                              bg="negatives.400"
                              color="white"
                              borderRadius="999px"
                              px={3}
                              py={1}
                              fontWeight={900}
                            >
                              Over by {formatMoney(Math.abs(c.remainingAmount))}
                            </Badge>
                          </Box>
                        ))}
                      </Grid>
                    </Box>
                  ) : null}
                </Stack>
              )}
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
}
