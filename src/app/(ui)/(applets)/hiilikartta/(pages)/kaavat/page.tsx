'use client'

import React, { useMemo } from 'react'
import { Box, Typography } from '@mui/material'
// import SettingsIcon from '@mui/icons-material/Settings'
import { T } from '@tolgee/react'

import useStore from '#/common/hooks/useStore'
import { getRoute } from '#/common/utils/routing'
import { SidebarContentBox } from '#/components/Sidebar'
import Link from '#/components/common/Link'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { SIDEBAR_WIDTH_REM } from 'applets/hiilikartta/common/constants'
import PlanFolder from 'applets/hiilikartta/components/PlanFolder'
import { PlanConf, PlanConfState } from 'applets/hiilikartta/common/types'
import PlanFolderLoading from 'applets/hiilikartta/components/PlanFolderLoading'

const Page = () => {
  const planConfs = useStore(useAppletStore, (state) => state.planConfs)
  const placeholderPlanConfs = useStore(
    useAppletStore,
    (state) => state.placeholderPlanConfs
  )

  const filteredPlanConfs: PlanConf[] = useMemo(() => {
    if (planConfs == null) {
      return []
    }

    return Object.keys(planConfs).reduce<PlanConf[]>((acc, id) => {
      if (
        !planConfs[id].isHidden &&
        planConfs[id].state !== PlanConfState.FETCHING
      ) {
        acc.push(planConfs[id])
      }

      return acc
    }, [])
  }, [planConfs])

  return (
    <SidebarContentBox sx={{ width: SIDEBAR_WIDTH_REM + 'rem' }}>
      <Typography variant="h2">
        <T keyName={'sidebar.my_plans.title'} ns="hiilikartta"></T>
      </Typography>
      <>
        <Box sx={{ display: 'flex', flexDirection: 'column', mt: 6 }}>
          <>
            {filteredPlanConfs.map((planConf) => {
              return (
                <Box sx={{ mb: 2 }} key={planConf.id}>
                  <Link
                    href={getRoute(routeTree.plans.plan, routeTree, {
                      routeParams: {
                        planId: planConf.id,
                      },
                    })}
                    sx={{
                      display: 'flex',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <PlanFolder planConf={planConf} height={120} />
                  </Link>
                </Box>
              )
            })}
            {placeholderPlanConfs &&
              Object.keys(placeholderPlanConfs).map((planConf) => {
                return (
                  <Box sx={{ mb: 2 }} key={planConf}>
                    <PlanFolderLoading
                      planConf={placeholderPlanConfs[planConf]}
                      height={120}
                    />
                  </Box>
                )
              })}
          </>
        </Box>
      </>
    </SidebarContentBox>
  )
}

export default Page
