'use client'

import React, { useContext, useState, useEffect } from 'react'
import { Button, Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import TuneIcon from '@mui/icons-material/Tune'

import { PlanConf } from '../types'
import { AppStateContext } from '../state/AppState'

interface Props {
  planConf: PlanConf
}

const PlanListItem = ({ planConf }: Props) => {
  const { updatePlanConf } = useContext(AppStateContext)

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
        <TuneIcon sx={(theme) => ({ float: 'left' })}></TuneIcon>
      </Box>
      <Box sx={(theme) => ({ typography: theme.typography.body1 })}>{planConf.name}</Box>
      <Box sx={(theme) => ({ minHeight: '25px' })}></Box>
    </Box>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '300px',
  height: '50px',
  margin: '0 0 15px 0',
})

export default PlanListItem
