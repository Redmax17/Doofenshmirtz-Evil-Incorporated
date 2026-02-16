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

//Auth Definitions
function signToken(userIdValue, emailValue) {
  return jwt.sign(
    { userId: userIdValue, email: emailValue },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

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

app.get("/api/auth/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
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
      WHERE b.user_id = ${userIdValue}
        AND b.is_active = 1
      ORDER BY b.created_at DESC;
    `;

    const budgetsRowsValue = await runQuery(budgetsSqlValue, [userIdValue]);

    function getWindowPartsValue(periodRawValue) {
      const periodKeyValue = String(periodRawValue || "").toLowerCase().trim();

      // start + end are MySQL expressions (end is exclusive)
      if (periodKeyValue === "weekly") {
        return {
          labelValue: "This week",
          startExprValue: "DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY)",
          endExprValue:
            "DATE_ADD(DATE_SUB(NOW(), INTERVAL WEEKDAY(NOW()) DAY), INTERVAL 7 DAY)",
        };
      }

      else if (periodKeyValue === "biweekly") {
        return {
          labelValue: "Last 14 days",
          startExprValue: "DATE_SUB(NOW(), INTERVAL 14 DAY)",
          endExprValue: "NOW()",
        };
      }

      else if (periodKeyValue === "yearly" || periodKeyValue === "annual") {
        return {
          labelValue: "Year-to-date",
          startExprValue: "DATE_FORMAT(NOW(), '%Y-01-01')",
          endExprValue: "DATE_ADD(DATE_FORMAT(NOW(), '%Y-01-01'), INTERVAL 1 YEAR)",
        };
      }

      // default: monthly
      return {
        labelValue: "Month-to-date",
        startExprValue: "DATE_FORMAT(NOW(), '%Y-%m-01')",
        endExprValue: "DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH)",
      };
    }

    const responseBudgetsValue = [];

    for (const budgetRowValue of budgetsRowsValue) {
      const budgetIdValue = Number(budgetRowValue.budgetId);
      const budgetNameValue = String(budgetRowValue.budgetName || "Budget");
      const periodValue = String(budgetRowValue.period || "monthly");

      const windowPartsValue = getWindowPartsValue(periodValue);

      // Pull the computed window strings from MySQL so frontend displays the *exact* window being queried
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
                /* if it's already a canonical enum, keep it */
                WHEN pfc.primary_category REGEXP '^[A-Z_]+$' THEN pfc.primary_category

                /* friendly -> canonical mappings */
                WHEN LOWER(TRIM(pfc.primary_category)) = 'dining' OR 'groceries' THEN 'FOOD_AND_DRINK'
                WHEN LOWER(TRIM(pfc.primary_category)) = 'gas' THEN 'TRANSPORTATION'
                WHEN LOWER(TRIM(pfc.primary_category)) = 'shopping' THEN 'GENERAL_MERCHANDISE'
                WHEN LOWER(TRIM(pfc.primary_category)) = 'utilities' THEN 'HOUSING'
                WHEN LOWER(TRIM(pfc.primary_category)) = 'income' THEN 'INCOME'

                /* fallback */
                ELSE 'UNCATEGORIZED'
              END AS primaryCategoryKey,
              ABS(t.amount) AS spendAmount
            FROM plaid_transactions t
            LEFT JOIN plaid_transaction_pfc pfc
              ON pfc.transaction_id = t.id
            WHERE t.user_id = ${userIdValue}
              AND t.pending = 0
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
          plaidPrimaryCategory: String(rValue.plaidPrimaryCategory || "Uncategorized"),
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

app.listen(portValue, () => console.log(`✅ API on http://localhost:${portValue}`));
