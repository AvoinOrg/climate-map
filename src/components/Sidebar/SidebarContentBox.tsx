import React, { useState, useEffect, useRef } from 'react'
import { Box } from '@mui/material'

import {
  SCROLLBAR_WIDTH_REM,
  SIDEBAR_PADDING_REM,
} from '#/common/style/theme/constants'
import { cssMeasureToNumber } from '#/common/utils/styling'

const SidebarContentBox = ({
  children,
  sx,
}: {
  children: React.ReactNode
  sx?: any
}) => {
  const boxRef = useRef(null)
  const [boxWidth, setBoxWidth] = useState<number>()

  // TODO: fix this cursed spaghetti
  const updateWidth = () => {
    sx = sx || {}
    let defaultWidth = 0
    if (sx.width != null) {
      defaultWidth = cssMeasureToNumber(sx.width)
    }
    defaultWidth = Math.min(defaultWidth, window.innerWidth)
    if (defaultWidth === window.innerWidth) {
      defaultWidth -= 2
    }
    setBoxWidth(defaultWidth)
  }

  useEffect(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  return (
    <Box
      ref={boxRef}
      className="sidebar-children-container"
      sx={{
        direction: 'rtl',
        overflowY: 'scroll',
        ...sx,
        width: boxWidth !== null ? `${boxWidth}px` : sx.width,
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
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default SidebarContentBox
