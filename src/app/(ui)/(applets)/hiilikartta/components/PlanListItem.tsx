'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import Link from '#/components/common/Link'

import Folder from '#/components/common/Folder'

import { PlanConf } from '../common/types'
import { routeTree } from '../common/routes'
import { getRoute } from '#/common/utils/routing'
import PlanFolder from './PlanFolder'

interface Props {
  planConf: PlanConf
  sx?: any
}

const PlanListItem = ({ planConf, sx }: Props) => {
  return (
    <Box sx={sx}>
      <Link
        href={getRoute(routeTree.plans.plan, routeTree, [planConf.id])}
        sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
      >
        <PlanFolder planConf={planConf} height={120} />
      </Link>
    </Box>
  )
}

export default PlanListItem
