'use client'

import React from 'react'
import { Box, Button } from '@mui/material'
import { styled } from '@mui/material/styles'

import { routeTree } from './common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '../../../components/Sidebar'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SidebarHeader title={'Hiilikartta'}>
        <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
      </SidebarHeader>
      <Box sx={{ padding: '120px 30px 100px 30px', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </>
  )
}

export default Layout
