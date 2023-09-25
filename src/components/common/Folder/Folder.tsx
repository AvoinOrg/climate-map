import React from 'react'
import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/system'
import SvgFolder from './SvgFolder'
import { useTheme } from '@mui/material/styles'
import { resolveColor } from '#/common/utils/styling'

type Props = {
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

const Folder = ({ children, sx }: Props) => {
  const theme = useTheme()
  let color = theme.palette.neutral.darker
  let borderColor = theme.palette.neutral.main
  let backgroundColor = theme.palette.neutral.lighter

  if (sx && typeof sx === 'object') {
    if ('color' in sx && typeof sx.color === 'string') {
      color = resolveColor(sx.color, theme)
    }
    if ('borderColor' in sx && typeof sx.borderColor === 'string') {
      borderColor = resolveColor(sx.borderColor, theme)
    }
    if ('backgroundColor' in sx && typeof sx.backgroundColor === 'string') {
      backgroundColor = resolveColor(sx.backgroundColor, theme)
    }
  }

  if (sx && 'backgroundColor' in sx) {
    delete sx.backgroundColor
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        display: 'inline-block',
        ...mainStyles,
      }}
    >
      <SvgFolder
        sx={{ width: '100%', height: 'auto', display: 'block' }}
        color={backgroundColor}
        borderColor={borderColor}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0, // Adjust accordingly to position content inside folder SVG
          right: 0,
          left: 0,
          overflow: 'auto',
          p: 1,
          pt: 3,
          ...paddingStyles,
        }}
        className="folder-content"
      >
        {children}
      </Box>
    </Box>
  )
}

export default Folder
