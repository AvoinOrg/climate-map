import React from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { T } from '@tolgee/react'

import Folder from '#/components/common/Folder'
import { Error as ErrorIcon, Info } from '#/components/icons'

import { CalculationState, PlanConf } from '../common/types'

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
        {![CalculationState.NOT_STARTED].includes(
          planConf.calculationState
        ) && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            {[
              CalculationState.INITIALIZING,
              CalculationState.CALCULATING,
            ].includes(planConf.calculationState) && (
              <>
                <Box
                  sx={{
                    typography: 'h7',
                    color: 'secondary.dark',
                    lineHeight: '1',
                  }}
                >
                  <T
                    keyName={
                      planConf.calculationState ===
                      CalculationState.INITIALIZING
                        ? 'sidebar.my_plans.calculations_starting'
                        : 'sidebar.my_plans.calculations_in_progress'
                    }
                    ns={'hiilikartta'}
                  ></T>
                </Box>

                <CircularProgress
                  color="secondary"
                  size={25}
                  sx={{ height: '10px' }}
                />
              </>
            )}
            {planConf.calculationState === CalculationState.ERRORED && (
              <>
                <Box
                  sx={{
                    typography: 'h7',
                    color: 'warning.dark',
                    lineHeight: '1',
                  }}
                >
                  <T
                    keyName={'sidebar.my_plans.calculations_errored'}
                    ns={'hiilikartta'}
                  ></T>
                </Box>
                <ErrorIcon
                  sx={{ color: 'warning.dark', height: '24px' }}
                ></ErrorIcon>
              </>
            )}
            {planConf.calculationState === CalculationState.FINISHED && (
              <>
                <Box
                  sx={{
                    typography: 'h7',
                    color: 'secondary.dark',
                    lineHeight: '1',
                  }}
                >
                  <T
                    keyName={'sidebar.my_plans.calculations_finished'}
                    ns={'hiilikartta'}
                  ></T>
                </Box>
                <Info sx={{ color: 'secondary.dark', height: '24px' }}></Info>
              </>
            )}
          </Box>
        )}
      </Box>
    </Folder>
  )
}

export default PlanFolder
