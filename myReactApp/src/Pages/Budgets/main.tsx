import React from "react";
import ReactDOM from "react-dom/client";
import "../../Styles/index.css";
import {system} from "../../Styles/theme"
import { ChakraProvider } from "@chakra-ui/react";
import Budgets from "./Budgets";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <Budgets />
    </ChakraProvider>
  </React.StrictMode>
);
