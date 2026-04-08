import React from "react";
import ReactDOM from "react-dom/client";
import Register from "../Register/Register";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Register />
  </React.StrictMode>
);
