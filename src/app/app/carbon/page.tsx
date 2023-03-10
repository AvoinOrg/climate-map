'use client'

import React, { useContext, useState } from 'react'

import { Box } from '@mui/material'

import { AppStateContext } from './state/AppState'
import PlanListItem from './components/PlanListItem'

const Page = () => {
  const { planConfs } = useContext(AppStateContext)

  return (
    <>
      {planConfs != null && (
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
