'use client'

import React from 'react'
import { Box, Typography } from '@mui/material'
import Link from '#/components/common/Link'

import Folder from '#/components/common/Folder'

import { PlanConf } from '../common/types'
import { routeTree } from '../common/routes'
import { getRoute } from '#/common/utils/routing'

interface Props {
  planConf: PlanConf
}

const PlanListItem = ({ planConf }: Props) => {
  return (
    <Box>
      <Link
        href={getRoute(routeTree.plans.plan, routeTree, [planConf.id])}
        sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
      >
        <Folder sx={{pt: 6, pl: 3}}>
          <Typography variant="h2">{planConf.name}</Typography>
        </Folder>
      </Link>
    </Box>
  )
}

export default PlanListItem
