import React from 'react'
import type { SVGProps } from 'react'
import { Box } from '@mui/material'

type Props = SVGProps<SVGSVGElement> & {
  color?: string
  borderColor?: string
  sx?: any
}

const SvgFolder = ({ color, borderColor, sx }: Props) => (
  <Box
    component="svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="9 5 348 137"
    fill="none"
    sx={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.15))', ...sx }}
  >
    <g>
      <path
        d="M10.5 136V11C10.5 8.51472 12.5147 6.5 15 6.5H60.7511C61.7324 6.5 62.6869 6.82079 63.469 7.4135L80.7143 20.4822C81.6702 21.2066 82.8367 21.5987 84.0361 21.5987H350C352.485 21.5987 354.5 23.6134 354.5 26.0987V136C354.5 138.485 352.485 140.5 350 140.5H15C12.5147 140.5 10.5 138.485 10.5 136Z"
        stroke={borderColor ? borderColor : color}
        fill={color}
      />
    </g>
  </Box>
)

export default SvgFolder
