'use client'

import '#/common/style/index.css'

import React, { useEffect, useState } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'

import theme from '#/common/style/theme'
import { Sidebar } from '#/components/Sidebar'
import { NavBar } from '#/components/NavBar'
// import { UserModal } from '#/components/Profile'
// import { UiStateProvider, UserStateProvider } from '#/components/State'
import { GroupOrientation } from '#/components/Map'
// import RootStyleRegistry from './emotion'

const RootLayout = ({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) => {
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return (
    <html lang="en">
      <body>
        {/* <RootStyleRegistry> */}
        {isHydrated && (
          <ThemeProvider theme={theme}>
            {/* <UserStateProvider> */}
            <CssBaseline>
              {/* <NavBar /> */}
              <Sidebar>{children}</Sidebar>
              {/* <UserModal /> */}
            </CssBaseline>
            {/* </UserStateProvider> */}
          </ThemeProvider>
        )}
        {/* </RootStyleRegistry> */}
      </body>
    </html>
  )
}

export default RootLayout
