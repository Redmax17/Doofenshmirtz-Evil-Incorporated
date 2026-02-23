import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "Dashboard.html"),
        budgets: resolve(__dirname, "Budgets.html"),
        analytics: resolve(__dirname, "Analytics.html"),
        accounts: resolve(__dirname, "Accounts.html"),
        transactions: resolve(__dirname, "Transactions.html"),
      },
    },
  },
});
