'use client'

import '#/common/style/index.css'

import React, { useEffect, useState } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { Box } from '@mui/material'
import {
  Tolgee,
  DevTools,
  TolgeeProvider,
  FormatSimple,
  TreeTranslationsData,
} from '@tolgee/react'
import { QueryClientProvider } from '@tanstack/react-query'

import theme from '#/common/style/theme'
import { queryClient } from '#/common/queries/queryClient'
import { Sidebar } from '#/components/Sidebar'
import { NavBar } from '#/components/NavBar'
import { Map } from '#/components/Map'
import { LoginModal } from '#/components/Modal'
import {
  ConfirmationDialog,
  NotificationProvider,
} from '#/components/Notification'
import { useSession } from 'next-auth/react'
import { useUserStore } from '#/common/store/userStore'
// import { UserModal } from '#/components/Profile'
// import { UiStateProvider, UserStateProvider } from '#/components/State'
// import RootStyleRegistry from './emotion'

const loadTranslation = async (
  ns: string,
  lang: string
): Promise<TreeTranslationsData> => {
  try {
    const module = await import(`#/i18n/${ns}/${lang}.json`)
    return module.default as TreeTranslationsData
  } catch (error) {
    console.error(`Failed to load ${lang}:${ns} translations`, error)
    return {} // Return a fallback or an empty object as needed
  }
}

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    language: 'en',
    defaultNs: 'avoin-map',
    ...(process.env.NEXT_PUBLIC_TOLGEE_API_URL && {
      apiUrl: process.env.NEXT_PUBLIC_TOLGEE_API_URL,
    }),
    ...(process.env.NEXT_PUBLIC_TOLGEE_API_KEY && {
      apiKey: process.env.NEXT_PUBLIC_TOLGEE_API_KEY,
    }),
    staticData: {
      'en:avoin-map': () => loadTranslation('avoin-map', 'en'),
      'fi:avoin-map': () => loadTranslation('avoin-map', 'fi'),
      'en:hiilikartta': () => loadTranslation('hiilikartta', 'en'),
      'fi:hiilikartta': () => loadTranslation('hiilikartta', 'fi'),
      // Add more translations as needed
    },
  })

const Layout = ({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) => {
  const { data: session } = useSession()
  const setUser = useUserStore((state) => state.setUser)

  useEffect(() => {
    if (session?.user?.id) {
      setUser({ ...session.user, accessToken: session.accessToken })
    } else {
      setUser(null)
    }
  }, [session])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {/* <UserStateProvider> */}
        <CssBaseline>
          <TolgeeProvider
            tolgee={tolgee}
            fallback="" // loading fallback
          >
            <NotificationProvider>
              <Map>
                {/* <UserModal /> */}
                <Box
                  className="layout-container"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    width: '100vw',
                    zIndex: 'drawer',
                  }}
                >
                  <Sidebar>{children}</Sidebar>
                  <NavBar />
                </Box>
                <LoginModal></LoginModal>
                <ConfirmationDialog></ConfirmationDialog>
              </Map>
            </NotificationProvider>
          </TolgeeProvider>
        </CssBaseline>
        {/* </UserStateProvider> */}
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default Layout
