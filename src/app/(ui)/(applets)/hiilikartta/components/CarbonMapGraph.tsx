import React, { useEffect, useRef, useState } from 'react'
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
  const [tooltipData, setTooltipData] = useState<{
    x: number
    y: number
    zonType: string
    carbonValue: number
  } | null>(null)

  const textRef1 = useRef<SVGTextElement | null>(null)
  const textRef2 = useRef<SVGTextElement | null>(null)

  const [tooltipWidth, setTooltipWidth] = useState(0)

  useEffect(() => {
    const width1 = textRef1.current ? textRef1.current.getBBox().width : 0
    const width2 = textRef2.current ? textRef2.current.getBBox().width : 0
    setTooltipWidth(Math.max(width1, width2) + 10) // 10 for some padding
  }, [tooltipData]) // re-compute whenever tooltipData changes

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

  const handleMouseOut = () => {
    setTooltipData(null)
  }

  const adjustedTooltipPosition = (
    x: number,
    y: number,
    tooltipWidth: number,
    tooltipHeight: number
  ) => {
    // Adjust if tooltip goes beyond the right boundary
    if (x + tooltipWidth > width) {
      x -= tooltipWidth
    }

    // Adjust if tooltip goes beyond the bottom boundary
    if (y + tooltipHeight > height) {
      y -= tooltipHeight
    }

    // Ensure tooltip isn't positioned beyond the left or top boundaries
    x = Math.max(x, 0)
    y = Math.max(y, 0)

    return [x, y]
  }

  const [adjX, adjY] = adjustedTooltipPosition(
    tooltipData?.x || 0,
    tooltipData?.y || 0,
    tooltipWidth,
    50
  )

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill={'none'} rx={14} />
      {geojsonData.features.map((feature, i) => {
        const path = pathGenerator(feature)
        const color = colorScale(colorDifference(feature))

        const centroid = pathGenerator.centroid(feature)
        return (
          <g key={`map-feature-${i}`}>
            <path
              d={path || ''}
              fill={color}
              stroke={'black'}
              strokeWidth={1}
              onMouseOver={(e) => handleMouseOver(e, feature)}
              onMouseOut={handleMouseOut}
            />
            <text
              x={centroid[0]}
              y={centroid[1]}
              textAnchor="middle" // Center the text
              fontSize="10" // Adjust font size as needed
              fill="black" // Text color
            >
              {feature.properties.zoning_code}
            </text>
          </g>
        )
      })}
      {tooltipData && (
        <g
          transform={`translate(${adjX}, ${adjY})`}
          onMouseOver={(e) => e.stopPropagation()}
        >
          <rect width={tooltipWidth} height={50} fill="white" stroke="black" />
          <text ref={textRef1} x={5} y={15} pointer-events="bounding-box">
            Kaavamerkintä: {tooltipData.zonType}
          </text>
          <text ref={textRef2} x={5} y={35} pointer-events="bounding-box">
            {tooltipData.carbonValue.toFixed(2)} tCO2e / ha
          </text>
        </g>
      )}
    </svg>
  )
}

export default CarbonMapGraph
