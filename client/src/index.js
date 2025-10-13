import { App as AntdApp } from "antd";
import "antd/dist/reset.css"; // Ant Design v5 recommended reset
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import GoogleLoginOnly from "./components/GoogleLogin";
import { AppProvider } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AntdApp>
        <AppProvider>
          <Toaster position="top-right" />
          <GoogleLoginOnly>
            <App />
          </GoogleLoginOnly>
        </AppProvider>
      </AntdApp>
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
