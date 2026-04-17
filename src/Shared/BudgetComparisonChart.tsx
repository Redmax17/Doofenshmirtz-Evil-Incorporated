/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as chartJsValue,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Box,
  Flex,
  Heading,
  Spinner,
  Text,
  NativeSelectRoot,
  NativeSelectField,
  Stack,
  Badge,
} from "@chakra-ui/react";
import { apiClient } from "../Shared/apiClient";
import { formatMoney, safeText, getAmountToneColor } from "./SharedFunctions";


chartJsValue.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type BudgetCategoryCompare = {
  categoryId: number;
  categoryName: string;
  plaidPrimaryCategory: string;
  budgetedAmount: number;
  spentAmount: number;
};

type BudgetCompare = {
  budgetId: number;
  name: string;
  period: string;
  window: { label: string; start: string; end: string };
  categories: BudgetCategoryCompare[];
};

type BudgetComparisonResponse = {
  budgets: BudgetCompare[];
};

export default function BudgetComparisonChart() {
  const [isLoadingValue, setIsLoadingValue] = React.useState<boolean>(true);
  const [errorValue, setErrorValue] = React.useState<string>("");
  const [budgetsValue, setBudgetsValue] = React.useState<BudgetCompare[]>([]);
  const [selectedBudgetIdValue, setSelectedBudgetIdValue] = React.useState<number | null>(null);

  React.useEffect(() => {
    let isMountedValue = true;

    async function loadValue() {
      try {
        setIsLoadingValue(true);
        setErrorValue("");

        const resValue = await apiClient.get<BudgetComparisonResponse>(
          "/api/v1/dashboard/budget-comparison",
        );

        if (!isMountedValue) return;

        const budgetsListValue = Array.isArray(resValue.budgets) ? resValue.budgets : [];
        setBudgetsValue(budgetsListValue);

        if (budgetsListValue.length && selectedBudgetIdValue == null) {
          setSelectedBudgetIdValue(budgetsListValue[0].budgetId);
        }
      } catch (errValue) {
        if (!isMountedValue) return;
        setErrorValue(errValue instanceof Error ? errValue.message : String(errValue));
      } finally {
        if (!isMountedValue) return;
        setIsLoadingValue(false);
      }
    }

    loadValue();
    return () => {
      isMountedValue = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBudgetValue = React.useMemo(() => {
    if (!budgetsValue.length) return null;
    if (selectedBudgetIdValue == null) return budgetsValue[0];
    return budgetsValue.find((bValue) => bValue.budgetId === selectedBudgetIdValue) ?? budgetsValue[0];
  }, [budgetsValue, selectedBudgetIdValue]);

  const chartPayloadValue = React.useMemo(() => {
    const categoriesValue = selectedBudgetValue?.categories ?? [];
    const labelsValue = categoriesValue.map((cValue) => cValue.categoryName);

    const budgetedValuesValue = categoriesValue.map((cValue) =>
      Number((cValue.budgetedAmount ?? 0).toFixed(2)),
    );

    const spentValuesValue = categoriesValue.map((cValue) =>
      Number((cValue.spentAmount ?? 0).toFixed(2)),
    );

    const totalBudgetedValue = budgetedValuesValue.reduce((accValue, nValue) => accValue + nValue, 0);
    const totalSpentValue = spentValuesValue.reduce((accValue, nValue) => accValue + nValue, 0);

    const overUnderValue = totalBudgetedValue - totalSpentValue;

    return {
      labelsValue,
      budgetedValuesValue,
      spentValuesValue,
      totalBudgetedValue,
      totalSpentValue,
      overUnderValue,
    };
  }, [selectedBudgetValue]);

  const barDataValue = React.useMemo(() => {
    return {
      labels: chartPayloadValue.labelsValue,
      datasets: [
        {
          label: "Budgeted",
          data: chartPayloadValue.budgetedValuesValue,
          borderColor: "#38a169",
          backgroundColor: "rgba(56, 161, 105, 0.2)",
        },
        {
          label: "Spent",
          data: chartPayloadValue.spentValuesValue,
          borderColor: "#e53e3e",
          backgroundColor: "rgba(229, 62, 62, 0.2)",
        },
      ],
    };
  }, [chartPayloadValue]);

  const barOptionsValue = React.useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y" as const,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (ctxValue: any) => {
              const labelValue = String(ctxValue.dataset?.label ?? "Value");
              const valValue = Number(ctxValue.raw ?? 0);
              return `${labelValue}: ${formatMoney(valValue)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: (valValue: any) => formatMoney(Number(valValue)),
          },
        },
      },
    };
  }, []);

  const headerRow = (
    <Flex justify="space-between" align="center" gap={3} wrap="wrap">
      <Stack gap={0}>
        <Heading size="sm" color="brand.900">
          Budget Comparison
        </Heading>
        <Text fontSize="sm" color="brand.700">
          {selectedBudgetValue
            ? `${selectedBudgetValue.name} • ${selectedBudgetValue.window.label}`
            : "No active budgets found"}
        </Text>
      </Stack>

      <Flex align="center" gap={2}>
        {selectedBudgetValue ? (
          <Badge borderRadius="999px" px={3} py={1} bg="brand.100" color="brand.700">
            {formatMoney(chartPayloadValue.totalSpentValue)} spent / {formatMoney(chartPayloadValue.totalBudgetedValue)} budget
          </Badge>
        ) : null}

        <NativeSelectRoot
            size="sm"
            width={{ base: "220px", md: "260px" }}
            disabled={!budgetsValue.length}
        >
            <NativeSelectField
                value={selectedBudgetIdValue ?? ""}
                onChange={(eValue) => setSelectedBudgetIdValue(Number(eValue.target.value))}
            >
                {budgetsValue.map((bValue) => (
                <option key={bValue.budgetId} value={bValue.budgetId}>
                    {bValue.name} ({bValue.period})
                </option>
                ))}
            </NativeSelectField>
        </NativeSelectRoot>
      </Flex>
    </Flex>
  );

  if (isLoadingValue) {
    return (
      <Box p={4}>
        {headerRow}
        <Flex align="center" gap={3} mt={4}>
          <Spinner />
          <Text color="brand.700">Loading budget data…</Text>
        </Flex>
      </Box>
    );
  }

  if (errorValue) {
    return (
      <Box p={4}>
        {headerRow}
        <Text mt={3} color="negatives.400" fontWeight={800}>
          Failed to load budget comparison
        </Text>
        <Text color="brand.700" fontSize="sm" mt={1}>
          {errorValue}
        </Text>
      </Box>
    );
  }

  if (!selectedBudgetValue || !selectedBudgetValue.categories.length) {
    return (
      <Box p={4}>
        {headerRow}
        <Text mt={3} color="brand.700">
          Add budget categories (budget_items) to see the chart.
        </Text>
      </Box>
    );
  }

  const overUnderColorValue =
    chartPayloadValue.overUnderValue >= 0 ? "accent.400" : "negatives.400";

  return (
    <Box p={4}>
      {headerRow}

      <Flex mt={3} justify="space-between" align="center" wrap="wrap" gap={2}>
        <Text fontSize="sm" color="brand.700">
          {selectedBudgetValue.window.start} → {selectedBudgetValue.window.end}
        </Text>

        <Badge borderRadius="999px" px={3} py={1} bg="white" color={overUnderColorValue}>
          {chartPayloadValue.overUnderValue >= 0 ? "Under" : "Over"} by{" "}
          {formatMoney(Math.abs(chartPayloadValue.overUnderValue))}
        </Badge>
      </Flex>

      <Box mt={4} h={{ base: "380px", md: "460px" }}>
        <Bar data={barDataValue as any} options={barOptionsValue as any} />
      </Box>
    </Box>
  );
}
