import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles'
import { BrowserRouter } from 'react-router-dom'

import { Sidebar } from 'Components/Sidebar'
import { NavBar } from 'Components/NavBar'
import { OverlayMessages } from 'Components/OverlayMessages'
import { UserModal } from 'Components/Profile'
import { AppRoutes } from 'Components/Routing'
import theme from 'Style/theme'
import { UiStateProvider, UserStateProvider } from 'Components/State'
import { MapProvider, GroupOrientation } from 'Components/Map'

const App = () => {
  return (
    <BrowserRouter>
      <StyledEngineProvider injectFirst>
        <ThemeProvider theme={theme}>
          <UiStateProvider>
            <MapProvider>
              <UserStateProvider>
                {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
                <CssBaseline>
                  <GroupOrientation />
                  <NavBar />
                  <OverlayMessages />
                  <Sidebar>
                    <AppRoutes />
                  </Sidebar>
                  <UserModal />
                </CssBaseline>
              </UserStateProvider>
            </MapProvider>
          </UiStateProvider>
        </ThemeProvider>
      </StyledEngineProvider>
    </BrowserRouter>
  )
}

export default App
