'use client'

import React, { useLayoutEffect } from 'react'
import { Box } from '@mui/material'

import { routeTree } from './common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '#/components/Sidebar'
import { useUIStore } from '#/common/store'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const setSidebarHeaderElement = useUIStore((state) => state.setSidebarHeaderElement)

  const SidebarHeaderElement = (
    <SidebarHeader title={'Hiilikartta'}>
      <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
    </SidebarHeader>
  )

  useLayoutEffect(() => {
    if (setSidebarHeaderElement != null) {
      setSidebarHeaderElement(SidebarHeaderElement)
    }
  }, [setSidebarHeaderElement])

  return (
    <>
      <Box sx={{ padding: '35px 30px 100px 30px', width: '400px', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </>
  )
}

export default Layout
