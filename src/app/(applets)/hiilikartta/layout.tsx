'use client'

import React from 'react'
import { Box, Button } from '@mui/material'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'

import NavigationHeader from './components/NavigationHeader'
import Link from 'next/link'
import { routeTree } from './routes'
import MuiLink from '@mui/material/Link'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box sx={{ padding: '120px 30px 100px 50px', minWidth: '400px', display: 'flex', flexDirection: 'column' }}>
      <MuiLink
        href={getRoute(routeTree.base.import, routeTree)}
        sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
        component={Link}
      >
        <BigMenuButton variant="contained" component="label">
          Tuo kaava
        </BigMenuButton>
      </MuiLink>
      <BigMenuButton variant="contained">Uusi kaava</BigMenuButton>
      {/* <NavigationHeader></NavigationHeader> */}
      {children}
    </Box>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 15px 0',
})

export default Layout
