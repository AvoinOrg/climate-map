import React from 'react'
import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/system'
import SvgFolder from './SvgFolder'
import { useTheme } from '@mui/material/styles'

const StyledBox = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  display: 'inline-block',
  '& svg': {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  '& > div.content': {
    position: 'absolute',
    top: 0, // Adjust accordingly to position content inside folder SVG
    right: 0,
    left: 0,
    overflow: 'auto',
  },
}))

type Props = {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

const Folder = ({ children, sx }: Props) => {
  let color = useTheme().palette.neutral.lighter
  let borderColor = useTheme().palette.neutral.main

  if (sx && typeof sx === 'object') {
    if ('color' in sx && typeof sx.color === 'string') {
      color = sx.color
    }
    if ('borderColor' in sx && typeof sx.borderColor === 'string') {
      borderColor = sx.borderColor
    }
  }

  return (
    <StyledBox sx={sx}>
      <SvgFolder color={color} borderColor={borderColor} />
      <div className="content">{children}</div>
    </StyledBox>
  )
}

export default Folder
