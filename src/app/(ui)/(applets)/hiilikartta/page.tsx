'use client'

import React, { useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import Link from '#/components/common/Link'
import { T } from '@tolgee/react'

import { getRoute } from '#/common/utils/routing'
import Folder from '#/components/common/Folder'
import { useMapStore } from '#/common/store'

import { routeTree } from 'applets/hiilikartta/common/routes'

const Page = () => {
  const setMapLibraryMode = useMapStore((state) => state.setMapLibraryMode)

  useEffect(() => {
    setMapLibraryMode('mapbox')
  }, [])

  return (
    <>
      <Link href={getRoute(routeTree.create, routeTree)}>
        <Box sx={{ typography: 'h2', textAlign: 'start', mt: 5 }}>
          <T keyName={'sidebar.main.add_new'} ns="hiilikartta"></T>
        </Box>
      </Link>
      <Link href={getRoute(routeTree.plans, routeTree)} sx={{ mt: 18 }}>
        <Folder
          sx={{
            color: 'neutral.lighter',
            backgroundColor: 'primary.dark',
            borderColor: 'primary.light',
            pt: 6,
            pl: 4,
          }}
        >
          <Typography variant="h2" sx={{ textTransform: 'uppercase' }}>
            <T keyName={'sidebar.my_plans.title'} ns={'hiilikartta'}></T>
          </Typography>
        </Folder>
      </Link>
    </>
  )
}

export default Page
