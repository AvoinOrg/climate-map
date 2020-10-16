import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/core/styles";

import "./index.css";
import AppRouterSwitch from "./AppRouterSwitch";
import "./map";

import theme from "./ui/theme";

import * as serviceWorker from "./serviceWorker";
import { AuthProvider } from "./components/Auth";
import { StateProvider } from "./components/State";

ReactDOM.render(
  <ThemeProvider theme={theme}>
    <AuthProvider>
      <StateProvider>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <AppRouterSwitch />
      </StateProvider>
    </AuthProvider>
  </ThemeProvider>,
  document.querySelector("#root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
