import React from 'react'
import { CalcFeatureCollection } from '../common/types'
import { geoBounds, geoPath, geoMercator } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { extent } from 'd3-array'

const width = 600
const height = 600

interface FeatureShape {
  type: 'Feature'
  id: string
  geometry: { coordinates: [number, number][][]; type: 'Polygon' }
  properties: {
    bio_carbon_per_area: {
      planned: { [year: string]: number }
      nochange: { [year: string]: number }
    }
    ground_carbon_per_area: {
      planned: { [year: string]: number }
      nochange: { [year: string]: number }
    }
    zoning_code: string
  }
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

  const colorDifference = (feature: FeatureShape) =>
    feature.properties.bio_carbon_per_area.planned['2035'] +
    feature.properties.ground_carbon_per_area.planned['2035'] -
    (feature.properties.bio_carbon_per_area.nochange['2035'] +
      feature.properties.ground_carbon_per_area.nochange['2035'])

  const calculatedDomain = extent(geojsonData.features, colorDifference)
  const colorDomain =
    calculatedDomain[0] === undefined || calculatedDomain[1] === undefined
      ? [0, 0]
      : calculatedDomain
  const colorScale = scaleLinear<string>()
    .domain(colorDomain as [number, number]) // Type assertion here
    .range(['#FF0000', '#FFFFFF'])

  const handleMouseOver = (
    event: React.MouseEvent<SVGPathElement, MouseEvent>,
    feature: FeatureShape
  ) => {
    const [x, y] = pathGenerator.centroid(feature)
    const carbonValue = colorDifference(feature)
    setTooltipData({
      x,
      y,
      zonType: feature.properties.zoning_code, // Assuming the property is now called zoning_code
      carbonValue,
    })
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill={'none'} rx={14} />
      {geojsonData.features.map((feature, i) => {
        const path = pathGenerator(feature)
        const color = colorScale(colorDifference(feature))
        return (
          <g key={`map-feature-${i}`}>
            <path
              d={path || ''}
              fill={color}
              stroke={'black'}
              strokeWidth={1}
          </g>
        )
      })}
    </svg>
  )
}

export default CarbonMapGraph
