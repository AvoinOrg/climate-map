'use client'

import React, { useEffect } from 'react'
import { Box, Typography, CircularProgress, Tooltip } from '@mui/material'
import { T, useTranslate } from '@tolgee/react'
import { SaveOutlined as SaveIcon } from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

import Folder from '#/components/common/Folder'
import { Error as ErrorIcon, Exclamation, Info } from '#/components/icons'
import EditableText from '#/components/common/EditableText'

import { CalculationState, PlanConf } from '../common/types'
import { useAppletStore } from '../state/appletStore'
import { planPostMutation } from '../common/queries/planPostMutation'

const PlanFolder = ({
  planConf,
  height,
  isNameEditable = false,
}: {
  planConf: PlanConf
  height: number
  isNameEditable?: boolean
}) => {
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const planPost = useMutation(planPostMutation())
  const { status } = useSession()
  const { t } = useTranslate('hiilikartta')

  const [isSaveEnabled, setIsSaveEnabled] = React.useState(false)

  const handleNameChange = (event: any) => {
    updatePlanConf(planConf.id, { name: event.target.value })
  }

  useEffect(() => {
    if (
      status === 'authenticated' &&
      !planPost.isPending &&
      ![CalculationState.INITIALIZING, CalculationState.CALCULATING].includes(
        planConf.calculationState
      ) &&
      planConf.data.features.length > 0
    ) {
      setIsSaveEnabled(true)
    } else {
      setIsSaveEnabled(false)
    }
  }, [status, planConf, planPost.isPending])

  const handleSyncClick = (event: any) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()

    if (planConf) {
      planPost.mutate(planConf)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          position: 'relative',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          mb: '-0.8rem',
          zIndex: 1000,
          color:
            planPost.isError && !planPost.isPending
              ? 'warning.dark'
              : 'neutral.darker',
        }}
      >
        <Tooltip
          title={
            [
              CalculationState.INITIALIZING,
              CalculationState.CALCULATING,
            ].includes(planConf.calculationState)
              ? t(
                  'sidebar.my_plans.unable_to_save_with_calculations_in_progress'
                )
              : planConf.data.features.length === 0
              ? t('sidebar.my_plans.unable_to_save_empty_plan')
              : status !== 'authenticated'
              ? t('sidebar.my_plans.sign_in_to_save')
              : t('sidebar.my_plans.unable_to_save')
          }
          disableHoverListener={isSaveEnabled && !planPost.isPending}
        >
          <Box
            onClick={isSaveEnabled ? handleSyncClick : undefined}
            sx={{
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'end',
              '&:hover': {
                cursor: planPost.isPending
                  ? 'wait'
                  : isSaveEnabled
                  ? 'pointer'
                  : 'not-allowed',
              },
              mr: '1px',
              height: '16px',
              opacity: isSaveEnabled ? 1 : 0.6,
            }}
          >
            {planConf.cloudLastSaved && !planPost.isPending && (
              <>
                <Typography
                  sx={{ display: 'inline', typography: 'body7', mr: 0.5 }}
                >
                  <T
                    ns="hiilikartta"
                    keyName="sidebar.plan_settings.last_saved"
                  ></T>
                </Typography>
                <Typography sx={{ display: 'inline', typography: 'body7' }}>
                  {new Date(planConf.cloudLastSaved).toLocaleString()}
                </Typography>
              </>
            )}
            {!planConf.cloudLastSaved && !planPost.isPending && (
              <>
                <Typography sx={{ display: 'inline', typography: 'body7' }}>
                  <T
                    ns="hiilikartta"
                    keyName="sidebar.plan_settings.save_plan"
                  ></T>
                </Typography>
              </>
            )}
            {planPost.isPending && (
              <>
                <Typography sx={{ display: 'inline', typography: 'body7' }}>
                  <T
                    ns="hiilikartta"
                    keyName="sidebar.plan_settings.saving_plan"
                  ></T>
                </Typography>
              </>
            )}
            {planPost.isPending && (
              <CircularProgress
                color="secondary"
                size={15}
                sx={{ height: '12px', ml: '4px', mr: '3px', mb: '1px' }}
              />
            )}
            {!planPost.isPending && (
              <SaveIcon
                sx={{
                  ml: '4px',
                  mb: '-3px',
                  color:
                    planPost.isError && !planPost.isPending
                      ? 'warning.dark'
                      : '#71797E',
                }}
              ></SaveIcon>
            )}
            {planPost.isError && !planPost.isPending && (
              <>
                <Exclamation
                  sx={{ height: '1.1rem', mb: '0.5px', color: 'warning.dark' }}
                ></Exclamation>
              </>
            )}
          </Box>
        </Tooltip>
      </Box>

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
          {isNameEditable ? (
            <EditableText
              textSx={{ typography: 'h2', color: 'neutral.darker' }}
              value={planConf.name}
              onChange={handleNameChange}
            />
          ) : (
            <Typography sx={{ typography: 'h2', color: 'neutral.darker' }}>
              {planConf.name}
            </Typography>
          )}

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
    </Box>
  )
}

export default PlanFolder
