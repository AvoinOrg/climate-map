'use client'

import '#/common/style/index.css'

import React, { useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { QueryClientProvider, QueryClient } from 'react-query'

// import { UserModal } from '#/components/Profile'
// import { UiStateProvider, UserStateProvider } from '#/components/State'
// import RootStyleRegistry from './emotion'

const queryClient = new QueryClient()

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
          <SessionProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </SessionProvider>
        )}
        {/* </RootStyleRegistry> */}
      </body>
    </html>
  )
}

export default RootLayout
