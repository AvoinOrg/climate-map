// The goal of this component is to be a folder shaped div,
// that can be styled like any other div element. This is not straightforward
// as the folder is an SVG element.
//
// That is why some of the props and styling elements are
// captured and passed to the underlying components.

import React from 'react'
import { Box } from '@mui/material'
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

  // Capturing various styling props and passing them later
  // to relevant components
  if (sx && typeof sx === 'object') {
    if ('color' in sx && typeof sx.color === 'string') {
      color = resolveColor(sx.color, theme)
    }
    if ('borderColor' in sx && typeof sx.borderColor === 'string') {
      borderColor = resolveColor(sx.borderColor, theme)
    }
    if ('backgroundColor' in sx && typeof sx.backgroundColor === 'string') {
      backgroundColor = resolveColor(sx.backgroundColor, theme)
      delete sx.backgroundColor
    }
  }

  // iterating through the sx and picking out the padding props
  const paddingProps = [
    'p',
    'px',
    'py',
    'pt',
    'pb',
    'pl',
    'pr',
    'padding',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
  ]
  const paddingStyles: Record<string, any> = {}
  const mainStyles: Record<string, any> = {}

  if (sx && typeof sx === 'object') {
    Object.keys(sx).forEach((key) => {
      if (paddingProps.includes(key)) {
        // Explicit casting as the key comes from the predefined set of keys
        paddingStyles[key as keyof SxProps<Theme>] =
          sx[key as keyof SxProps<Theme>]
      } else {
        mainStyles[key as keyof SxProps<Theme>] =
          sx[key as keyof SxProps<Theme>]
      }
    })
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
          top: 0,
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
