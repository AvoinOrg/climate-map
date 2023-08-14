import React from 'react'
import { Box, styled } from '@mui/material'
import type { SxProps, Theme } from '@mui/system'
import SvgFolder from './SvgFolder'

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
    top: 45, // Adjust accordingly to position content inside folder SVG
    left: 20, // Adjust accordingly
    right: 20,
    bottom: 20,
    overflow: 'auto',
  },
}))

type Props = {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

const Folder = ({ children, sx }: Props) => {
  const backgroundColor =
    sx &&
    typeof sx === 'object' &&
    'backgroundColor' in sx &&
    typeof sx.backgroundColor === 'string'
      ? sx.backgroundColor
      : '#AFB39A'

  return (
    <StyledBox sx={sx}>
      <SvgFolder color={backgroundColor || '#AFB39A'} />
      <SvgFolder />
      <div className="content">{children}</div>
    </StyledBox>
  )
}

export default Folder
