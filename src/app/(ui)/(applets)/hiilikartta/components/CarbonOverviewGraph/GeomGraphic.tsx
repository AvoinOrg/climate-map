import React from 'react'
import { geoPath, geoMercator } from 'd3-geo'
import { Box, SxProps, Theme } from '@mui/material'
import { CalcFeatureCollection } from '../../common/types'
import {
  getCarbonChangeColor,
  getCarbonValueForProperties,
} from 'applets/hiilikartta/common/utils'

type Props = {
  calcFeatures: CalcFeatureCollection
  year: string
  width: number
  height: number
  sx?: SxProps<Theme>
}

const GeomGraphic = ({ calcFeatures, year, width, height, sx }: Props) => {
  const projection = geoMercator().fitSize([width, height], calcFeatures)
  const pathGenerator = geoPath().projection(projection)

  const bounds = geoPath().projection(projection).bounds(calcFeatures)
  const viewBoxY = bounds[0][1] // Use only the top y-coordinate of the bounds

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
        {calcFeatures.features.map((feature, index) => {
          const path = pathGenerator(feature)
          const carbonValue = getCarbonValueForProperties(
            feature.properties,
            year,
            'total'
          )
          const color = getCarbonChangeColor(carbonValue)

          return (
            <path
              key={index}
              d={path || ''}
              fill={color}
              stroke={'black'}
              strokeWidth={1}
            />
          )
        })}
      </g>
    </Box>
  )
}

export default GeomGraphic
