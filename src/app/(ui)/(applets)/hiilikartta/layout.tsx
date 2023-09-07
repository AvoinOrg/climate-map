'use client'

import React from 'react'
import { Box } from '@mui/material'

import { routeTree } from './common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '#/components/Sidebar'
import AppletWrapper from '#/components/common/AppletWrapper'

const localizationNamespace = 'hiilikartta'
const defaultLanguage = 'fi'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const SidebarHeaderElement = (
    <SidebarHeader title={'Hiilikartta'}>
      <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
    </SidebarHeader>
  )

  return (
    <AppletWrapper
      mapContext={'hiilikartta'}
      localizationNamespace={localizationNamespace}
      defaultLanguage={defaultLanguage}
      SidebarHeaderElement={SidebarHeaderElement}
    >
      <Box
        sx={{
          padding: '35px 20px 100px 20px',
          width: '400px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </AppletWrapper>
  )
}

export default Layout
