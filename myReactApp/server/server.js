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

/**
 * GET /api/v1/dashboard/summary?timeFrame=mtd|last7|last30|ytd|all
 */
app.get("/api/v1/dashboard/summary", requireAuth, async (req, res) => {
  try {
    const timeFrameValue = resolveTimeFrameKey(req);
    const whereRangeValue = getTimeFrameWhereClause(timeFrameValue);
    //const userIdValue  = 1;

    const sqlValue = `
      SELECT
        COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) AS incomeTotal,
        COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS spendingTotal
      FROM plaid_transactions t
      JOIN plaid_accounts a ON t.account_id = a.id
      JOIN plaid_items i ON a.item_id = i.id
      WHERE t.user_id = ?
        AND t.pending = 0
        AND ${whereRangeValue};
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
        COALESCE(SUM(t.amount), 0) AS amount
      FROM plaid_transactions t
      JOIN plaid_accounts a ON t.account_id = a.id
      JOIN plaid_items i ON a.item_id = i.id
      WHERE t.pending = 0
        AND t.amount > 0
        AND ${whereRangeValue}
        ${lastTenYearsFilterValue}
        AND t.user_id = ?
      GROUP BY label
      ORDER BY ${orderSqlValue} ASC;
    `;

    const rowsValue = await runQuery(sqlValue, [userIdValue]);

    res.json({
      grouping: groupingValue,
      points: rowsValue.map((rowValue) => ({
        label: String(rowValue.label instanceof Date
          ? rowValue.label.toISOString().split("T")[0]
          : String(rowValue.label),),
        amount: Number(rowValue.amount),
      })),
    });
  } catch (errValue) {
    res.status(500).json({ error: String(errValue) });
  }
});



app.get("/api/auth/me", requireAuth, async (req, res) => {
  return res.json({ user: req.user });
});

app.listen(portValue, () => console.log(`✅ API on http://localhost:${portValue}`));
