import React from 'react'
import { CalcFeatureCollection } from '../common/types'
import { geoBounds, geoPath, geoMercator } from 'd3-geo'

const width = 600
const height = 600

interface FeatureShape {
  type: 'Feature'
  id: string
  geometry: { coordinates: [number, number][][]; type: 'Polygon' }
  properties: {}
}

type Props = {
  geojsonData: CalcFeatureCollection
}

const CarbonMapGraph = ({ geojsonData }: Props) => {
  const bounds = geoBounds(geojsonData)
  const [[x0, y0], [x1, y1]] = bounds

  // Create a Mercator projection with the given bounds and dimensions
  const projection = geoMercator().fitSize([width, height], geojsonData)

  const pathGenerator = geoPath().projection(projection)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill={'none'} rx={14} />
      {geojsonData.features.map((feature, i) => {
        const path = pathGenerator(feature)
        return (
          <path
            key={`map-feature-${i}`}
            d={path || ''}
            fill={'red'}
            stroke={'black'}
            strokeWidth={1}
          />
        )
      })}
    </svg>
  )
}

export default CarbonMapGraph
