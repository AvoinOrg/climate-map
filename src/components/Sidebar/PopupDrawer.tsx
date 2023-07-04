'use client'

import React from 'react'
import { Box, Collapse } from '@mui/material'

interface Props {
  open: boolean
  children: React.ReactNode
}

const PopupDrawer = ({ open, children }: Props) => {
  return (
    <Collapse collapsedSize={0} orientation={'horizontal'} in={open}>
      <Box
        sx={(theme) => ({
          // width: open ? 'auto' : 100,
          overflowX: 'hidden',
          // position: 'absolute',
          // transition: `all ${TRANSITION_DURATION}ms cubic-bezier(0, 0, 0.2, 1) 0ms`,
          transition: 'width 1s linear !important',
          zIndex: theme.zIndex.popup,
        })}
      >
        {children}
      </Box>
    </Collapse>
  )
}

export default PopupDrawer
