'use client'

import React from 'react'
import { Box, Collapse } from '@mui/material'

interface Props {
  open: boolean
  children: React.ReactNode
}

const Drawer = ({ open, children }: Props) => {
  return (
    <Collapse collapsedSize={100} orientation={'horizontal'} in={open}>
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
