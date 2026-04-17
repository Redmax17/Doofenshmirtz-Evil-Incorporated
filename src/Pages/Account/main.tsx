import React from "react";
import ReactDOM from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../../Styles/theme";
import "../../Styles/index.css";
import Account from "./Account";

const rootElementValue = document.getElementById("root");

if (!rootElementValue) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElementValue).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <Account />
    </ChakraProvider>
  </React.StrictMode>,
);
