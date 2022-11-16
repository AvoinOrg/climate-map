import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles'

import { Sidebar } from '#/components/Sidebar'
import { NavBar } from '#/components/NavBar'
import { OverlayMessages } from '#/components/OverlayMessages'
import { UserModal } from '#/components/Profile'
import { AppRoutes } from '#/components/Routing'
import theme from 'Style/theme'
import { UiStateProvider, UserStateProvider } from '#/components/State'
import { MapProvider, GroupOrientation } from '#/components/Map'

const App = () => {
  return (
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
  )
}

export default App
