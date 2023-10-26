import React from 'react'
import type { SVGProps } from 'react'
import { Box } from '@mui/material'

type Props = SVGProps<SVGSVGElement> & {
  color?: string
  borderColor?: string
  height?: number
  sx?: any
}

const SvgFolder = ({ color, borderColor, height = 86, sx }: Props) => {
  // Default height set to 86
  const bottomY = 11 + height // Compute the y-coordinate for the bottom part

  return (
    <Box
      component="svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`9 5 348 ${height + 10}`} // Dynamic viewBox based on height
      fill="none"
      sx={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.15))', ...sx }}
    >
      <g>
        <path
          d={`M10.5 ${bottomY}V11C10.5 8.51472 12.5147 6.5 15 6.5H60.7511C61.7324 6.5 62.6869 6.82079 63.469 7.4135L80.7143 20.4822C81.6702 21.2066 82.8367 21.5987 84.0361 21.5987H350C352.485 21.5987 354.5 23.6134 354.5 26.0987V${bottomY}C354.5 ${
            bottomY + 2.485
          } 352.485 ${bottomY + 4.5} 350 ${bottomY + 4.5}H15C12.5147 ${
            bottomY + 4.5
          } 10.5 ${bottomY + 2.485} 10.5 ${bottomY}`}
          stroke={borderColor ? borderColor : color}
          fill={color}
        />
      </g>
    </Box>
  )
}

export default SvgFolder
