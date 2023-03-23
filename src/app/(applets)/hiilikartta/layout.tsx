'use client'

import React from 'react'
import UploadButton from './components/UploadButton'
import { Box, Button } from '@mui/material'
import { styled } from '@mui/material/styles'

import { AppStateProvider } from './state/AppState'
import NavigationHeader from './components/NavigationHeader'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppStateProvider>
      <Box sx={{ padding: '120px 30px 100px 50px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
        <BigMenuButton variant="contained" component="label"></BigMenuButton>
        <BigMenuButton variant="contained">Uusi kaava</BigMenuButton>
        {/* <NavigationHeader></NavigationHeader> */}
        {children}
      </Box>
    </AppStateProvider>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '300px',
  height: '60px',
  margin: '0 0 15px 0',
})

export default Layout
