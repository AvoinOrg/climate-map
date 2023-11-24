'use client'

import React from 'react'
import { Box } from '@mui/material'

import { routeTree } from '../common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '#/components/Sidebar'
import AppletWrapper from '#/components/common/AppletWrapper'

import { SIDEBAR_WIDTH_REM } from '../common/constants'

const localizationNamespace = 'hiilikartta'
const defaultLanguage = 'fi'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const SidebarHeaderElement = (
    <SidebarHeader title={'Hiilikartta'}>
      <Box sx={{ mt: 8, maxWidth: SIDEBAR_WIDTH_REM - 6 + 'rem' }}>
        <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
      </Box>
    </SidebarHeader>
  )

  return (
    <AppletWrapper
      mapContext={'hiilikartta'}
      localizationNamespace={localizationNamespace}
      defaultLanguage={defaultLanguage}
      SidebarHeaderElement={SidebarHeaderElement}
      sx={{
        pt: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </AppletWrapper>
  )
}

export default Layout
