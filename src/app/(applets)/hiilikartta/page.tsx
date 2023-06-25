'use client'

import React, { useEffect } from 'react'
import { Box } from '@mui/material'

import useStore from '#/common/hooks/useStore'

import { useMapStore } from '#/common/store'
import { useAppStore } from './state/appStore'
import PlanListItem from './components/PlanListItem'

const Page = () => {
  const planConfs = useStore(useAppStore, (state) => state.planConfs)
  const setMapLibraryMode = useMapStore((state) => state.setMapLibraryMode)

  useEffect(() => {
    setMapLibraryMode('mapbox')
  }, [])

  return (
    <>
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
