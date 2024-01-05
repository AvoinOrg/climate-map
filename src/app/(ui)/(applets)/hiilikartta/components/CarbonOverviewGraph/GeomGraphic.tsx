import React from 'react'
import { geoPath, geoMercator } from 'd3-geo'
import { CalcFeature } from '../../common/types'
import { Box, SxProps, Theme } from '@mui/material'
import {
  getCarbonChangeColor,
  getCarbonValueForProperties,
} from 'applets/hiilikartta/common/utils'

type Props = {
  feature: CalcFeature
  year: string
  width: number
  height: number
  sx?: SxProps<Theme>
}

const GeomGraphic = ({ feature, year, width, height, sx }: Props) => {
  const projection = geoMercator().fitSize([width, height], feature)
  const pathGenerator = geoPath().projection(projection)
  const path = pathGenerator(feature)

  // Get the bounds of the feature using the projection
  const bounds = geoPath().projection(projection).bounds(feature)

  // Align the top of the feature with the top of the SVG
  const viewBoxY = bounds[0][1] // Use only the top y-coordinate of the bounds
  const carbonValue = getCarbonValueForProperties(
    feature.properties,
    year,
    'total'
  )
  const color = getCarbonChangeColor(carbonValue)

  return (
    <Box
      component={'svg'}
      width={width}
      height={height}
      viewBox={`0 ${viewBoxY} ${width} ${height}`}
      sx={[...(Array.isArray(sx) ? sx : [sx])]}
    >
      <rect x={0} y={0} width={width} height={height} fill={'none'} rx={14} />
      <g>
        <path d={path || ''} fill={color} stroke={'black'} strokeWidth={1} />
      </g>
    </Box>
  )
}

export default GeomGraphic
