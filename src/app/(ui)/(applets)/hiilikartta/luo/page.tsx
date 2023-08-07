'use client'

import React from 'react'
import { Button } from '@mui/material'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'
import Link from 'next/link'
import { Link as MuiLink } from '@mui/material'
import { T } from '@tolgee/react'

import { routeTree } from 'applets/hiilikartta/common/routes'

const Page = () => {
  return (
    <>
      <MuiLink
        href={getRoute(routeTree.create.import, routeTree)}
        sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
        component={Link}
      >
        <BigMenuButton variant="contained" component="label">
          <T keyName={'sidebar.create.upload'} ns={'hiilikartta'}></T>
        </BigMenuButton>
      </MuiLink>

      <BigMenuButton variant="contained">
        <T keyName={'sidebar.create.draw-new'} ns={'hiilikartta'}></T>
      </BigMenuButton>
    </>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 15px 0',
})

export default Page
