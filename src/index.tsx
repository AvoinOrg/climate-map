import React from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, Theme, StyledEngineProvider } from '@mui/material/styles'

import './style/index.css'
import AppRouterSwitch from './AppRouterSwitch'

import theme from './style/theme'

// import * as serviceWorker from "./serviceWorker";
import { UiStateProvider, UserStateProvider } from './components/State'
import { MapProvider } from './components/Map/Map'

declare module '@mui/styles/defaultTheme' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <StyledEngineProvider injectFirst>
    <ThemeProvider theme={theme}>
      <UiStateProvider>
        <MapProvider>
          <UserStateProvider>
            {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
            <CssBaseline />
            <AppRouterSwitch />
          </UserStateProvider>
        </MapProvider>
      </UiStateProvider>
    </ThemeProvider>
  </StyledEngineProvider>
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
