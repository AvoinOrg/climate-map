'use client'

import React from 'react'
import { Box } from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import Link from 'next/link'
import { Link as MuiLink } from '@mui/material'

import { PlanConf } from '../types'
import { routeTree } from '../routes'
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
        backgroundColor: theme.palette.tertiary.main,
      })}
    >
      <Box sx={(theme) => ({ minHeight: '25px' })}>
        <MuiLink
          href={getRoute(routeTree.base.plan, routeTree, [planConf.id])}
          sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
          component={Link}
        >
          <TuneIcon sx={(theme) => ({ float: 'left', cursor: 'pointer' })}></TuneIcon>
        </MuiLink>
      </Box>
      <Box sx={(theme) => ({ typography: theme.typography.body1 })}>{planConf.name}</Box>
      <Box sx={(theme) => ({ minHeight: '25px' })}></Box>
    </Box>
  )
}

export default PlanListItem
