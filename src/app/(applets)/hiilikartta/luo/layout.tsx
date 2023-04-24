'use client'

import React from 'react'
import { Typography } from '@mui/material'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Typography sx={(theme) => ({ typography: theme.typography.h2, margin: '0 0 35px 0' })}>Luo kaava</Typography>
      {children}
    </>
  )
}

export default Layout
