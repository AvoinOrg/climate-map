'use client'

import React from 'react'
import UploadButton from './components/UploadButton'
import {  Box } from '@mui/material'

import { AppStateProvider } from './state/AppState'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppStateProvider>
      <Box sx={{ padding: '150px 30px 100px 30px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
        <UploadButton></UploadButton>
        {children}
      </Box>
    </AppStateProvider>
  )
}

export default Layout
