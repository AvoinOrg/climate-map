'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
// import SettingsIcon from '@mui/icons-material/Settings'
import { T } from '@tolgee/react'

import useStore from '#/common/hooks/useStore'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'

import PlanListItem from '../components/PlanListItem'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const planConfs = useStore(useAppletStore, (state) => state.planConfs)

  return (
    <>
      <Typography variant="h2">
        <T keyName={'sidebar.my_plans.title'} ns="hiilikartta"></T>
      </Typography>
      {planConfs != null && Object.keys(planConfs).length > 0 && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', mt: 6 }}>
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
