//Temporary Server/Backend that can be used to develop PAges before full backend is completed.
//can also be used as an example for real DB when implementing calls for the Page(s) this was testing.

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runQuery } from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { requireAuth } from "./authMiddleware.js";

dotenv.config();

const app = express();
const portValue = Number(process.env.PORT || 5000);

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

//Route Functions:
/**
 * Accept either:
 * - ?timeFrame=mtd|last7|last30|ytd|all
 * - OR legacy ?range=month|30d|all
 */
function resolveTimeFrameKey(req) {
  const timeFrameRaw = String(req.query.timeFrame ?? "").trim();
  if (timeFrameRaw) return timeFrameRaw;

  const rangeRaw = String(req.query.range ?? "").trim();
  if (!rangeRaw) return "last30";

  if (rangeRaw === "month") return "mtd";
  if (rangeRaw === "all") return "all";
  return "last30";
}

function getTimeFrameWhereClause(timeFrameValue) {
  if (timeFrameValue === "mtd") {
    return `
      t.datetime_posted >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
      AND t.datetime_posted < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
    `;
  }
  if (timeFrameValue === "last7") return `t.datetime_posted >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
  if (timeFrameValue === "last30") return `t.datetime_posted >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
  if (timeFrameValue === "ytd") {
    return `
      t.datetime_posted >= DATE_FORMAT(CURDATE(), '%Y-01-01')
      AND t.datetime_posted < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-01-01'), INTERVAL 1 YEAR)
    `;
  }
  if (timeFrameValue === "all") return `t.datetime_posted IS NOT NULL`;
  return `t.datetime_posted >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
}

function getTimeFrameLabel(timeFrameValue) {
  if (timeFrameValue === "mtd") {
    return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
  }
  if (timeFrameValue === "last7") return "Last 7 days";
  if (timeFrameValue === "last30") return "Last 30 days";
  if (timeFrameValue === "ytd") return "Year-to-date";
  if (timeFrameValue === "all") return "All time";
  return "Last 30 days";
}

function resolveAccountFilter(req, tableAliasValue = "t") {
  //this function pulls in the table we are working with and the passed data to the route call and outputs the account filter for the SQL query along with some other useful bools
  const accountIdRawValue = String(req.query.accountId ?? "").trim().toLowerCase();

  // Treat these as "all accounts"
  const isAllValue =
    accountIdRawValue === "" ||
    accountIdRawValue === "all" ||
    accountIdRawValue === "null" ||
    accountIdRawValue === "undefined" ||
    accountIdRawValue === "-1";

  if (isAllValue) {
    return {
      hasAccountFilterValue: false,
      accountIdValue: null,
      accountFilterSqlValue: "",
      debugValue: { accountIdRawValue, isAllValue }
    };
  }

  const parsedAccountIdValue = Number(accountIdRawValue);
  const hasAccountFilterValue = Number.isFinite(parsedAccountIdValue) && parsedAccountIdValue >= 0;

  return {
    hasAccountFilterValue,
    accountIdValue: hasAccountFilterValue ? parsedAccountIdValue : null,
    accountFilterSqlValue: hasAccountFilterValue ? ` AND ${tableAliasValue}.account_id = ${parsedAccountIdValue}` : "",
    debugValue: { accountIdRawValue, isAllValue, parsedAccountIdValue, hasAccountFilterValue }
  };
}

function signToken(userIdValue, emailValue) {
  return jwt.sign(
    { userId: userIdValue, email: emailValue },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * Maps raw Plaid primary_category strings into the keys your budgets use.
 * - Inputs: rawValue string
 * - Output: normalized key string (ex: FOOD_AND_DRINK)
 * - Purpose: stable matching between plaid_transaction_pfc and budget_categories
 */
function normalizePrimaryCategoryKey(rawValue) {
  const v = String(rawValue || "").trim();

  if (!v) return "UNCATEGORIZED";

  // Match the same logic you used in budget-comparison
  if (v === "UTILITIES") return "RENT_AND_UTILITIES";
  if (/^[A-Z_]+$/.test(v)) return v;

  const lowerValue = v.toLowerCase();

  if (["dining", "groceries"].includes(lowerValue)) return "FOOD_AND_DRINK";
  if (lowerValue === "gas") return "TRANSPORTATION";
  if (lowerValue === "shopping") return "GENERAL_MERCHANDISE";
  if (lowerValue === "utilities") return "RENT_AND_UTILITIES";
  if (lowerValue === "housing") return "HOUSING";
  if (lowerValue === "income") return "INCOME";

  return "UNCATEGORIZED";
}

/**
 * Builds a JS-based rolling window for a period + offset.
 * - Inputs: periodKeyValue, offsetValue (0 = current, 1 = previous, etc.)
 * - Output: { windowStartDateValue, windowEndDateValue, labelValue }
 * - Purpose: history stats without needing a snapshot table yet
 */
function getBudgetWindowDates(periodKeyValue, offsetValue = 0) {
  const nowValue = new Date();
  const periodValue = String(periodKeyValue || "monthly").toLowerCase();

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d, days) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }

  function addMonths(d, months) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + months);
    return x;
  }

  function addYears(d, years) {
    const x = new Date(d);
    x.setFullYear(x.getFullYear() + years);
    return x;
  }

  // Monday-start week
  function startOfWeek(d) {
    const x = startOfDay(d);
    const dayValue = (x.getDay() + 6) % 7; // Monday=0
    return addDays(x, -dayValue);
  }

  let windowStartDateValue;
  let windowEndDateValue;

  if (periodValue === "weekly") {
    const baseStartValue = startOfWeek(nowValue);
    windowStartDateValue = addDays(baseStartValue, -7 * offsetValue);
    windowEndDateValue = addDays(windowStartDateValue, 7);
  } else if (periodValue === "biweekly") {
    // Rolling 14-day windows ending “now”
    const baseEndValue = startOfDay(addDays(nowValue, 1));
    windowEndDateValue = addDays(baseEndValue, -14 * offsetValue);
    windowStartDateValue = addDays(windowEndDateValue, -14);
  } else if (periodValue === "yearly" || periodValue === "annual") {
    const yearValue = nowValue.getFullYear() - offsetValue;
    windowStartDateValue = new Date(yearValue, 0, 1);
    windowEndDateValue = new Date(yearValue + 1, 0, 1);
  } else {
    // monthly
    const baseStartValue = new Date(nowValue.getFullYear(), nowValue.getMonth(), 1);
    windowStartDateValue = addMonths(baseStartValue, -offsetValue);
    windowEndDateValue = addMonths(windowStartDateValue, 1);
  }

  const labelValue =
    offsetValue === 0 ? "Current period" : `${offsetValue} period(s) ago`;

  // MySQL likes YYYY-MM-DD HH:mm:ss
  function toMysqlDateTime(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  return {
    labelValue,
    windowStartValue: toMysqlDateTime(windowStartDateValue),
    windowEndValue: toMysqlDateTime(windowEndDateValue),
  };
}

//Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const emailValue = String(req.body.email || "").trim().toLowerCase();
    const passwordValue = String(req.body.password || "");

    if (!emailValue || !passwordValue) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const existingRows = await runQuery(
      `SELECT user_id FROM users WHERE email = ? LIMIT ${limitValue}`,
      [emailValue]
    );

    if (existingRows.length) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHashValue = await bcrypt.hash(passwordValue, 12);

    const insertSqlValue = `
      INSERT INTO users (email, password_hash, created_at, updated_at)
      VALUES (?, ?, NOW(), NOW())
    `;
    const insertResult = await runQuery(insertSqlValue, [
      emailValue,
      passwordHashValue,
    ]);

    const userIdValue = Number(insertResult.insertId);
    const tokenValue = signToken(userIdValue, emailValue);

    return res.status(201).json({
      token: tokenValue,
      user: { userId: userIdValue, email: emailValue },
    });
  } catch (errValue) {
    return res.status(500).json({ error: String(errValue) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const emailValue = String(req.body.email || "").trim().toLowerCase();
    const passwordValue = String(req.body.password || "");

    if (!emailValue || !passwordValue) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const rowsValue = await runQuery(
      `SELECT user_id, email, password_hash FROM users WHERE email = ? LIMIT ${limitValue}`,
      [emailValue]
    );

    if (!rowsValue.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userRow = rowsValue[0];
    const isValidValue = await bcrypt.compare(
      passwordValue,
      String(userRow.password_hash)
    );

    if (!isValidValue) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userIdValue = Number(userRow.user_id);
    const tokenValue = signToken(userIdValue, String(userRow.email));

    return res.json({
      token: tokenValue,
      user: { userId: userIdValue, email: String(userRow.email) },
    });
  } catch (errValue) {
    return res.status(500).json({ error: String(errValue) });
  }
});
  
app.get("/api/auth/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

//Dashboard Page Routes:
/**
 * GET /api/v1/dashboard/summary?timeFrame=mtd|last7|last30|ytd|all
 */
app.get("/api/v1/dashboard/summary", requireAuth, async (req, res) => {
  try {
    const { hasAccountFilterValue, accountIdValue, accountFilterSqlValue, debugValue } =
    resolveAccountFilter(req, "t");

    const timeFrameValue = resolveTimeFrameKey(req);
    const whereRangeValue = getTimeFrameWhereClause(timeFrameValue);

    const sqlValue = `
      SELECT
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS incomeTotal,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS spendingTotal
      FROM plaid_transactions t
      JOIN plaid_accounts a ON t.account_id = a.id
      JOIN plaid_items i ON a.item_id = i.id
      WHERE t.user_id = ?
        AND t.pending = 0
        AND ${whereRangeValue}
        ${accountFilterSqlValue};;
    `;


    const userIdValue = req.user.userId;
    const rowsValue = await runQuery(sqlValue, [userIdValue]);
    const incomeTotal = Number(rowsValue?.[0]?.incomeTotal ?? 0);
    const spendingTotal = Number(rowsValue?.[0]?.spendingTotal ?? 0);

    res.json({
      timeFrame: timeFrameValue,
      monthLabel: getTimeFrameLabel(timeFrameValue),
      incomeTotal,
      spendingTotal,
      netTotal: incomeTotal - spendingTotal,
      dataAsOf: new Date().toLocaleString(),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * GET /api/v1/dashboard/recent-transactions?limit=8&timeFrame=...
 */
app.get("/api/v1/dashboard/recent-transactions", requireAuth, async (req, res) => {
  try {
    const { hasAccountFilterValue, accountIdValue, accountFilterSqlValue, debugValue } =
    resolveAccountFilter(req, "t");

    const timeFrameValue = resolveTimeFrameKey(req);
    const whereRangeValue = getTimeFrameWhereClause(timeFrameValue);
    const limitValue = Number(req.query.limit || 8);


    const sqlValue = `
      SELECT
        t.id AS transactionId,
        DATE(t.datetime_posted) AS date,
        COALESCE(t.merchant_name, t.name_legacy) AS name,
        COALESCE(pfc.primary_category, 'Uncategorized') AS category,
        t.amount AS amount
      FROM plaid_transactions t
      JOIN plaid_accounts a ON t.account_id = a.id
      JOIN plaid_items i ON a.item_id = i.id
      LEFT JOIN plaid_transaction_pfc pfc
        ON pfc.transaction_id = t.id
      WHERE t.pending = 0
        AND ${whereRangeValue}
        AND t.user_id = ?
        ${accountFilterSqlValue}
      ORDER BY t.datetime_posted DESC
      LIMIT ${limitValue};
    `;

    const userIdValue = req.user.userId;
    const rowsValue = await runQuery(sqlValue, [userIdValue]);


    res.json(
      rowsValue.map((rowValue) => ({
        transactionId: String(rowValue.transactionId),
        date: rowValue.date instanceof Date
          ? rowValue.date.toISOString().split("T")[0]
          : String(rowValue.date),
        name: String(rowValue.name ?? ""),
        category: String(rowValue.category ?? "Uncategorized"),
        amount: Number(rowValue.amount),
      }))
    );
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * GET /api/v1/dashboard/spending-by-category?timeFrame=...
 * Returns: [{ category: "Food", total: 123.45 }]
 */
app.get("/api/v1/dashboard/spending-by-category", requireAuth, async (req, res) => {
  try {
    const { hasAccountFilterValue, accountIdValue, accountFilterSqlValue, debugValue } =
    resolveAccountFilter(req, "t");

    const timeFrameValue = resolveTimeFrameKey(req);
    const whereRangeValue = getTimeFrameWhereClause(timeFrameValue);

    const sqlValue = `
      SELECT
        COALESCE(pfc.primary_category, 'Uncategorized') AS category,
        COALESCE(SUM(t.amount), 0) AS total
      FROM plaid_transactions t
      JOIN plaid_accounts a ON t.account_id = a.id
      JOIN plaid_items i ON a.item_id = i.id
      LEFT JOIN plaid_transaction_pfc pfc
        ON pfc.transaction_id = t.id
      WHERE t.pending = 0
        AND t.amount > 0
        AND ${whereRangeValue}
        AND t.user_id = ?
        ${accountFilterSqlValue}
      GROUP BY category
      ORDER BY total DESC;
    `;

    const userIdValue = req.user.userId;
    const rowsValue = await runQuery(sqlValue, [userIdValue]);

    res.json(
      rowsValue.map((rowValue) => ({
        category: String(rowValue.category),
        total: Number(rowValue.total),
      }))
    );
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/*GET /api/v1/dashboard/spending-trend?timeFrame=...*/  
app.get("/api/v1/dashboard/spending-over-time", requireAuth, async (req, res) => {
  try {
    const { hasAccountFilterValue, accountIdValue, accountFilterSqlValue, debugValue } =
    resolveAccountFilter(req, "t");

    const timeFrameValue = resolveTimeFrameKey(req);
    const whereRangeValue = getTimeFrameWhereClause(timeFrameValue);

    let groupingValue = "day";
    let labelSqlValue = "DATE(t.datetime_posted)";
    let orderSqlValue = "DATE(t.datetime_posted)";

    if (timeFrameValue === "ytd") {
      groupingValue = "month";
      labelSqlValue = "DATE_FORMAT(t.datetime_posted, '%Y-%m')";
      orderSqlValue = "DATE_FORMAT(t.datetime_posted, '%Y-%m')";
    }

    if (timeFrameValue === "all") {
      groupingValue = "year";
      labelSqlValue = "DATE_FORMAT(t.datetime_posted, '%Y')";
      orderSqlValue = "DATE_FORMAT(t.datetime_posted, '%Y')";
    }

    const userIdValue = req.user.userId;

    const lastTenYearsFilterValue =
      timeFrameValue === "all"
        ? "AND t.datetime_posted >= DATE_SUB(CURDATE(), INTERVAL 10 YEAR)"
        : "";

    const sqlValue = `
      SELECT
        ${labelSqlValue} AS label,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS spending,
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS income
      FROM plaid_transactions t
      JOIN plaid_accounts a ON t.account_id = a.id
      JOIN plaid_items i ON a.item_id = i.id
      WHERE t.pending = 0
        AND ${whereRangeValue}
        ${lastTenYearsFilterValue}
        AND t.user_id = ?
        ${accountFilterSqlValue}
      GROUP BY label
      ORDER BY ${orderSqlValue} ASC;
    `;

    const rowsValue = await runQuery(sqlValue, [userIdValue]);

    res.json({
      grouping: groupingValue,
      points: rowsValue.map((rowValue) => ({
        label:
          rowValue.label instanceof Date
            ? rowValue.label.toISOString().split("T")[0]
            : String(rowValue.label),
        spending: Number(rowValue.spending),
        income: Number(rowValue.income),
      })),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

app.get("/api/v1/accounts", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;

    const sqlValue = `
      SELECT
        id AS accountId,
        COALESCE(official_name, name, 'Account') AS name,
        mask,
        type,
        subtype
      FROM plaid_accounts
      WHERE user_id = ?
      ORDER BY name ASC;
    `;

    const rowsValue = await runQuery(sqlValue, [userIdValue]);

    res.json(
      rowsValue.map((rowValue) => ({
        accountId: Number(rowValue.accountId),
        name: String(rowValue.name),
        mask: rowValue.mask == null ? null : String(rowValue.mask),
        type: rowValue.type == null ? null : String(rowValue.type),
        subtype: rowValue.subtype == null ? null : String(rowValue.subtype),
      })),
    );
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

app.get("/api/v1/dashboard/net-worth", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;

    const sqlValue = `
      SELECT
        a.id AS accountId,
        COALESCE(a.official_name, a.name, 'Account') AS name,
        a.type AS type,
        a.subtype AS subtype,
        a.mask AS mask,
        COALESCE(a.account_balance) AS balance
      FROM plaid_accounts a
      WHERE a.user_id = ?
      ORDER BY name ASC;
    `;

    const paramsValue = [userIdValue];
   
    const rowsValue = await runQuery(sqlValue, userIdValue);

    const accountsValue = rowsValue.map((r) => {
      const typeValue = String(r.type || "").toLowerCase();
      const rawBalanceValue = Number(r.balance ?? 0);

      const isLiabilityValue = typeValue === "credit" || typeValue === "loan";
      const normalizedBalanceValue = Math.abs(rawBalanceValue);

      return {
        accountId: Number(r.accountId),
        name: String(r.name),
        mask: r.mask == null ? null : String(r.mask),
        type: r.type == null ? null : String(r.type),
        subtype: r.subtype == null ? null : String(r.subtype),
        balance: Number(normalizedBalanceValue.toFixed(2)),
        bucket: isLiabilityValue ? "liability" : "asset",
      };
    });

    const assetsTotal = accountsValue
      .filter((a) => a.bucket === "asset")
      .reduce((sum, a) => sum + a.balance, 0);

    const liabilitiesTotal = accountsValue
      .filter((a) => a.bucket === "liability")
      .reduce((sum, a) => sum + a.balance, 0);

    res.json({
      assetsTotal: Number(assetsTotal.toFixed(2)),
      liabilitiesTotal: Number(liabilitiesTotal.toFixed(2)),
      netWorth: Number((assetsTotal - liabilitiesTotal).toFixed(2)),
      accounts: accountsValue,
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

app.get("/api/v1/dashboard/budget-comparison", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;

    const budgetsSqlValue = `
      SELECT
        b.budget_id AS budgetId,
        b.name AS budgetName,
        b.period AS period
      FROM budgets b
      WHERE b.user_id = ?
        AND b.is_active = 1
      ORDER BY b.created_at DESC;
    `;

    const budgetsRowsValue = await runQuery(budgetsSqlValue, [userIdValue]);

    function getWindowPartsValue(periodRawValue) {
      const periodKeyValue = String(periodRawValue || "").toLowerCase().trim();

      if (periodKeyValue === "weekly") {
        return {
          labelValue: "This week",
          startExprValue: "DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)",
          endExprValue:
            "DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)",
        };
      }

      if (periodKeyValue === "biweekly") {
        return {
          labelValue: "Last 14 days",
          startExprValue: "DATE_SUB(NOW(), INTERVAL 14 DAY)",
          endExprValue: "NOW()",
        };
      }

      if (periodKeyValue === "yearly" || periodKeyValue === "annual") {
        return {
          labelValue: "Year-to-date",
          startExprValue: "DATE_FORMAT(CURDATE(), '%Y-01-01')",
          endExprValue: "DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-01-01'), INTERVAL 1 YEAR)",
        };
      }

      return {
        labelValue: "Month-to-date",
        startExprValue: "DATE_FORMAT(CURDATE(), '%Y-%m-01')",
        endExprValue: "DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)",
      };
    }

    const responseBudgetsValue = [];

    for (const budgetRowValue of budgetsRowsValue) {
      const budgetIdValue = Number(budgetRowValue.budgetId);
      const budgetNameValue = String(budgetRowValue.budgetName || "Budget");
      const periodValue = String(budgetRowValue.period || "monthly");
      const windowPartsValue = getWindowPartsValue(periodValue);

      const windowSqlValue = `
        SELECT
          ${windowPartsValue.startExprValue} AS windowStart,
          ${windowPartsValue.endExprValue} AS windowEnd;
      `;
      const windowRowsValue = await runQuery(windowSqlValue, []);
      const windowStartValue = String(windowRowsValue?.[0]?.windowStart ?? "");
      const windowEndValue = String(windowRowsValue?.[0]?.windowEnd ?? "");

      const itemsSqlValue = `
        SELECT
          bi.category_id AS categoryId,
          bc.display_name AS categoryName,
          bc.plaid_primary_category AS plaidPrimaryCategory,
          bi.amount AS budgetedAmount,
          COALESCE(s.spentAmount, 0) AS spentAmount
        FROM budget_items bi
        JOIN budget_categories bc
          ON bc.category_id = bi.category_id
        LEFT JOIN (
          SELECT
            normalized.primaryCategoryKey,
            SUM(normalized.spendAmount) AS spentAmount
          FROM (
            SELECT
             CASE
              WHEN pfc.primary_category = 'UTILITIES' THEN 'RENT_AND_UTILITIES'

              WHEN pfc.primary_category REGEXP '^[A-Z_]+$' THEN pfc.primary_category

              WHEN LOWER(TRIM(pfc.primary_category)) IN ('dining', 'groceries') THEN 'FOOD_AND_DRINK'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'gas' THEN 'TRANSPORTATION'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'shopping' THEN 'GENERAL_MERCHANDISE'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'utilities' THEN 'RENT_AND_UTILITIES'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'housing' THEN 'HOUSING'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'income' THEN 'INCOME'

              ELSE 'UNCATEGORIZED'
            END AS primaryCategoryKey,
              t.amount AS spendAmount
            FROM plaid_transactions t
            LEFT JOIN plaid_transaction_pfc pfc
              ON pfc.transaction_id = t.id
            WHERE t.user_id = ?
              AND t.pending = 0
              AND t.amount > 0
              AND t.datetime_posted >= ${windowPartsValue.startExprValue}
              AND t.datetime_posted < ${windowPartsValue.endExprValue}
          ) normalized
          GROUP BY normalized.primaryCategoryKey
        ) s
          ON s.primaryCategoryKey = bc.plaid_primary_category
        WHERE bi.budget_id = ?
        ORDER BY bi.amount DESC, bc.display_name ASC;
      `;

      const itemRowsValue = await runQuery(itemsSqlValue, [userIdValue, budgetIdValue]);

      const budgetCategoryKeysValue = itemRowsValue
        .map((rValue) => String(rValue.plaidPrimaryCategory || "UNCATEGORIZED"))
        .filter((kValue) => kValue.length > 0);

      // If the budget already has OTHER, we use its budgeted amount
      const otherRowFromBudgetValue =
        itemRowsValue.find((rValue) => String(rValue.plaidPrimaryCategory) === "OTHER") ?? null;

      const otherBudgetedAmountValue = otherRowFromBudgetValue
        ? Number(otherRowFromBudgetValue.budgetedAmount ?? 0)
        : 0;

      // When computing "Other spent", exclude OTHER from the budget category exclusion list,
      const excludeKeysForOtherValue = budgetCategoryKeysValue.filter((kValue) => kValue !== "OTHER");

      // NOT IN clause 
      const notInSqlValue =
        excludeKeysForOtherValue.length > 0
          ? `AND normalized.primaryCategoryKey NOT IN (${excludeKeysForOtherValue.map(() => "?").join(", ")})`
          : "";

      const otherSqlValue = `
        SELECT
          COALESCE(SUM(normalized.spendAmount), 0) AS otherSpentAmount
        FROM (
          SELECT
            CASE
              WHEN pfc.primary_category = 'UTILITIES' THEN 'RENT_AND_UTILITIES'

              WHEN pfc.primary_category REGEXP '^[A-Z_]+$' THEN pfc.primary_category

              WHEN LOWER(TRIM(pfc.primary_category)) IN ('dining', 'groceries') THEN 'FOOD_AND_DRINK'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'gas' THEN 'TRANSPORTATION'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'shopping' THEN 'GENERAL_MERCHANDISE'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'utilities' THEN 'RENT_AND_UTILITIES'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'housing' THEN 'HOUSING'
              WHEN LOWER(TRIM(pfc.primary_category)) = 'income' THEN 'INCOME'

              ELSE 'UNCATEGORIZED'
            END AS primaryCategoryKey,

            CASE
              WHEN t.amount > 0 THEN t.amount
              ELSE 0
            END AS spendAmount
          FROM plaid_transactions t
          LEFT JOIN plaid_transaction_pfc pfc
            ON pfc.transaction_id = t.id
          WHERE t.user_id = ?
            AND t.pending = 0
            AND t.datetime_posted >= ${windowPartsValue.startExprValue}
            AND t.datetime_posted < ${windowPartsValue.endExprValue}
        ) normalized
        WHERE normalized.spendAmount > 0
          AND normalized.primaryCategoryKey NOT IN ('INCOME', 'TRANSFER_IN')
          ${notInSqlValue};
      `;

      const otherParamsValue = [userIdValue, ...excludeKeysForOtherValue];
      const otherRowsValue = await runQuery(otherSqlValue, otherParamsValue);
      const otherSpentAmountValue = Number(otherRowsValue?.[0]?.otherSpentAmount ?? 0);

      // Only add “Other” if it matters: either it has spend, or the budget includes an OTHER line
      const shouldIncludeOtherValue = otherSpentAmountValue > 0 || Boolean(otherRowFromBudgetValue);

      if (shouldIncludeOtherValue) {
        // If the budget already has OTHER, avoid duplicating it:
        // remove the existing OTHER row (we’ll re-add with computed spent)
        const categoriesWithoutOtherValue = itemRowsValue.filter(
          (rValue) => String(rValue.plaidPrimaryCategory) !== "OTHER",
        );

        itemRowsValue.length = 0;
        itemRowsValue.push(...categoriesWithoutOtherValue);

        // push the synthetic/merged OTHER row
        itemRowsValue.push({
          categoryId: otherRowFromBudgetValue ? Number(otherRowFromBudgetValue.categoryId) : -1,
          categoryName: "Other",
          plaidPrimaryCategory: "OTHER",
          budgetedAmount: otherBudgetedAmountValue,
          spentAmount: otherSpentAmountValue,
        });
      }


      responseBudgetsValue.push({
        budgetId: budgetIdValue,
        name: budgetNameValue,
        period: periodValue,
        window: {
          label: windowPartsValue.labelValue,
          start: windowStartValue,
          end: windowEndValue,
        },
        categories: itemRowsValue.map((rValue) => ({
          categoryId: Number(rValue.categoryId),
          categoryName: String(rValue.categoryName || "Category"),
          plaidPrimaryCategory: String(rValue.plaidPrimaryCategory || "UNCATEGORIZED"),
          budgetedAmount: Number(rValue.budgetedAmount || 0),
          spentAmount: Number(rValue.spentAmount || 0),
        })),
      });
    }

    return res.json({ budgets: responseBudgetsValue });
  } catch (errValue) {
    return res.status(500).json({ error: String(errValue) });
  }
});

//Budget Page Routes:
/**
 * GET /api/v1/budgets
 * Lists all budgets for the current user.
 */
app.get("/api/v1/budgets", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;

    const sqlValue = `
      SELECT
        b.budget_id AS budgetId,
        b.name,
        b.period,
        b.created_at AS createdAt,
        b.is_active AS isActive
      FROM budgets b
      WHERE b.user_id = ?
        AND b.is_active = 1
      ORDER BY b.created_at DESC;
    `;

    const rowsValue = await runQuery(sqlValue, [userIdValue]);

    res.json({
      budgets: rowsValue.map((r) => ({
        budgetId: Number(r.budgetId),
        name: String(r.name || "Budget"),
        period: String(r.period || "monthly").toLowerCase(),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        isActive: Number(r.isActive) ? 1 : 0,
      })),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * GET /api/v1/budgets/inactive
 * Lists inactive budgets (soft-deleted / archived).
 */
app.get("/api/v1/budgets/inactive", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;

    const sqlValue = `
      SELECT
        b.budget_id AS budgetId,
        b.name,
        b.period,
        b.created_at AS createdAt,
        b.is_active AS isActive
      FROM budgets b
      WHERE b.user_id = ?
        AND b.is_active = 0
      ORDER BY b.updated_at DESC, b.created_at DESC;
    `;

    const rowsValue = await runQuery(sqlValue, [userIdValue]);

    res.json({
      budgets: rowsValue.map((r) => ({
        budgetId: Number(r.budgetId),
        name: String(r.name || "Budget"),
        period: String(r.period || "monthly").toLowerCase(),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        isActive: 0,
      })),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * POST /api/v1/budgets/:budgetId/restore
 * Restores a soft-deleted budget.
 */
app.post("/api/v1/budgets/:budgetId/restore", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;
    const budgetIdValue = Number(req.params.budgetId);

    const sqlValue = `
      UPDATE budgets
      SET is_active = 1, updated_at = NOW()
      WHERE budget_id = ? AND user_id = ?;
    `;

    const resultValue = await runQuery(sqlValue, [budgetIdValue, userIdValue]);

    if (resultValue?.affectedRows === 0) return res.status(404).json({ error: "Budget not found" });

    res.json({ ok: true });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});


/**
 * GET /api/v1/budgets/categories
 * Provides dropdown options from budget_categories.
 */
app.get("/api/v1/budgets/categories", requireAuth, async (req, res) => {
  try {
    const sqlValue = `
      SELECT
        bc.category_id AS categoryId,
        bc.display_name AS displayName,
        bc.plaid_primary_category AS plaidPrimaryCategory
      FROM budget_categories bc
      ORDER BY bc.display_name ASC;
    `;
    const rowsValue = await runQuery(sqlValue, []);

    res.json({
      categories: rowsValue.map((r) => ({
        categoryId: Number(r.categoryId),
        displayName: String(r.displayName || "Category"),
        plaidPrimaryCategory: String(r.plaidPrimaryCategory || "UNCATEGORIZED"),
      })),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * POST /api/v1/budgets
 * Body: { name, period, incomeAmount?, items: [{ categoryId, amount }] }
 * Inserts budgets row + budget_items rows.
 */
app.post("/api/v1/budgets", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;

    const nameValue = String(req.body?.name || "").trim();
    const periodValue = String(req.body?.period || "monthly").trim().toLowerCase();
    const incomeAmountValue = req.body?.incomeAmount == null ? null : Number(req.body.incomeAmount);

    const itemsValue = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!nameValue) return res.status(400).json({ error: "Budget name required" });
    if (!["weekly", "biweekly", "monthly", "yearly"].includes(periodValue)) {
      return res.status(400).json({ error: "Invalid period" });
    }

    if (!itemsValue.length) return res.status(400).json({ error: "At least one category row required" });

    // Insert budgets row
    const insertBudgetSqlValue = `
      INSERT INTO budgets (user_id, name, period, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, NOW(), NOW());
    `;
    const insertBudgetResValue = await runQuery(insertBudgetSqlValue, [userIdValue, nameValue, periodValue]);
    const budgetIdValue = Number(insertBudgetResValue.insertId);

    // Insert budget_items
    const insertItemSqlValue = `
      INSERT INTO budget_items (budget_id, category_id, amount, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW());
    `;

    for (const rowValue of itemsValue) {
      const categoryIdValue = Number(rowValue.categoryId);
      const amountValue = Number(rowValue.amount);

      if (!Number.isFinite(categoryIdValue) || categoryIdValue <= 0) continue;
      if (!Number.isFinite(amountValue) || amountValue < 0) continue;

      await runQuery(insertItemSqlValue, [budgetIdValue, categoryIdValue, Number(amountValue.toFixed(2))]);
    }

    // NOTE: incomeAmount is not stored unless you add a column.
    // Keep it in the payload so the UI can evolve without breaking.
    res.status(201).json({ ok: true, budgetId: budgetIdValue });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * GET /api/v1/budgets/:budgetId
 * Returns current period category status + transactions grouped per category.
 * Includes synthetic "Other" spending like you requested earlier.
 */
app.get("/api/v1/budgets/:budgetId", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;
    const budgetIdValue = Number(req.params.budgetId);

    if (!Number.isFinite(budgetIdValue)) {
      return res.status(400).json({ error: "Invalid budgetId" });
    }

    // Fetch budget header
    const budgetSqlValue = `
      SELECT budget_id AS budgetId, name, period
      FROM budgets
      WHERE budget_id = ? AND user_id = ?
      LIMIT 1;
    `;
    const budgetRowsValue = await runQuery(budgetSqlValue, [budgetIdValue, userIdValue]);

    if (!budgetRowsValue.length) {
      return res.status(404).json({ error: "Budget not found" });
    }

    const budgetRowValue = budgetRowsValue[0];
    const periodValue = String(budgetRowValue.period || "monthly").toLowerCase();
    const nameValue = String(budgetRowValue.name || "Budget");

    // Current window
    const windowMetaValue = getBudgetWindowDates(periodValue, 0);

    // Pull budget items + spent by matching normalized category keys
    const itemsSqlValue = `
      SELECT
        bi.category_id AS categoryId,
        bc.display_name AS categoryName,
        bc.plaid_primary_category AS plaidPrimaryCategory,
        bi.amount AS budgetedAmount
      FROM budget_items bi
      JOIN budget_categories bc ON bc.category_id = bi.category_id
      WHERE bi.budget_id = ?
      ORDER BY bi.amount DESC, bc.display_name ASC;
    `;
    const itemRowsValue = await runQuery(itemsSqlValue, [budgetIdValue]);

    const budgetCategoryKeysValue = itemRowsValue
      .map((r) => String(r.plaidPrimaryCategory || "UNCATEGORIZED"))
      .filter((k) => k.length > 0);

    const excludeKeysForOtherValue = budgetCategoryKeysValue.filter((k) => k !== "OTHER");

    // Pull all spending txns in window (we’ll group in JS for flexibility)
    const txnSqlValue = `
      SELECT
        t.id AS transactionId,
        DATE(t.datetime_posted) AS date,
        COALESCE(t.merchant_name, t.name_legacy) AS name,
        COALESCE(pfc.primary_category, 'UNCATEGORIZED') AS rawCategory,
        t.amount AS amount
      FROM plaid_transactions t
      LEFT JOIN plaid_transaction_pfc pfc ON pfc.transaction_id = t.id
      WHERE t.user_id = ?
        AND t.pending = 0
        AND t.amount > 0
        AND t.datetime_posted >= ?
        AND t.datetime_posted < ?
      ORDER BY t.datetime_posted DESC;
    `;
    const txnRowsValue = await runQuery(txnSqlValue, [userIdValue, windowMetaValue.windowStartValue, windowMetaValue.windowEndValue]);

    // Group spending by normalized key
    const spentByKeyValue = {};
    const txnsByKeyValue = {};

    for (const t of txnRowsValue) {
      const keyValue = normalizePrimaryCategoryKey(t.rawCategory);
      const amountValue = Number(t.amount || 0);

      spentByKeyValue[keyValue] = (spentByKeyValue[keyValue] || 0) + amountValue;

      if (!txnsByKeyValue[keyValue]) txnsByKeyValue[keyValue] = [];
      txnsByKeyValue[keyValue].push({
        transactionId: String(t.transactionId),
        date: t.date instanceof Date ? t.date.toISOString().split("T")[0] : String(t.date),
        name: String(t.name || ""),
        categoryKey: keyValue,
        amount: Number(amountValue.toFixed(2)),
      });
    }

    // Build category status list
    const categoriesValue = itemRowsValue.map((r) => {
      const keyValue = String(r.plaidPrimaryCategory || "UNCATEGORIZED");
      const spentValue = Number(spentByKeyValue[keyValue] || 0);
      const budgetedValue = Number(r.budgetedAmount || 0);
      const remainingValue = Number((budgetedValue - spentValue).toFixed(2));

      return {
        categoryId: Number(r.categoryId),
        categoryName: String(r.categoryName || "Category"),
        plaidPrimaryCategory: keyValue,
        budgetedAmount: Number(budgetedValue.toFixed(2)),
        spentAmount: Number(spentValue.toFixed(2)),
        remainingAmount: remainingValue,
        isOver: budgetedValue > 0 ? spentValue > budgetedValue : spentValue > 0,
      };
    });

    // Synthetic/merged OTHER logic
    const hasOtherLineValue = categoriesValue.some((c) => c.plaidPrimaryCategory === "OTHER");
    const otherBudgetedAmountValue = hasOtherLineValue
      ? Number(categoriesValue.find((c) => c.plaidPrimaryCategory === "OTHER")?.budgetedAmount || 0)
      : 0;

    let otherSpentAmountValue = 0;

    for (const key of Object.keys(spentByKeyValue)) {
      if (key === "INCOME" || key === "TRANSFER_IN") continue;
      if (excludeKeysForOtherValue.includes(key)) continue;
      otherSpentAmountValue += Number(spentByKeyValue[key] || 0);
    }

    const shouldIncludeOtherValue = otherSpentAmountValue > 0 || hasOtherLineValue;

    if (shouldIncludeOtherValue) {
      // Remove existing OTHER so we don’t duplicate
      const filteredValue = categoriesValue.filter((c) => c.plaidPrimaryCategory !== "OTHER");
      categoriesValue.length = 0;
      categoriesValue.push(...filteredValue);

      categoriesValue.push({
        categoryId: hasOtherLineValue ? Number(itemRowsValue.find((x) => String(x.plaidPrimaryCategory) === "OTHER")?.categoryId || -1) : -1,
        categoryName: "Other",
        plaidPrimaryCategory: "OTHER",
        budgetedAmount: Number(otherBudgetedAmountValue.toFixed(2)),
        spentAmount: Number(otherSpentAmountValue.toFixed(2)),
        remainingAmount: Number((otherBudgetedAmountValue - otherSpentAmountValue).toFixed(2)),
        isOver: otherBudgetedAmountValue > 0 ? otherSpentAmountValue > otherBudgetedAmountValue : otherSpentAmountValue > 0,
      });

      // Move “other” txns into OTHER bucket for UI
      const otherTxnsValue = [];
      for (const key of Object.keys(txnsByKeyValue)) {
        if (key === "INCOME" || key === "TRANSFER_IN") continue;
        if (excludeKeysForOtherValue.includes(key)) continue;
        otherTxnsValue.push(...(txnsByKeyValue[key] || []));
        delete txnsByKeyValue[key];
      }
      txnsByKeyValue["OTHER"] = otherTxnsValue;
    }

    const budgetedTotalValue = categoriesValue.reduce((s, c) => s + Number(c.budgetedAmount || 0), 0);
    const spentTotalValue = categoriesValue.reduce((s, c) => s + Number(c.spentAmount || 0), 0);
    const remainingTotalValue = Number((budgetedTotalValue - spentTotalValue).toFixed(2));
    const percentUsedValue = budgetedTotalValue > 0 ? Number(((spentTotalValue / budgetedTotalValue) * 100).toFixed(2)) : 0;

    const overCategoriesValue = categoriesValue.filter((c) => c.isOver);

    res.json({
      budgetId: budgetIdValue,
      name: nameValue,
      period: periodValue,
      window: {
        label: "Current period",
        start: windowMetaValue.windowStartValue.slice(0, 10),
        end: windowMetaValue.windowEndValue.slice(0, 10),
      },
      totals: {
        budgetedTotal: Number(budgetedTotalValue.toFixed(2)),
        spentTotal: Number(spentTotalValue.toFixed(2)),
        remainingTotal: remainingTotalValue,
        percentUsed: percentUsedValue,
      },
      categories: categoriesValue,
      overCategories: overCategoriesValue,
      transactionsByCategory: txnsByKeyValue,
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * GET /api/v1/budgets/:budgetId/history?limit=6
 * Returns last N windows totals for “how well you followed the budget”.
 */
app.get("/api/v1/budgets/:budgetId/history", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;
    const budgetIdValue = Number(req.params.budgetId);
    const limitRawValue = Number(req.query.limit || 6);
    const limitValue = Number.isFinite(limitRawValue) ? Math.max(1, Math.min(24, limitRawValue)) : 6;

    const budgetSqlValue = `
      SELECT budget_id AS budgetId, period
      FROM budgets
      WHERE budget_id = ? AND user_id = ?
      LIMIT 1;
    `;
    const budgetRowsValue = await runQuery(budgetSqlValue, [budgetIdValue, userIdValue]);
    if (!budgetRowsValue.length) return res.status(404).json({ error: "Budget not found" });

    const periodValue = String(budgetRowsValue[0].period || "monthly").toLowerCase();

    // Pre-fetch budgeted total once (history is totals-only)
    const budgetedSqlValue = `
      SELECT COALESCE(SUM(amount), 0) AS budgetedTotal
      FROM budget_items
      WHERE budget_id = ?;
    `;
    const budgetedRowsValue = await runQuery(budgetedSqlValue, [budgetIdValue]);
    const budgetedTotalValue = Number(budgetedRowsValue?.[0]?.budgetedTotal || 0);

    const pointsValue = [];

    for (let i = 0; i < limitValue; i++) {
      const w = getBudgetWindowDates(periodValue, i);

      // Compute spent total for window (all spending, we’ll compare to budgeted total)
      const spentSqlValue = `
        SELECT COALESCE(SUM(t.amount), 0) AS spentTotal
        FROM plaid_transactions t
        WHERE t.user_id = ?
          AND t.pending = 0
          AND t.amount > 0
          AND t.datetime_posted >= ?
          AND t.datetime_posted < ?;
      `;
      const spentRowsValue = await runQuery(spentSqlValue, [userIdValue, w.windowStartValue, w.windowEndValue]);
      const spentTotalValue = Number(spentRowsValue?.[0]?.spentTotal || 0);

      const remainingTotalValue = Number((budgetedTotalValue - spentTotalValue).toFixed(2));
      const percentUsedValue = budgetedTotalValue > 0 ? Number(((spentTotalValue / budgetedTotalValue) * 100).toFixed(2)) : 0;

      pointsValue.push({
        windowStart: w.windowStartValue.slice(0, 10),
        windowEnd: w.windowEndValue.slice(0, 10),
        label: w.labelValue,
        budgetedTotal: Number(budgetedTotalValue.toFixed(2)),
        spentTotal: Number(spentTotalValue.toFixed(2)),
        remainingTotal: remainingTotalValue,
        percentUsed: percentUsedValue,
      });
    }

    res.json({
      budgetId: budgetIdValue,
      period: periodValue,
      points: pointsValue,
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * GET /api/v1/budgets/:budgetId/edit
 * - Returns budget header + item rows for editing
 */
app.get("/api/v1/budgets/:budgetId/edit", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;
    const budgetIdValue = Number(req.params.budgetId);

    const headerSqlValue = `
      SELECT budget_id AS budgetId, name, period, is_active AS isActive
      FROM budgets
      WHERE budget_id = ? AND user_id = ?
      LIMIT 1;
    `;
    const headerRowsValue = await runQuery(headerSqlValue, [budgetIdValue, userIdValue]);
    if (!headerRowsValue.length) return res.status(404).json({ error: "Budget not found" });

    const itemsSqlValue = `
      SELECT
        bi.category_id AS categoryId,
        bc.display_name AS categoryName,
        bc.plaid_primary_category AS plaidPrimaryCategory,
        bi.amount AS amount
      FROM budget_items bi
      JOIN budget_categories bc ON bc.category_id = bi.category_id
      WHERE bi.budget_id = ?
      ORDER BY bc.display_name ASC;
    `;
    const itemRowsValue = await runQuery(itemsSqlValue, [budgetIdValue]);

    res.json({
      budget: {
        budgetId: Number(headerRowsValue[0].budgetId),
        name: String(headerRowsValue[0].name || ""),
        period: String(headerRowsValue[0].period || "monthly").toLowerCase(),
        isActive: Number(headerRowsValue[0].isActive) ? 1 : 0,
      },
      items: itemRowsValue.map((r) => ({
        categoryId: Number(r.categoryId),
        categoryName: String(r.categoryName || ""),
        plaidPrimaryCategory: String(r.plaidPrimaryCategory || ""),
        amount: Number(Number(r.amount || 0).toFixed(2)),
      })),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * PUT /api/v1/budgets/:budgetId
 * Body: { name, period, isActive, items: [{ categoryId, amount }] }
 * - Updates budgets header
 * - Replaces all budget_items for that budget
 */
app.put("/api/v1/budgets/:budgetId", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;
    const budgetIdValue = Number(req.params.budgetId);

    const nameValue = String(req.body?.name || "").trim();
    const periodValue = String(req.body?.period || "monthly").trim().toLowerCase();
    const isActiveValue = Number(req.body?.isActive ?? 1) ? 1 : 0;
    const itemsValue = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!nameValue) return res.status(400).json({ error: "Budget name required" });
    if (!["weekly", "biweekly", "monthly", "yearly"].includes(periodValue)) {
      return res.status(400).json({ error: "Invalid period" });
    }
    if (!itemsValue.length) return res.status(400).json({ error: "At least one category row required" });

    // Ensure budget belongs to user
    const existsSqlValue = `SELECT budget_id FROM budgets WHERE budget_id = ? AND user_id = ? LIMIT 1;`;
    const existsRowsValue = await runQuery(existsSqlValue, [budgetIdValue, userIdValue]);
    if (!existsRowsValue.length) return res.status(404).json({ error: "Budget not found" });

    // Update header
    const updateSqlValue = `
      UPDATE budgets
      SET name = ?, period = ?, is_active = ?, updated_at = NOW()
      WHERE budget_id = ? AND user_id = ?;
    `;
    await runQuery(updateSqlValue, [nameValue, periodValue, isActiveValue, budgetIdValue, userIdValue]);

    // Replace items (simple + reliable)
    const deleteItemsSqlValue = `DELETE FROM budget_items WHERE budget_id = ?;`;
    await runQuery(deleteItemsSqlValue, [budgetIdValue]);

    const insertItemSqlValue = `
      INSERT INTO budget_items (budget_id, category_id, amount, created_at, updated_at)
      VALUES (?, ?, ?, NOW(), NOW());
    `;

    const seenCategoryIdsValue = new Set();
    for (const rowValue of itemsValue) {
      const categoryIdValue = Number(rowValue.categoryId);
      const amountValue = Number(rowValue.amount);

      if (!Number.isFinite(categoryIdValue) || categoryIdValue <= 0) continue;
      if (!Number.isFinite(amountValue) || amountValue < 0) continue;
      if (seenCategoryIdsValue.has(categoryIdValue)) continue;

      seenCategoryIdsValue.add(categoryIdValue);
      await runQuery(insertItemSqlValue, [budgetIdValue, categoryIdValue, Number(amountValue.toFixed(2))]);
    }

    res.json({ ok: true });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

/**
 * DELETE /api/v1/budgets/:budgetId
 * - Soft delete: sets is_active = 0
 */
app.delete("/api/v1/budgets/:budgetId", requireAuth, async (req, res) => {
  try {
    const userIdValue = req.user.userId;
    const budgetIdValue = Number(req.params.budgetId);

    const sqlValue = `
      UPDATE budgets
      SET is_active = 0, updated_at = NOW()
      WHERE budget_id = ? AND user_id = ?;
    `;
    const resultValue = await runQuery(sqlValue, [budgetIdValue, userIdValue]);

    // If your runQuery returns affectedRows, keep this check; otherwise safe to remove
    if (resultValue?.affectedRows === 0) return res.status(404).json({ error: "Budget not found" });

    res.json({ ok: true });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});

//Localhosting call
app.listen(portValue, () => console.log(`✅ API on http://localhost:${portValue}`));