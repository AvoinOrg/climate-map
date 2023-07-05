'use client'

import React from 'react'
import { Box, Collapse } from '@mui/material'

import { SIDEBAR_CLOSED_WIDTH } from '#/common/style/theme/constants'

interface Props {
  open: boolean
  children: React.ReactNode
}

const Drawer = ({ open, children }: Props) => {
  return (
    <Collapse collapsedSize={SIDEBAR_CLOSED_WIDTH} orientation={'horizontal'} in={open} timeout={200}>
      <Box
        sx={{
          // width: open ? 'auto' : 100,
          overflowX: 'hidden',
          // position: 'absolute',
          // transition: `all ${TRANSITION_DURATION}ms cubic-bezier(0, 0, 0.2, 1) 0ms`,
          transition: 'width 1s linear !important',
          zIndex: 99999,
        }}
      >
        {children}
      </Box>
    </Collapse>
  )
}

export default Drawer
