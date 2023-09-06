'use client'

import React, { useEffect } from 'react'
import { Box, Button } from '@mui/material'
import Link from 'next/link'

import useStore from '#/common/hooks/useStore'
import { getRoute } from '#/common/utils/routing'

import { useMapStore } from '#/common/store'
import { useAppStore } from './state/appStore'
import PlanListItem from './components/PlanListItem'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { T } from '@tolgee/react'

const Page = () => {
  const planConfs = useStore(useAppStore, (state) => state.planConfs)
  const setMapLibraryMode = useMapStore((state) => state.setMapLibraryMode)

  useEffect(() => {
    setMapLibraryMode('mapbox')
  }, [])

  return (
    <>
      <Box>
        <Link href={getRoute(routeTree.create, routeTree)}>
          <Box sx={{ typography: 'h2', textAlign: 'start' }}>
            <T keyName={'sidebar.main.add_new'} ns='hiilikartta'></T>
          </Box>
        </Link>
      </Box>
      {planConfs != null && Object.keys(planConfs).length > 0 && (
        <>
          <Box component="p">Omat kaavat</Box>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {Object.keys(planConfs).map((id) => {
              return <PlanListItem key={id} planConf={planConfs[id]} />
            })}
          </Box>
        </>
      )}
    </>
  )
}

export default Page
