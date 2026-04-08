//How the Dashboard is initialized from Dashboard.html
import React from "react";
import ReactDOM from "react-dom/client";
import "../../Styles/Dashboard.css";
import Dashboard from "./Dashboard";
import {system} from "../../Styles/theme"
import { ChakraProvider } from "@chakra-ui/react";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <Dashboard />
    </ChakraProvider>
  </React.StrictMode>
);
