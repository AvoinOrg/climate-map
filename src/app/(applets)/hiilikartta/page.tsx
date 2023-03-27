'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box } from '@mui/material'

import { MapContext } from '#/components/Map'

import { AppStateContext } from './state/AppState'
import PlanListItem from './components/PlanListItem'

const Page = () => {
  const { planConfs } = useContext(AppStateContext)
  const { setMapLibraryMode } = useContext(MapContext)

  useEffect(() => {
    setMapLibraryMode('mapbox')
  }, [])

  return (
    <>
      {planConfs != null && planConfs.length > 0 && (
        <>
          <Box component="p">Omat kaavat</Box>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {planConfs.map((planConf) => (
              <PlanListItem key={planConf.id} planConf={planConf} />
            ))}
          </Box>
        </>
      )}
    </>
  )
}

export default Page
