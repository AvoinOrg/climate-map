import React from 'react'
import ReactDOM from 'react-dom'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, Theme, StyledEngineProvider } from '@mui/material/styles';

import './index.css'
import AppRouterSwitch from './AppRouterSwitch'
import './map'

import theme from './ui/theme'

// import * as serviceWorker from "./serviceWorker";
import { UserProvider } from './components/User'
import { StateProvider } from './components/State'
import { MapProvider } from './components/Map/Map'


declare module '@mui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}


ReactDOM.render(
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <StateProvider>
        <MapProvider zoom={12} center={[60, 50]}>
          <UserProvider>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline />
            <AppRouterSwitch />
          </UserProvider>
        </MapProvider>
      </StateProvider>
    </ThemeProvider>
  </StyledEngineProvider>,
  document.querySelector('#root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
