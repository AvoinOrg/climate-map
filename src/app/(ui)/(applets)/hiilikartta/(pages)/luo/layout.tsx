'use client'

import React from 'react'
import { Typography } from '@mui/material'

import { SidebarContentBox } from '#/components/Sidebar'

import { SIDEBAR_WIDTH_REM } from '../../common/constants'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarContentBox sx={{ width: SIDEBAR_WIDTH_REM + 'rem' }}>
      <Typography
        sx={(theme) => ({
          typography: theme.typography.h2,
          margin: '0 0 35px 0',
        })}
      >
        Luo kaava
      </Typography>
      {children}
    </SidebarContentBox>
  )
}

export default Layout
