import React from "react";
import ReactDOM from "react-dom/client";
import "../../Styles/index.css";
import Landing from "./Landing";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Landing />
  </React.StrictMode>
);
