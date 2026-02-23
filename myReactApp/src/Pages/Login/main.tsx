import React from "react";
import ReactDOM from "react-dom/client";
import "../../index.css";
import Login from "./Login";
import Register from "./Register";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element (#root) not found. Check your HTML file.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Login />
    <Register />
  </React.StrictMode>
);
