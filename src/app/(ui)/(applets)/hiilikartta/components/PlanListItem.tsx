'use client'

import React from 'react'
import { Box } from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import Link from '#/components/common/Link'

import { PlanConf } from '../common/types'
import { routeTree } from '../common/routes'
import { getRoute } from '#/common/utils/routing'

interface Props {
  planConf: PlanConf
}

const PlanListItem = ({ planConf }: Props) => {
  return (
    <Box
      sx={(theme) => ({
        padding: '5px',
        textAlign: 'center',
        minHeight: '140px',
        minWidth: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: theme.palette.neutral.main,
        margin: "0 0 15px 0"
      })}
    >
      <Box sx={(theme) => ({ minHeight: '25px' })}>
        <Link
          href={getRoute(routeTree.plans.plan, routeTree, [planConf.id])}
          sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
        >
          <TuneIcon
            sx={(theme) => ({ float: 'left', cursor: 'pointer' })}
          ></TuneIcon>
        </Link>
      </Box>
      <Box sx={(theme) => ({ typography: theme.typography.body1 })}>
        {planConf.name}
      </Box>
      <Box sx={(theme) => ({ minHeight: '25px' })}></Box>
    </Box>
  )
}

export default PlanListItem
