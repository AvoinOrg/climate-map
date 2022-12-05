'use client'

import '#/style/index.css'
import '#/style/mapbox.css'

import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

import theme from '#/style/theme'
import { Sidebar } from '#/components/Sidebar'
import { NavBar } from '#/components/NavBar'
import { OverlayMessages } from '#/components/OverlayMessages'
// import { UserModal } from '#/components/Profile'
// import { UiStateProvider, UserStateProvider } from '#/components/State'
import { UiStateProvider } from '#/components/State'
import { MapProvider, GroupOrientation } from '#/components/Map'
// import RootStyleRegistry from './emotion'

const RootLayout = ({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={theme}>
          <UiStateProvider>
            <MapProvider>
              {/* <UserStateProvider> */}
              <CssBaseline>
                <GroupOrientation />
                <NavBar />
                <OverlayMessages />
                <Sidebar>{children}</Sidebar>
                {/* <UserModal /> */}
              </CssBaseline>
              {/* </UserStateProvider> */}
            </MapProvider>
          </UiStateProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default RootLayout
