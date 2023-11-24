'use client'

import React from 'react'
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

const Page = () => {
  const planConfs = useStore(useAppletStore, (state) => state.planConfs)

  return (
    <SidebarContentBox sx={{ width: SIDEBAR_WIDTH_REM + 'rem' }}>
      <Typography variant="h2">
        <T keyName={'sidebar.my_plans.title'} ns="hiilikartta"></T>
      </Typography>
      {planConfs != null && Object.keys(planConfs).length > 0 && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', mt: 6 }}>
            {Object.keys(planConfs).map((id) => {
              return (
                <Box sx={{ mb: 2 }} key={id}>
                  <Link
                    href={getRoute(routeTree.plans.plan, routeTree, {
                      routeParams: {
                        planId: id,
                      },
                    })}
                    sx={{
                      display: 'flex',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <PlanFolder planConf={planConfs[id]} height={120} />
                  </Link>
                </Box>
              )
            })}
          </Box>
        </>
      )}
    </SidebarContentBox>
  )
}

export default Page
