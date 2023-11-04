import React from 'react'
import { Box } from '@mui/material'

import {
  SCROLLBAR_WIDTH_REM,
  SIDEBAR_PADDING_REM,
} from '#/common/style/theme/constants'

const SidebarContentBox = ({
  children,
  sx,
}: {
  children: React.ReactNode
  sx?: any
}) => {
  let parentWidth = '100%'
  let restSx = {}

  if (sx != null) {
    if (sx.width != null) {
      let { width, ...spreadSx } = sx
      parentWidth = width
      restSx = spreadSx
    } else {
      restSx = sx
    }
  }

  return (
    <Box
      className="sidebar-children-container"
      sx={{
        width: parentWidth != null ? parentWidth : '100%',
        direction: 'rtl',
        overflowY: 'scroll',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          direction: 'ltr',
          height: '100%',
          overflowY: 'visible',
          p: SIDEBAR_PADDING_REM + 'rem',
          mr: SCROLLBAR_WIDTH_REM + 'rem',
          flex: 1,
          ...restSx,
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default SidebarContentBox
