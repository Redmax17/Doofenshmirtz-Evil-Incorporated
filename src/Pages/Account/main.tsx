// How the Account Settings page is initalized from Account.html
import React from "react";
import ReactDOM from "react-dom/client";
import "../../Styles/Dashboard.css";
import Account from "./Account";
import { system } from "../../Styles/theme";
import { ChakraProvider } from "@chakra-ui/react";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <Account />
    </ChakraProvider>
  </React.StrictMode>
);
