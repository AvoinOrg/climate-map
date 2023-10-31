import React from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { T } from '@tolgee/react'

import Folder from '#/components/common/Folder'

import { PlanConf } from '../common/types'

const PlanFolder = ({
  planConf,
  height,
}: {
  planConf: PlanConf
  height: number
}) => {
  return (
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
        <Typography sx={{ typography: 'h2', color: 'neutral.darker' }}>
          {planConf.name}
        </Typography>
        {!planConf.isCalculating && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <Box
              sx={{
                typography: 'h7',
                color: 'secondary.dark',
                lineHeight: '1',
              }}
            >
              <T
                keyName={'sidebar.my_plans.calculations_in_progress'}
                ns={'hiilikartta'}
              ></T>
            </Box>

            <CircularProgress
              color="secondary"
              size={25}
              sx={{ height: '10px' }}
            />
          </Box>
        )}
      </Box>
    </Folder>
  )
}

export default PlanFolder
