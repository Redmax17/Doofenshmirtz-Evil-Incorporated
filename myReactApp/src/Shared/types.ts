//This file creates shared variable types for useage in other pages

//used for dashboard page 
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
};

export type TimeGrouping = "day" | "month" | "year";

export type SpendingOverTimePoint = {
  label: string; // "YYYY-MM-DD" | "YYYY-MM" | "YYYY"
  amount: number;
};

export type SpendingOverTimeResponse = {
  grouping: TimeGrouping;
  points: SpendingOverTimePoint[];
};

export type LineChartProps = {
  titleValue?: string;
  timeFrameValue: TimeFrameKey;
  lineColor?: string;
};