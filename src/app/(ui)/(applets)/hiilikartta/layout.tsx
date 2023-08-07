'use client'

import React, { useEffect, useLayoutEffect } from 'react'
import { Box } from '@mui/material'

import { routeTree } from './common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '#/components/Sidebar'
import { useUIStore } from '#/common/store'
import { useTolgee } from '@tolgee/react'

const tolgeeNs = 'hiilikartta'
const tolgeeLang = 'fi'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const tolgee = useTolgee(["update"])
  const setSidebarHeaderElement = useUIStore(
    (state) => state.setSidebarHeaderElement
  )

  const SidebarHeaderElement = (
    <SidebarHeader title={'Hiilikartta'}>
      <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
    </SidebarHeader>
  )

  useEffect(() => {
    if (tolgee.isLoaded()) {
      tolgee.addActiveNs(tolgeeNs)
      tolgee.changeLanguage(tolgeeLang)
    }
  }, [tolgee.isLoaded()])

  useLayoutEffect(() => {
    if (setSidebarHeaderElement != null) {
      setSidebarHeaderElement(SidebarHeaderElement)
    }
  }, [setSidebarHeaderElement])

  return (
    <>
      {tolgee
        .getAllRecords()
        .some(
          (item) => item.namespace === tolgeeNs && item.language === tolgeeLang
        ) && (
        <Box
          sx={{
            padding: '35px 30px 100px 30px',
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      )}
    </>
  )
}

export default Layout
