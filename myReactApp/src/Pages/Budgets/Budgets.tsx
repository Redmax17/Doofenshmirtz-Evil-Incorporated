// Budgets.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  HStack,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";

import Layout from "../../Shared/Layout";
import { apiClient } from "../../Shared/apiClient";

import BudgetCreateModal from "../../Shared/CreateModal";
import BudgetDetailsDrawer from "../../Shared/BudgetDetailsDrawer";
import BudgetEditModal from "../../Shared/BudgetEditModal";

import type {
  BudgetCategoryOption,
  BudgetCreateInput,
  BudgetCreateItemInput,
  BudgetDetailResponse,
  BudgetHistoryResponse,
  BudgetListItem,
  BudgetPeriodKey,
} from "../../Shared/types";

/**
 * Shape returned by GET /api/v1/budgets/:budgetId/edit
 * - Used to prefill the edit modal so the user never rebuilds a budget from scratch.
 */
type BudgetEditLoadResponse = {
  budget: { budgetId: number; name: string; period: BudgetPeriodKey; isActive: 0 | 1 };
  items: { categoryId: number; amount: number }[];
};

type BudgetListMode = "active" | "inactive";

export default function Budgets() {
  // Controls which menu is shown (active vs inactive budgets)
  const [budgetListModeValue, setBudgetListModeValue] = useState<BudgetListMode>("active");

  // Stores budgets list for the current mode
  const [budgetsValue, setBudgetsValue] = useState<BudgetListItem[]>([]);

  // Stores category options used by create/edit dropdown rows
  const [categoryOptionsValue, setCategoryOptionsValue] = useState<BudgetCategoryOption[]>([]);

  // Page load state + errors
  const [isLoadingValue, setIsLoadingValue] = useState<boolean>(true);
  const [errorTextValue, setErrorTextValue] = useState<string>("");

  // Create modal state
  const [isCreateOpenValue, setIsCreateOpenValue] = useState<boolean>(false);

  // Details drawer state
  const [isDetailsOpenValue, setIsDetailsOpenValue] = useState<boolean>(false);
  const [selectedBudgetIdValue, setSelectedBudgetIdValue] = useState<number | null>(null);
  const [detailDataValue, setDetailDataValue] = useState<BudgetDetailResponse | null>(null);
  const [historyDataValue, setHistoryDataValue] = useState<BudgetHistoryResponse | null>(null);
  const [isDetailsLoadingValue, setIsDetailsLoadingValue] = useState<boolean>(false);

  // Edit modal state
  const [isEditOpenValue, setIsEditOpenValue] = useState<boolean>(false);
  const [editBudgetIdValue, setEditBudgetIdValue] = useState<number | null>(null);
  const [editInitialNameValue, setEditInitialNameValue] = useState<string>("");
  const [editInitialPeriodValue, setEditInitialPeriodValue] = useState<BudgetPeriodKey>("monthly");
  const [editInitialIsActiveValue, setEditInitialIsActiveValue] = useState<0 | 1>(1);
  const [editInitialItemsValue, setEditInitialItemsValue] = useState<BudgetCreateItemInput[]>([]);
  const [isEditLoadingValue, setIsEditLoadingValue] = useState<boolean>(false);

  // Visual tokens (matches the rest of your dashboard theme)
  const pageBgValue = "brand.100";
  const cardBgValue = "brand.50";
  const borderColorValue = "blackAlpha.100";
  const subtleTextColorValue = "brand.700";
  const strongTextColorValue = "brand.900";

  /**
   * Loads the budgets list (active OR inactive) + the category dropdown options.
   * - Inputs: none (uses budgetListModeValue)
   * - Outputs: sets budgetsValue + categoryOptionsValue
   * - Purpose: keep Budgets page fully DB-driven and always in sync
   */
  async function loadBudgetsIndex(): Promise<void> {
    setIsLoadingValue(true);
    setErrorTextValue("");

    try {
      const budgetsPathValue =
        budgetListModeValue === "active" ? "/api/v1/budgets" : "/api/v1/budgets/inactive";

      const [budgetsResValue, categoriesResValue] = await Promise.all([
        apiClient.get<{ budgets: BudgetListItem[] }>(budgetsPathValue),
        apiClient.get<{ categories: BudgetCategoryOption[] }>("/api/v1/budgets/categories"),
      ]);

      setBudgetsValue(budgetsResValue.budgets ?? []);
      setCategoryOptionsValue(categoriesResValue.categories ?? []);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load budgets.");
    } finally {
      setIsLoadingValue(false);
    }
  }

  /**
   * Creates a new budget (DB insert) then refreshes the list.
   * - Inputs: payloadValue BudgetCreateInput
   * - Outputs: none (state refresh)
   * - Purpose: persist budgets to DB
   */
  async function createBudget(payloadValue: BudgetCreateInput): Promise<void> {
    await apiClient.post<{ ok: boolean; budgetId: number }>("/api/v1/budgets", payloadValue);
    await loadBudgetsIndex();
    setIsCreateOpenValue(false);
  }

  /**
   * Loads details + history for the selected budget.
   * - Inputs: budgetIdValue number
   * - Outputs: sets detailDataValue + historyDataValue
   * - Purpose: drawer shows current period + “last X periods” performance
   */
  async function loadBudgetDetails(budgetIdValue: number): Promise<void> {
    setIsDetailsLoadingValue(true);

    try {
      setDetailDataValue(null);
      setHistoryDataValue(null);

      const [detailResValue, historyResValue] = await Promise.all([
        apiClient.get<BudgetDetailResponse>(`/api/v1/budgets/${budgetIdValue}`),
        apiClient.get<BudgetHistoryResponse>(`/api/v1/budgets/${budgetIdValue}/history?limit=6`),
      ]);

      setDetailDataValue(detailResValue);
      setHistoryDataValue(historyResValue);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load budget details.");
    } finally {
      setIsDetailsLoadingValue(false);
    }
  }

  /**
   * Opens the drawer and triggers a fetch.
   * - Inputs: budgetIdValue number
   * - Outputs: opens drawer + loads data
   * - Purpose: list -> detail flow
   */
  function openDetails(budgetIdValue: number): void {
    setSelectedBudgetIdValue(budgetIdValue);
    setIsDetailsOpenValue(true);
    void loadBudgetDetails(budgetIdValue);
  }

  /**
   * Closes the details drawer and clears its state.
   * - Inputs: none
   * - Outputs: resets details state
   * - Purpose: avoid stale drawer data on next open
   */
  function closeDetails(): void {
    setIsDetailsOpenValue(false);
    setSelectedBudgetIdValue(null);
    setDetailDataValue(null);
    setHistoryDataValue(null);
  }

  /**
   * Opens edit modal and pre-fills values from DB.
   * - Inputs: budgetIdValue number
   * - Outputs: sets edit initial states + opens modal
   * - Purpose: editing never starts blank
   */
  async function openEdit(budgetIdValue: number): Promise<void> {
    setIsEditLoadingValue(true);
    setErrorTextValue("");

    try {
      const resValue = await apiClient.get<BudgetEditLoadResponse>(`/api/v1/budgets/${budgetIdValue}/edit`);

      setEditBudgetIdValue(budgetIdValue);
      setEditInitialNameValue(resValue.budget.name);
      setEditInitialPeriodValue(resValue.budget.period);
      setEditInitialIsActiveValue(resValue.budget.isActive);

      setEditInitialItemsValue(
        (resValue.items ?? []).map((i: { categoryId: any; amount: any; }) => ({ categoryId: i.categoryId, amount: i.amount })),
      );

      setIsEditOpenValue(true);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load budget for editing.");
    } finally {
      setIsEditLoadingValue(false);
    }
  }

  /**
   * Saves budget edits to DB then refreshes list.
   * - Inputs: payloadValue
   * - Outputs: none (state refresh)
   * - Purpose: update budgets header + items
   */
  async function saveEdit(payloadValue: {
    name: string;
    period: BudgetPeriodKey;
    isActive: 0 | 1;
    items: BudgetCreateItemInput[];
  }): Promise<void> {
    if (editBudgetIdValue == null) throw new Error("No budget selected for edit.");

    await apiClient.put(`/api/v1/budgets/${editBudgetIdValue}`, payloadValue);

    setIsEditOpenValue(false);
    setEditBudgetIdValue(null);

    await loadBudgetsIndex();

    // If drawer is open for this budget, refresh it too
    if (selectedBudgetIdValue === editBudgetIdValue) {
      void loadBudgetDetails(editBudgetIdValue);
    }
  }

  /**
   * Soft-delete (archive) a budget by calling DELETE route.
   * - Inputs: budgetIdValue number
   * - Outputs: refresh list
   * - Purpose: moves budget to inactive menu
   */
  async function deleteBudget(budgetIdValue: number): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/budgets/${budgetIdValue}`);
      await loadBudgetsIndex();

      if (selectedBudgetIdValue === budgetIdValue) closeDetails();
      if (editBudgetIdValue === budgetIdValue) setIsEditOpenValue(false);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to delete budget.");
    }
  }

  /**
   * Restores an inactive budget back to active list.
   * - Inputs: budgetIdValue number
   * - Outputs: refresh list
   * - Purpose: lets users recover archived budgets
   */
  async function restoreBudget(budgetIdValue: number): Promise<void> {
    try {
      await apiClient.post(`/api/v1/budgets/${budgetIdValue}/restore`, {});
      await loadBudgetsIndex();
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to restore budget.");
    }
  }

  // Sort budgets by createdAt desc (good UX)
  const sortedBudgetsValue = useMemo(() => {
    return [...budgetsValue].sort((a, b) => (String(a.createdAt) < String(b.createdAt) ? 1 : -1));
  }, [budgetsValue]);

  // Load on mount + when switching menu
  useEffect(() => {
    void loadBudgetsIndex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetListModeValue]);

  return (
    <Layout activePage="budgets">
      <Box bg={pageBgValue} minH="calc(100vh - 1px)">
        <Container maxW="6xl" py={{ base: 6, md: 10 }}>
          {/* =========================
              Header
             ========================= */}
          <Stack gap={3} mb={6}>
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <Box>
                <Heading size="lg" color={strongTextColorValue}>
                  Budgets
                </Heading>
                <Text color={subtleTextColorValue} mt={1}>
                  {isLoadingValue
                    ? "Loading budgets…"
                    : `${sortedBudgetsValue.length} ${budgetListModeValue} budget(s)`}
                </Text>
              </Box>

              <HStack gap={2} flexWrap="wrap" justify="flex-end">
                <Button
                  size="sm"
                  borderRadius="999px"
                  variant={budgetListModeValue === "active" ? "solid" : "outline"}
                  bg={budgetListModeValue === "active" ? "brand.500" : undefined}
                  color={budgetListModeValue === "active" ? "white" : "brand.900"}
                  onClick={() => setBudgetListModeValue("active")}
                >
                  Active
                </Button>

                <Button
                  size="sm"
                  borderRadius="999px"
                  variant={budgetListModeValue === "inactive" ? "solid" : "outline"}
                  bg={budgetListModeValue === "inactive" ? "brand.500" : undefined}
                  color={budgetListModeValue === "inactive" ? "white" : "brand.900"}
                  onClick={() => setBudgetListModeValue("inactive")}
                >
                  Inactive
                </Button>

                <Button
                  bg="brand.500"
                  color="white"
                  _hover={{ bg: "brand.600" }}
                  borderRadius="999px"
                  fontWeight={900}
                  onClick={() => setIsCreateOpenValue(true)}
                >
                  Create Budget
                </Button>
              </HStack>
            </HStack>
          </Stack>

          {/* =========================
              Error box
             ========================= */}
          {errorTextValue ? (
            <Box
              bg={cardBgValue}
              borderWidth="1px"
              borderColor={borderColorValue}
              borderRadius="16px"
              p={4}
              mb={5}
            >
              <Text fontWeight={900} color={strongTextColorValue} mb={1}>
                Something went wrong
              </Text>
              <Text color={subtleTextColorValue} whiteSpace="pre-wrap">
                {errorTextValue}
              </Text>

              <Button
                mt={3}
                bg="brand.500"
                color="white"
                _hover={{ bg: "brand.600" }}
                borderRadius="999px"
                onClick={() => void loadBudgetsIndex()}
              >
                Retry
              </Button>
            </Box>
          ) : null}

          {/* =========================
              Budgets grid
             ========================= */}
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
            {sortedBudgetsValue.map((budgetValue) => (
              <Box
                key={budgetValue.budgetId}
                bg={cardBgValue}
                borderWidth="1px"
                borderColor={borderColorValue}
                borderRadius="18px"
                p={5}
              >
                <HStack justify="space-between" align="start" gap={3}>
                  <Box>
                    <Text fontWeight={900} color={strongTextColorValue} fontSize="lg">
                      {budgetValue.name}
                    </Text>

                    <Text color={subtleTextColorValue} fontSize="sm">
                      Timeframe: <b>{budgetValue.period}</b>
                    </Text>

                    <Text color={subtleTextColorValue} fontSize="sm">
                      Created: {String(budgetValue.createdAt).slice(0, 10)}
                    </Text>
                  </Box>

                  <Badge
                    borderRadius="999px"
                    px={3}
                    py={1}
                    bg={budgetValue.isActive ? "accent.500" : "blackAlpha.200"}
                    color="brand.900"
                    fontWeight={900}
                  >
                    {budgetValue.isActive ? "Active" : "Inactive"}
                  </Badge>
                </HStack>

                <HStack mt={4} justify="space-between" align="center" flexWrap="wrap" gap={3}>
                  <Button
                    size="sm"
                    bg="brand.500"
                    color="white"
                    _hover={{ bg: "brand.600" }}
                    borderRadius="999px"
                    fontWeight={900}
                    onClick={() => openDetails(budgetValue.budgetId)}
                    disabled={budgetListModeValue === "inactive"}
                  >
                    Open details
                  </Button>

                  {budgetListModeValue === "active" ? (
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        borderRadius="999px"
                        borderColor="blackAlpha.300"
                        onClick={() => void openEdit(budgetValue.budgetId)}
                        loading={isEditLoadingValue && editBudgetIdValue === budgetValue.budgetId}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        bg="negatives.400"
                        color="white"
                        _hover={{ bg: "negatives.500" }}
                        borderRadius="999px"
                        onClick={() => void deleteBudget(budgetValue.budgetId)}
                      >
                        Delete
                      </Button>
                    </HStack>
                  ) : (
                    <Button
                      size="sm"
                      bg="accent.500"
                      color="brand.900"
                      _hover={{ bg: "accent.600" }}
                      borderRadius="999px"
                      onClick={() => void restoreBudget(budgetValue.budgetId)}
                    >
                      Restore
                    </Button>
                  )}
                </HStack>
              </Box>
            ))}
          </Grid>

          {/* =========================
              Empty state
             ========================= */}
          {!isLoadingValue && !sortedBudgetsValue.length ? (
            <Box mt={6} bg={cardBgValue} borderWidth="1px" borderColor={borderColorValue} borderRadius="18px" p={6}>
              <Text fontWeight={900} color={strongTextColorValue} mb={1}>
                No budgets here yet
              </Text>
            </Box>
          ) : null}
        </Container>

        {/* =========================
            Create Budget Modal
           ========================= */}
        <BudgetCreateModal
          isOpen={isCreateOpenValue}
          onClose={() => setIsCreateOpenValue(false)}
          categoryOptions={categoryOptionsValue}
          onCreateBudget={createBudget}
        />

        {/* =========================
            Edit Budget Modal
           ========================= */}
        <BudgetEditModal
          isOpen={isEditOpenValue}
          onClose={() => setIsEditOpenValue(false)}
          categoryOptions={categoryOptionsValue}
          initialName={editInitialNameValue}
          initialPeriod={editInitialPeriodValue}
          initialIsActive={editInitialIsActiveValue}
          initialItems={editInitialItemsValue}
          onSave={saveEdit}
        />

        {/* =========================
            Details Drawer
           ========================= */}
        <BudgetDetailsDrawer
          isOpen={isDetailsOpenValue}
          onClose={closeDetails}
          detailData={detailDataValue}
          historyData={historyDataValue}
          onRefresh={() => {
            if (selectedBudgetIdValue != null) void loadBudgetDetails(selectedBudgetIdValue);
          }}
        />

        {/* =========================
            Small loading pill
           ========================= */}
        {isDetailsOpenValue && isDetailsLoadingValue ? (
          <Box position="fixed" bottom={4} left="50%" transform="translateX(-50%)" zIndex={9999}>
            <Box bg="blackAlpha.700" color="white" px={4} py={2} borderRadius="999px" fontWeight={800}>
              Loading budget…
            </Box>
          </Box>
        ) : null}
      </Box>
    </Layout>
  );
}
