import { useEffect, useMemo, useState } from "react";
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
  BudgetCreateItemInput,
  BudgetPeriodKey,
} from "./types";
import { formatMoney } from "./SharedFunctions";

type BudgetEditModalProps = {
  isOpen: boolean;
  onClose: () => void;

  categoryOptions: BudgetCategoryOption[];

  // Prefill values
  initialName: string;
  initialPeriod: BudgetPeriodKey;
  initialIsActive: 0 | 1;
  initialItems: BudgetCreateItemInput[];

  onSave: (payloadValue: {
    name: string;
    period: BudgetPeriodKey;
    isActive: 0 | 1;
    items: BudgetCreateItemInput[];
  }) => Promise<void>;
};

type RowDraft = {
  rowId: string;
  categoryId: number | null;
  amountText: string;
};

function makeRowId(): string {
  return `row_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}


export default function BudgetEditModal(props: BudgetEditModalProps) {
  const {
    isOpen,
    onClose,
    categoryOptions,
    initialName,
    initialPeriod,
    initialIsActive,
    initialItems,
    onSave,
  } = props;

  // Stores the edited name
  const [nameValue, setNameValue] = useState<string>(initialName);

  // Stores the edited period
  const [periodValue, setPeriodValue] = useState<BudgetPeriodKey>(initialPeriod);

  // Stores active/inactive toggle
  const [isActiveValue, setIsActiveValue] = useState<0 | 1>(initialIsActive);

  // Stores edited rows
  const [rowsValue, setRowsValue] = useState<RowDraft[]>(
    initialItems.length
      ? initialItems.map((i) => ({
          rowId: makeRowId(),
          categoryId: i.categoryId,
          amountText: String(i.amount ?? ""),
        }))
      : [{ rowId: makeRowId(), categoryId: null, amountText: "" }],
  );

  // Displays validation / server errors
  const [errorTextValue, setErrorTextValue] = useState<string>("");

  // Guard for save button
  const [isSavingValue, setIsSavingValue] = useState<boolean>(false);

   /**
  * Re-hydrates the edit form with the selected budget’s data.
  * - Runs every time the modal opens OR the initial props change.
  * - This is what prevents “having to recreate from scratch”.
  */
  useEffect(() => {
    if (!isOpen) return;

    setErrorTextValue("");
    setIsSavingValue(false);

    setNameValue(initialName);
    setPeriodValue(initialPeriod);
    setIsActiveValue(initialIsActive);

    setRowsValue(
      initialItems.length
        ? initialItems.map((i) => ({
            rowId: makeRowId(),
            categoryId: i.categoryId,
            amountText: String(i.amount ?? ""),
          }))
        : [{ rowId: makeRowId(), categoryId: null, amountText: "" }],
    );
  }, [isOpen, initialName, initialPeriod, initialIsActive, initialItems]);

  const budgetedTotalValue = useMemo(() => {
    return rowsValue.reduce((sumValue, rowValue) => {
      const parsedValue = Number(rowValue.amountText);
      return sumValue + (Number.isFinite(parsedValue) ? parsedValue : 0);
    }, 0);
  }, [rowsValue]);

  function addRow(): void {
    setRowsValue((prevValue) => [
      ...prevValue,
      { rowId: makeRowId(), categoryId: null, amountText: "" },
    ]);
  }

  function removeRow(rowIdValue: string): void {
    setRowsValue((prevValue) => {
      const nextValue = prevValue.filter((r) => r.rowId !== rowIdValue);
      return nextValue.length ? nextValue : prevValue;
    });
  }

  async function handleSave(): Promise<void> {
    setErrorTextValue("");

    const trimmedNameValue = nameValue.trim();
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

    try {
      setIsSavingValue(true);
      await onSave({
        name: trimmedNameValue,
        period: periodValue,
        isActive: isActiveValue,
        items: itemsValue,
      });
      onClose();
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to save changes.");
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
                Edit Budget
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
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
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
                        borderRadius="14px"
                        bg="white"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Box>

                  <Box w={{ base: "100%", md: "180px" }}>
                    <Text fontSize="sm" fontWeight={900} color="brand.700" mb={1}>
                      Status
                    </Text>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={String(isActiveValue)}
                        onChange={(e) => setIsActiveValue(e.target.value === "1" ? 1 : 0)}
                        borderRadius="14px"
                        bg="white"
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Box>
                </HStack>

                <Text fontSize="sm" color="brand.700">
                  Total budgeted: <b>{formatMoney(budgetedTotalValue)}</b>
                </Text>

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
                                      r.rowId === rowValue.rowId ? { ...r, categoryId: nextIdValue } : r,
                                    ),
                                  );
                                }}
                                borderRadius="14px"
                                bg="white"
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
                              borderRadius="14px"
                              placeholder="0"
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
                  Save Changes
                </Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
