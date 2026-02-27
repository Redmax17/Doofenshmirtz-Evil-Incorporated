//This file creates shared variable types for useage in other pages

// =========================
// Dashboard Page Types
// =========================
export type DashboardSummary = {
  monthLabel: string;
  incomeTotal: number;
  spendingTotal: number;
  netTotal: number;
  dataAsOf: string; // ISO string or readable
};

export type TransactionRow = {
  transactionId: string;
  date: string; // yyyy-mm-dd
  name: string;
  category: string;
  amount: number; // positive = expense (recommended)
};

export type TimeFrameKey = "mtd" | "last7" | "last30" | "ytd" | "all";

//pie chart 
export type SpendingByCategoryRow = {
  category: string;
  total: number;
};

export type SpendingPieChartProps = {
  timeFrame: string;
  accountIdValue?: string;
};

export type TimeGrouping = "day" | "month" | "year";

export type SpendingOverTimePoint = {
  label: string;
  spending: number;
  income: number;
};

export type SpendingOverTimeResponse = {
  grouping: TimeGrouping; // "day" | "month" | "year"
  points: SpendingOverTimePoint[];
};

export type LineChartProps = {
  titleValue?: string;
  timeFrameValue: TimeFrameKey;
  lineColor?: string;
  accountIdValue?: string;
};

export type NetWorthAccountRow = {
  accountId: number;
  name: string;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  balance: number;
  bucket: "asset" | "liability";
};

export type NetWorthResponse = {
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorth: number;
  accounts: NetWorthAccountRow[];
  warning?: string;
  meta?: {
    usedBalanceColumn?: string;
    accountIdFilterApplied?: boolean;
  };
};


// ------------------------------
// Budgets Page Types (Shared)
// ------------------------------

export type BudgetPeriodKey = "weekly" | "biweekly" | "monthly" | "yearly";

export type BudgetCategoryOption = {
  categoryId: number;
  displayName: string;
  plaidPrimaryCategory: string;
};

export type BudgetCreateItemInput = {
  categoryId: number;
  amount: number;
};

export type BudgetCreateInput = {
  name: string;
  period: BudgetPeriodKey;
  incomeAmount?: number;
  items: BudgetCreateItemInput[];
};

export type BudgetListItem = {
  budgetId: number;
  name: string;
  period: BudgetPeriodKey;
  createdAt: string;
  isActive: 0 | 1;
};

export type BudgetWindow = {
  label: string;
  start: string;
  end: string;
};

export type BudgetCategoryStatus = {
  categoryId: number;
  categoryName: string;
  plaidPrimaryCategory: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  isOver: boolean;
};

export type BudgetTransactionRow = {
  transactionId: number | string;
  date: string;
  name: string;
  amount: number;
};

export type BudgetDetailResponse = {
  budgetId: number;
  name: string;
  period: BudgetPeriodKey;
  window: BudgetWindow;
  totals: {
    budgetedTotal: number;
    spentTotal: number;
    remainingTotal: number;
  };
  categories: BudgetCategoryStatus[];
  overCategories: BudgetCategoryStatus[];
  transactionsByCategory: Record<string, BudgetTransactionRow[]>;
};

export type BudgetHistoryPoint = {
  label: string;
  windowStart: string;
  windowEnd: string;
  budgetedTotal: number;
  spentTotal: number;
  percentUsed: number;
};

export type BudgetHistoryResponse = {
  budgetId: number;
  points: BudgetHistoryPoint[];
};
