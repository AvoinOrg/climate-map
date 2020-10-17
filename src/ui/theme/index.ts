import { createMuiTheme } from "@material-ui/core/styles";

declare module "@material-ui/core/styles/createMuiTheme" {
  interface ThemeOptions {
    themeName?: string; // optional
  }
}

const palette = {
  primary: { main: "#fbfbfb", contrastText: "#282c34" },
  secondary: { main: "#126A42", contrastText: "#fbfbfb" },
};

const zIndex = {
  modal: 1200,
  snackbar: 1400,
  drawer: 1100,
  appBar: 1300,
  mobileStepper: 1000,
  tooltip: 1500,
};

const themeName = "Avoin Green and White";

export default createMuiTheme({ palette, zIndex, themeName });
