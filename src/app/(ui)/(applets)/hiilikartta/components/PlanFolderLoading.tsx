'use client'

import React, { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'

import Folder from '#/components/common/Folder'
import { PlaceholderPlanConf } from '../common/types'

const PlanFolder = ({
  planConf,
  height,
}: {
  planConf: PlaceholderPlanConf
  height: number
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Folder height={height}>
        <Box
          sx={(theme) => ({
            pt: 2,
            pl: 3,
            pb: 3,
            pr: 3,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: '1',
            height: '100%',
          })}
        >
          <CircularProgress></CircularProgress>
        </Box>
      </Folder>
    </Box>
  )
}

export default PlanFolder
