//DEV ENV MY SQL WORKBENCH DB CONNECTIOM
//Temporary and will be replaced with live DB at some point

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

export async function runQuery(sqlValue, paramsValue = []) {
  const [rowsValue] = await dbPool.query(sqlValue, paramsValue);
  return rowsValue;
}

export async function getTableColumns(tableNameValue) {
  const sqlValue = `
    SELECT COLUMN_NAME AS columnName
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
  `;
  const rowsValue = await runQuery(sqlValue, [process.env.DB_NAME, tableNameValue]);
  return rowsValue.map((r) => String(r.columnName));
}
