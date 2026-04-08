/* src/Shared/sharedFunctions.ts */

/**
 * Shared helper utilities for the front-end (NOT the server).
 * Goal: keep formatting + small “data shaping” helpers in one place so pages/components stay clean.
 */

/* ------------------------- Text + Number Formatting ------------------------- */

/**
 * formatMoney
 * Inputs: amountValue (number)
 * Output: string (USD currency, ex: "$1,234.56")
 * Purpose: display currency consistently everywhere (cards, tables, charts).
 */
export function formatMoney(amountValue: number): string {
  const safeAmountValue = Number.isFinite(amountValue) ? amountValue : 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(safeAmountValue);
}

/**
 * safeText
 * Inputs: textValue (string | null | undefined)
 * Output: string (trimmed string, or "—" if empty)
 * Purpose: avoid blank/undefined UI strings in tables + labels.
 */
export function safeText(textValue: string | null | undefined): string {
  const cleanValue = String(textValue ?? "").trim();
  return cleanValue.length ? cleanValue : "—";
}

/**
 * parseMoneyInput
 * Inputs: valueValue (string) - user typed input (may include $ , commas, etc.)
 * Output: number - parsed numeric amount (0 if invalid)
 * Purpose: safely parse inputs like "$1,234.50" into a number.
 */
export function parseMoneyInput(valueValue: string): number {
  const cleanedValue = String(valueValue ?? "").replace(/[^0-9.-]/g, "");
  const parsedValue = Number(cleanedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

/**
 * getAmountToneColor
 * Inputs: amountValue (number)
 * Output: Chakra color token (string)
 * Purpose: standardize “positive vs negative” color decisions (green vs red).
 */
export function getAmountToneColor(amountValue: number): string {
  const safeAmountValue = Number.isFinite(amountValue) ? amountValue : 0;
  return safeAmountValue >= 0 ? "accent.400" : "negatives.400";
}

/* ------------------------------ Date Helpers -------------------------------- */

/**
 * pad2Value
 * Inputs: numValue (number)
 * Output: string (left padded, 2 chars)
 * Purpose: build YYYY-MM-DD and YYYY-MM keys reliably.
 */
export function pad2Value(numValue: number): string {
  return String(numValue).padStart(2, "0");
}

/**
 * startOfDayValue
 * Inputs: dateValue (Date)
 * Output: Date (same date at 00:00:00.000)
 * Purpose: normalize dates so “daily” timelines behave predictably.
 */
export function startOfDayValue(dateValue: Date): Date {
  const dValue = new Date(dateValue);
  dValue.setHours(0, 0, 0, 0);
  return dValue;
}

/**
 * addDaysValue
 * Inputs: dateValue (Date), daysValue (number)
 * Output: Date (dateValue + daysValue)
 * Purpose: generate sequential daily keys.
 */
export function addDaysValue(dateValue: Date, daysValue: number): Date {
  const dValue = new Date(dateValue);
  dValue.setDate(dValue.getDate() + daysValue);
  return dValue;
}

/**
 * formatDayKeyValue
 * Inputs: dateValue (Date)
 * Output: string "YYYY-MM-DD"
 * Purpose: consistent “day” key format for chart timelines.
 */
export function formatDayKeyValue(dateValue: Date): string {
  return `${dateValue.getFullYear()}-${pad2Value(dateValue.getMonth() + 1)}-${pad2Value(dateValue.getDate())}`;
}

/**
 * formatMonthKeyValue
 * Inputs: dateValue (Date)
 * Output: string "YYYY-MM"
 * Purpose: consistent “month” key format for chart timelines.
 */
export function formatMonthKeyValue(dateValue: Date): string {
  return `${dateValue.getFullYear()}-${pad2Value(dateValue.getMonth() + 1)}`;
}

/**
 * formatDisplayLabelValue
 * Inputs: labelValue (string), groupingValue ("day" | "month" | "year")
 * Output: string (friendly label for the x-axis)
 * Purpose: turn raw keys into readable chart labels.
 */
export function formatDisplayLabelValue(
  labelValue: string,
  groupingValue: "day" | "month" | "year",
): string {
  try {
    if (groupingValue === "day") {
      const dValue = new Date(`${labelValue}T00:00:00`);
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dValue);
    }
    if (groupingValue === "month") {
      const dValue = new Date(`${labelValue}-01T00:00:00`);
      return new Intl.DateTimeFormat("en-US", { month: "short" }).format(dValue);
    }
    return labelValue;
  } catch {
    return labelValue;
  }
}

export function negativeCheck(amountValue: number){
  //This function Checks for negative values in displayed numbers to make them appear as red/green text 
  // by returning the proper color code from the imported theme pages
  if (amountValue>=0){
    return "accent.400";
  }
  else{
    return "negatives.400";
  }
}

export function formatDate(dateValue: string): string {
  //converts plaid date strings into date values for better format options and logic
  // expects yyyy-mm-dd; if you store it as an ISO, slice it before sending here
  //can adjust this func to handle iso automatically if so desired (prob for better)
  return dateValue;
}

/* ------------------------------ Budget Helpers -------------------------------- */

/**
 * Calculates a safe percent used value.
 * - Inputs: spentValue, budgetedValue
 * - Output: number in range [0..9999] (clamped for UI safety)
 * - Purpose: avoid NaN/Infinity and keep display stable when budgeted is 0
 */
export function calcPercentUsed(spentValue: number, budgetedValue: number): number {
  if (!Number.isFinite(spentValue) || !Number.isFinite(budgetedValue)) return 0;
  if (budgetedValue <= 0) return 0;
  const rawValue = (spentValue / budgetedValue) * 100;
  return Math.max(0, Math.min(9999, Number(rawValue.toFixed(2))));
}
