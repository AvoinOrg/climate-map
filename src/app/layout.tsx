'use client'

import '#/style/index.css'
import '#/style/mapbox.css'

import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
// import { Raleway } from '@next/font/google'
import createEmotionCache from '../utils/createEmotionCache'
import { CacheProvider } from '@emotion/react'

import { Sidebar } from '#/components/Sidebar'
import { NavBar } from '#/components/NavBar'
import { OverlayMessages } from '#/components/OverlayMessages'
import { UserModal } from '#/components/Profile'
import theme from '#/style/theme'
import { UiStateProvider, UserStateProvider } from '#/components/State'
import { MapProvider, GroupOrientation } from '#/components/Map'

// const raleway = Raleway({
//   weight: ['400', '500'],
//   subsets: ['latin'],
// })

const cache = createEmotionCache()

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
        {/* <main className={raleway.className}> */}
          <CacheProvider value={cache}>
            <ThemeProvider theme={theme}>
              <UiStateProvider>
                <MapProvider>
                  <UserStateProvider>
                    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
                    <CssBaseline>
                      <GroupOrientation />
                      <NavBar />
                      <OverlayMessages />
                      <Sidebar>{children}</Sidebar>
                      <UserModal />
                    </CssBaseline>
                  </UserStateProvider>
                </MapProvider>
              </UiStateProvider>
            </ThemeProvider>
          </CacheProvider>
        {/* </main> */}
      </body>
    </html>
  )
}

export default RootLayout