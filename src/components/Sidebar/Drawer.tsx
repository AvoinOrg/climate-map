'use client'

import React, { useState, useEffect } from 'react'
import { Box } from '@mui/material'

import { SIDEBAR_CLOSED_WIDTH } from '#/common/style/theme/constants'

interface Props {
  open: boolean
  children: React.ReactNode
}

const Drawer = ({ open, children }: Props) => {
  const [width, setWidth] = useState(open ? 'auto' : SIDEBAR_CLOSED_WIDTH)

  useEffect(() => {
    setWidth(open ? 'auto' : SIDEBAR_CLOSED_WIDTH)
  }, [open])

  return (
    <Box
      className="drawer-container"
      sx={(theme) => ({
        width: width, // controlled by state
        transition: 'width 200ms linear',
        zIndex: theme.zIndex.drawer,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Hide overflowing content
        border: 1,
        borderColor: 'primary.dark',
      })}
    >
      {children}
    </Box>
  )
}

export default Drawer
