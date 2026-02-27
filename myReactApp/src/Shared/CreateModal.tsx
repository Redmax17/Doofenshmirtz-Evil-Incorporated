import { useMemo, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Input,
  NativeSelect,
  Stack,
  Text,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import type {
  BudgetCategoryOption,
  BudgetCreateInput,
  BudgetCreateItemInput,
  BudgetPeriodKey,
} from "./types";
import { formatMoney } from "./SharedFunctions";

type BudgetCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;

  categoryOptions: BudgetCategoryOption[];
  onCreateBudget: (payloadValue: BudgetCreateInput) => Promise<void>;
};

type RowDraft = {
  rowId: string;
  categoryId: number | null;
  amountText: string;
};

/**
 * Creates a unique row id for category rows.
 * - Inputs: none
 * - Output: string
 * - Purpose: stable React keys + easy row removal
 */
function makeRowId(): string {
  return `row_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export default function BudgetCreateModal(props: BudgetCreateModalProps) {
  const { isOpen, onClose, categoryOptions, onCreateBudget } = props;

  // Stores the new budget name
  const [budgetNameValue, setBudgetNameValue] = useState<string>("");

  // Stores the timeframe for this budget
  const [periodValue, setPeriodValue] = useState<BudgetPeriodKey>("monthly");

  // Optional income value as text (lets you add % of income UI later)
  const [incomeTextValue, setIncomeTextValue] = useState<string>("");

  // Stores the editable category rows (dropdown + amount)
  const [rowsValue, setRowsValue] = useState<RowDraft[]>([
    { rowId: makeRowId(), categoryId: null, amountText: "" },
  ]);

  // Displays validation / server errors
  const [errorTextValue, setErrorTextValue] = useState<string>("");

  // Guard for save button
  const [isSavingValue, setIsSavingValue] = useState<boolean>(false);

  // Parsed income number (optional)
  const parsedIncomeValue = useMemo(() => {
    const cleanedValue = incomeTextValue.trim();
    if (!cleanedValue) return undefined;

    const parsedValue = Number(cleanedValue);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }, [incomeTextValue]);

  // Total budgeted based on row amounts
  const budgetedTotalValue = useMemo(() => {
    return rowsValue.reduce((sumValue, rowValue) => {
      const parsedValue = Number(rowValue.amountText);
      return sumValue + (Number.isFinite(parsedValue) ? parsedValue : 0);
    }, 0);
  }, [rowsValue]);

  /**
   * Adds a blank category row.
   * - Inputs: none
   * - Output: none
   * - Purpose: user can build custom budgets with any number of categories
   */
  function addRow(): void {
    setRowsValue((prevValue) => [
      ...prevValue,
      { rowId: makeRowId(), categoryId: null, amountText: "" },
    ]);
  }

  /**
   * Removes a category row by id.
   * - Inputs: rowIdValue string
   * - Output: none
   * - Purpose: user can delete unwanted category rows
   */
  function removeRow(rowIdValue: string): void {
    setRowsValue((prevValue) => {
      const nextValue = prevValue.filter((r) => r.rowId !== rowIdValue);
      return nextValue.length ? nextValue : prevValue;
    });
  }

  /**
   * Validates inputs, builds payload, and sends to backend.
   * - Inputs: none (reads component state)
   * - Output: Promise<void>
   * - Purpose: insert the budget + items into the DB via API
   */
  async function handleSave(): Promise<void> {
    setErrorTextValue("");

    const trimmedNameValue = budgetNameValue.trim();
    if (!trimmedNameValue) {
      setErrorTextValue("Please name your budget.");
      return;
    }

    const itemsValue: BudgetCreateItemInput[] = [];
    const seenCategoryIdsValue = new Set<number>();

    for (const rowValue of rowsValue) {
      if (rowValue.categoryId == null) continue;

      const amountValue = Number(rowValue.amountText);
      if (!Number.isFinite(amountValue) || amountValue < 0) {
        setErrorTextValue("Each budget amount must be a valid number (0 or higher).");
        return;
      }

      if (seenCategoryIdsValue.has(rowValue.categoryId)) {
        setErrorTextValue("Please don’t duplicate the same category in one budget.");
        return;
      }

      seenCategoryIdsValue.add(rowValue.categoryId);
      itemsValue.push({
        categoryId: rowValue.categoryId,
        amount: Number(amountValue.toFixed(2)),
      });
    }

    if (!itemsValue.length) {
      setErrorTextValue("Add at least one category row before saving.");
      return;
    }

    const payloadValue: BudgetCreateInput = {
      name: trimmedNameValue,
      period: periodValue,
      incomeAmount: parsedIncomeValue,
      items: itemsValue,
    };

    try {
      setIsSavingValue(true);

      await onCreateBudget(payloadValue);

      // Reset form after success
      setBudgetNameValue("");
      setPeriodValue("monthly");
      setIncomeTextValue("");
      setRowsValue([{ rowId: makeRowId(), categoryId: null, amountText: "" }]);

      onClose();
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to save budget.");
    } finally {
      setIsSavingValue(false);
    }
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="xl"
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content borderRadius="18px">
            <Dialog.Header>
              <Text fontWeight={900} fontSize="lg" color="brand.900">
                Create Budget
              </Text>
            </Dialog.Header>

            <Dialog.Body>
              <Stack gap={4}>
                {errorTextValue ? (
                  <Box bg="blackAlpha.100" borderRadius="14px" p={3}>
                    <Text fontWeight={900} color="brand.900">
                      Fix this
                    </Text>
                    <Text color="brand.700">{errorTextValue}</Text>
                  </Box>
                ) : null}

                <HStack gap={3} flexWrap="wrap">
                  <Box flex={1} minW="220px">
                    <Text fontSize="sm" fontWeight={900} color="brand.700" mb={1}>
                      Budget name
                    </Text>
                    <Input
                      value={budgetNameValue}
                      onChange={(e) => setBudgetNameValue(e.target.value)}
                      placeholder="e.g. February Essentials"
                      borderRadius="14px"
                    />
                  </Box>

                  <Box w={{ base: "100%", md: "220px" }}>
                    <Text fontSize="sm" fontWeight={900} color="brand.700" mb={1}>
                      Timeframe
                    </Text>
                    <NativeSelect.Root>
                        <NativeSelect.Field
                            value={periodValue}
                            onChange={(e) => setPeriodValue(e.target.value as BudgetPeriodKey)}
                        >
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </NativeSelect.Field>
                    </NativeSelect.Root>

                  </Box>
                </HStack>

                <Box>
                  <Text fontSize="sm" fontWeight={900} color="brand.700" mb={1}>
                    Income (optional)
                  </Text>
                  <Input
                    value={incomeTextValue}
                    onChange={(e) => setIncomeTextValue(e.target.value)}
                    placeholder="e.g. 3200"
                    borderRadius="14px"
                  />
                  <Text mt={1} fontSize="sm" color="brand.700">
                    Total budgeted right now: <b>{formatMoney(budgetedTotalValue)}</b>
                  </Text>
                </Box>

                <Box>
                  <HStack justify="space-between" align="center" mb={2}>
                    <Text fontWeight={900} color="brand.900">
                      Categories
                    </Text>
                    <Button
                      size="sm"
                      bg="brand.500"
                      color="white"
                      _hover={{ bg: "brand.600" }}
                      borderRadius="999px"
                      onClick={addRow}
                    >
                      Add Row
                    </Button>
                  </HStack>

                  <Stack gap={3}>
                    {rowsValue.map((rowValue) => (
                      <Box
                        key={rowValue.rowId}
                        borderWidth="1px"
                        borderColor="blackAlpha.200"
                        borderRadius="16px"
                        p={3}
                        bg="white"
                      >
                        <HStack gap={3} flexWrap="wrap">
                          <Box flex={1} minW="240px">
                            <Text fontSize="xs" fontWeight={900} color="brand.700" mb={1}>
                              Category
                            </Text>
                            <NativeSelect.Root>
                                <NativeSelect.Field
                                    value={rowValue.categoryId ?? ""}
                                    onChange={(e) => {
                                    const nextIdValue = e.target.value ? Number(e.target.value) : null;

                                    setRowsValue((prevValue) =>
                                        prevValue.map((r) =>
                                        r.rowId === rowValue.rowId
                                            ? { ...r, categoryId: nextIdValue }
                                            : r
                                        )
                                    );
                                    }}
                                >
                                    <option value="">Select…</option>
                                    {categoryOptions.map((c) => (
                                    <option key={c.categoryId} value={c.categoryId}>
                                        {c.displayName}
                                    </option>
                                    ))}
                                </NativeSelect.Field>
                            </NativeSelect.Root>
                          </Box>

                          <Box w={{ base: "100%", md: "200px" }}>
                            <Text fontSize="xs" fontWeight={900} color="brand.700" mb={1}>
                              Budgeted amount
                            </Text>
                            <Input
                              value={rowValue.amountText}
                              onChange={(e) => {
                                const nextTextValue = e.target.value;
                                setRowsValue((prevValue) =>
                                  prevValue.map((r) =>
                                    r.rowId === rowValue.rowId ? { ...r, amountText: nextTextValue } : r,
                                  ),
                                );
                              }}
                              placeholder="0"
                              borderRadius="14px"
                            />
                          </Box>

                          <Button
                            size="sm"
                            variant="outline"
                            borderRadius="999px"
                            borderColor="blackAlpha.300"
                            onClick={() => removeRow(rowValue.rowId)}
                            disabled={rowsValue.length <= 1}
                          >
                            Remove
                          </Button>
                        </HStack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Dialog.Body>

            <Dialog.Footer>
              <HStack gap={3}>
                <Button variant="outline" borderRadius="999px" onClick={onClose}>
                  Cancel
                </Button>

                <Button
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: "brand.600" }}
                  borderRadius="999px"
                  onClick={() => void handleSave()}
                  loading={isSavingValue}
                >
                  Save Budget
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
