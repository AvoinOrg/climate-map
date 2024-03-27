'use client'

import React, { useEffect } from 'react'
import { Box } from '@mui/material'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

import { routeTree } from '../common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '#/components/Sidebar'
import AppletWrapper from '#/components/common/AppletWrapper'
import { useUserStore } from '#/common/store/userStore'

import { SIDEBAR_WIDTH_REM } from '../common/constants'
import { planStatsQuery } from '../common/queries/planStatsQuery'
import { planQueries } from '../common/queries/planQueries'
import { useAppletStore } from '../state/appletStore'
import {
  PlanConfState,
  PlaceholderPlanConf,
  GlobalState,
} from '../common/types'

const localizationNamespace = 'hiilikartta'
const defaultLanguage = 'fi'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession()
  const addSignOutAction = useUserStore((state) => state.addSignOutAction)
  const removeSignOutAction = useUserStore((state) => state.removeSignOutAction)

  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)
  const updateGlobalState = useAppletStore((state) => state.updateGlobalState)
  const planConfs = useAppletStore((state) => state.planConfs)
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const addPlaceholderPlanConf = useAppletStore(
    (state) => state.addPlaceholderPlanConf
  )
  const clearPlaceholderPlanConfs = useAppletStore(
    (state) => state.clearPlaceholderPlanConfs
  )

  const [planConfsToFetch, setPlanConfsToFetch] = React.useState<
    PlaceholderPlanConf[]
  >([])

  const SidebarHeaderElement = (
    <SidebarHeader title={'Hiilikartta'}>
      <Box sx={{ mt: 8, maxWidth: SIDEBAR_WIDTH_REM - 6 + 'rem' }}>
        <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
      </Box>
    </SidebarHeader>
  )

  const planConfStatsQuery = useQuery({
    ...planStatsQuery(),
    enabled: false,
  })

  const planQs = useQueries(planQueries(planConfsToFetch))

  useEffect(() => {
    clearPlaceholderPlanConfs()

    if (status !== 'loading') {
      if (session?.user?.id != null) {
        clearPlaceholderPlanConfs()
        updateGlobalState(GlobalState.INITIALIZING)
        planConfStatsQuery.refetch()

        for (const id in planConfs) {
          if (!planConfs[id].userId) {
            updatePlanConf(id, { userId: session.user.id })
          } else if (planConfs[id].userId !== session.user.id) {
            updatePlanConf(id, { isHidden: true })
          } else if (planConfs[id].userId === session.user.id) {
            updatePlanConf(id, { isHidden: false })
          }
        }
      } else {
        for (const id in planConfs) {
          if (planConfs[id].userId != null) {
            updatePlanConf(id, { isHidden: true })
          }
        }
        updateGlobalState(GlobalState.IDLE)
      }
    } else {
      updateGlobalState(GlobalState.INITIALIZING)
    }
  }, [session?.user?.id, status])

  useEffect(() => {
    const processPlanConfs = async (data: PlaceholderPlanConf[]) => {
      const filteredPlanConfs = []
      for (const placeholderPlanConf of data) {
        if (
          !Object.keys(planConfs).includes(placeholderPlanConf.id) ||
          (planConfs[placeholderPlanConf.id].localLastEdited != null &&
            (planConfs[placeholderPlanConf.id].localLastEdited ?? 0) <
              placeholderPlanConf.cloudLastSaved)
        ) {
          await addPlaceholderPlanConf(
            placeholderPlanConf.id,
            placeholderPlanConf
          )
          if (Object.keys(planConfs).includes(placeholderPlanConf.id)) {
            await updatePlanConf(placeholderPlanConf.id, {
              state: PlanConfState.FETCHING,
            })
          }

          filteredPlanConfs.push(placeholderPlanConf)
        }
      }

      setPlanConfsToFetch(filteredPlanConfs)

      updateGlobalState(GlobalState.FETCHING)
    }

    if (session?.user?.id && planConfStatsQuery.data) {
      processPlanConfs(planConfStatsQuery.data)
    }
  }, [session?.user?.id, planConfStatsQuery.data])

  useEffect(() => {
    if (session?.user?.id && planConfsToFetch) {
      if (planConfsToFetch.length === 0) {
        updateGlobalState(GlobalState.IDLE)
      } else {
        planQs.forEach((planQ) => {
          planQ.refetch()
        })
      }
    }
  }, [session?.user?.id, planConfsToFetch])

  useEffect(() => {
    if (planQs.length > 0) {
      const allCompleted = planQs.every(
        (planQ) => planQ.isSuccess || planQ.isError
      )

      if (allCompleted) {
        updateGlobalState(GlobalState.IDLE)
      }
    }
  }, [planQs])

  useEffect(() => {
    if (session?.user?.id != null) {
      addSignOutAction('hiilikartta', () => {
        for (const id in planConfs) {
          if (planConfs[id].userId === session?.user?.id) {
            deletePlanConf(id)
          }
        }
      })
    }
  }, [planConfs, session?.user?.id])

  useEffect(() => {
    if (planQs.length > 0) {
      const allCompleted = planQs.every(
        (planQ) => planQ.isSuccess || planQ.isError
      )

      if (allCompleted) {
        updateGlobalState(GlobalState.IDLE)
      }
    }

    return () => {
      removeSignOutAction('hiilikartta')
    }
  }, [])

  return (
    <AppletWrapper
      mapContext={'hiilikartta'}
      localizationNamespace={localizationNamespace}
      defaultLanguage={defaultLanguage}
      SidebarHeaderElement={SidebarHeaderElement}
      sx={{
        pt: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </AppletWrapper>
  )
}

export default Layout
