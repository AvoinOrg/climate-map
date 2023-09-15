import React from 'react'
import { LinePath } from '@visx/shape'
import { scaleLinear, scaleBand } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'

import { CalcFeatureCollection, featureYears } from '../common/types'

const width = 600
const height = 400
const margin = { top: 20, right: 20, bottom: 50, left: 50 }

type Point = {
  year: string
  value: number
}

type Props = {
  data: CalcFeatureCollection
}

const CarbonLineChart = ({ data }: Props) => {
  // Extract data
  const nochangeData: Point[] = featureYears.map((year) => ({
    year,
    value:
      data.features[0].properties.bio_carbon_per_area.nochange[year] +
      data.features[0].properties.ground_carbon_per_area.nochange[year],
  }))
  const plannedData: Point[] = featureYears.map((year) => ({
    year,
    value:
      data.features[0].properties.bio_carbon_per_area.planned[year] +
      data.features[0].properties.ground_carbon_per_area.planned[year],
  }))

  // Scales
  const xScale = scaleBand<string>({
    domain: featureYears,
    range: [margin.left, width - margin.right],
    padding: 0.1,
  })

  const yMax = Math.max(
    ...nochangeData.map((d) => d.value),
    ...plannedData.map((d) => d.value)
  )

  // Add some padding, for example 10%
  const paddedYMax = yMax * 1.1

  const yScale = scaleLinear({
    domain: [0, paddedYMax],
    range: [height - margin.bottom, margin.top],
  })

  const legendItems = [
    { color: 'blue', label: 'ei muutosta' },
    { color: 'red', label: 'kaava' },
  ]

  const legendPadding = 10
  const legendX = width - margin.right - legendPadding
  const legendY =
    height - margin.bottom - legendItems.length * 20 - legendPadding

  return (
    <svg width={width} height={height}>
      {/* Nochange Line */}
      <LinePath
        data={nochangeData}
        x={(d) => xScale(d.year) + xScale.bandwidth() / 2}
        y={(d) => yScale(d.value)}
        stroke="blue"
        strokeWidth={2}
      />

      <LinePath
        data={plannedData}
        x={(d) => xScale(d.year) + xScale.bandwidth() / 2}
        y={(d) => yScale(d.value)}
        stroke="red"
        strokeWidth={2}
      />

      <AxisBottom
        scale={xScale}
        top={height - margin.bottom}
        left={0}
        tickFormat={(value) => (value === 'now' ? 'nykytila' : value)}
      />

      <AxisLeft scale={yScale} top={0} left={margin.left} />
      <text
        x={margin.left} // Adjust as necessary for horizontal positioning
        y={height - margin.bottom + 20} // Adjust for vertical positioning
        style={{ fontSize: '12px', textAnchor: 'end' }}
      >
        tCO2e
      </text>
      <g transform={`translate(${legendX}, ${legendY})`}>
        {legendItems.map((item, index) => (
          <g key={item.label} transform={`translate(0, ${index * 20})`}>
            <text
              x={-20 - 5} // Position text to left of the rectangle with 5-pixel gap
              y={12}
              textAnchor="end" // This ensures text aligns to its rightmost edge
              style={{ userSelect: 'none', fontSize: '12px' }}
            >
              {item.label}
            </text>
            <rect x={-20} width={15} height={15} fill={item.color} />
          </g>
        ))}
      </g>
    </svg>
  )
}

export default CarbonLineChart
