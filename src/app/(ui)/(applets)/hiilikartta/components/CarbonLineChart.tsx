import { useCallback } from 'react'
import { Group } from '@visx/group'
import { scaleLinear, scaleBand } from '@visx/scale'
import { AxisLeft, AxisBottom } from '@visx/axis'
import { Line, LinePath } from '@visx/shape'
import { extent, bisector } from 'd3-array'
import { LinearGradient } from '@visx/gradient'
import { GridRows, GridColumns } from '@visx/grid'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { localPoint } from '@visx/event'
import { LegendOrdinal } from '@visx/legend'
import { scaleOrdinal } from 'd3-scale'

import { CalcFeatureCollection } from '../common/types'
import { pp } from '#/common/utils/general'
import { Chart } from 'chart.js'

const width = 600
const height = 400
const margin = { top: 20, right: 20, bottom: 50, left: 50 }

type Point = {
  year: string
  value: number
}

type Props = {
  data: CalcFeatureCollection[]
  featureYears: string[]
  planNames: string[]
}

const CarbonLineChart = ({ data, featureYears, planNames }: Props) => {
  // tooltip parameters
  const {
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
    showTooltip,
    hideTooltip,
  } = useTooltip()

  // defining inner measurements
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // data for lines
  const nochangeData: Point[] = featureYears.map((year) => ({
    year,
    value:
      data[0].features[0].properties.bio_carbon_ha.nochange[year] +
      data[0].features[0].properties.ground_carbon_ha.nochange[year],
  }))

  const plannedDatas: Point[][] = data.map((calc) => {
    return featureYears.map((year) => ({
      year,
      value:
        calc.features[0].properties.bio_carbon_ha.planned[year] +
        calc.features[0].properties.ground_carbon_ha.planned[year],
    }))
  })

  const series = [nochangeData, ...plannedDatas]
  const flatSeries = series.flat()

  //colors for lines
  const colors = ['red', 'blue', 'orange']

  // Defining selector functions
  const getValue = (d: Point) => Math.round(d.value, 2)
  const getYear = (d: Point) => Number(d.year)
  const bisectDate = bisector((d: Point) => d.year).left

  // get data from a year
  const getDataForYear = (year: string) => {
    const output = flatSeries.filter((el) => {
      return el.year === year
    })
    return output
  }

  // to remove comma from date
  const formatDate = (year: string) => year.toString()

  // Defining scales
  // horizontal, x scale
  const xScale = scaleBand<string>({
    domain: featureYears,
    range: [margin.left, width - margin.right],
    padding: 0.1,
  })

  const yMax = Math.max(
    ...nochangeData.map((d) => d.value),
    ...plannedDatas.flatMap((plannedData) => plannedData.map((d) => d.value))
  )

  // Add some padding, for example 10%
  const paddedYMax = yMax * 1.1

  const yScale = scaleLinear({
    domain: [-10, paddedYMax],
    range: [height - margin.bottom, margin.top],
  })

  // defining tooltip styles
  const tooltipStyles = {
    ...defaultStyles,
    minWidth: 60,
    backgroundColor: 'white',
    color: 'black',
  }

  const handleTooltip = useCallback(
    (event: any) => {
      const { x } = localPoint(event) || { x: 0 }
      const domain = xScale.domain()
      const step = xScale.step()
      const xIndex = Math.floor((x - margin.left) / step)
      const x0 = domain[Math.max(0, Math.min(xIndex, domain.length - 1))]

      const index = bisectDate(series[0], x0, 1)
      let d = series[0][index]

      // if (d1 && getYear(d1)) {
      //   d =
      //     x0.valueOf() - getYear(d0).valueOf() >
      //     getYear(d1).valueOf() - x0.valueOf()
      //       ? d1
      //       : d0
      // }
      showTooltip({
        tooltipData: getDataForYear(d.year),
        tooltipLeft: x,
        tooltipTop: yScale(getValue(d)),
      })
    },
    [data, featureYears]
  )

  const colorScale = scaleOrdinal()
    .domain(['ilman muutosta'].concat(...planNames))
    .range(colors)

  const ChartLegend = () => {
    // const { colorScale, theme, margin } = useContext(DataContext)

    return (
      <LegendOrdinal
        direction="row"
        itemMargin="8px 8px 8px 0"
        scale={colorScale}
        // labelFormat={(label) => label.replace('-', ' ')}
        legendLabelProps={{ color: 'white' }}
        style={{
          // backgroundColor: theme.backgroundColor,
          marginTop: 0,
          paddingLeft: margin.left + 50,
          color: 'black',
          display: 'flex', // required in addition to `direction` if overriding styles
        }}
      />
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        {/* <rect x={0} y={0} width={width} height={height} fill={'none'} rx={14} /> */}
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            height={innerHeight}
            stroke="gray"
            strokeOpacity={0.2}
            left={margin.left}
          />
          <GridColumns
            scale={xScale}
            width={innerWidth}
            height={innerHeight + 25}
            stroke="gray"
            strokeOpacity={0.2}
            top={margin.top}
          />
          <LinearGradient
            id="area-gradient"
            from={'#43b284'}
            to={'#43b284'}
            toOpacity={0.1}
          />
          <AxisLeft scale={yScale} top={0} left={margin.left} />
          <text
            x={margin.left} // Adjust as necessary for horizontal positioning
            y={height - margin.bottom + 20} // Adjust for vertical positioning
            style={{ fontSize: '12px', textAnchor: 'end' }}
          >
            tCO2e
          </text>
          <AxisBottom
            scale={xScale}
            top={height - margin.bottom}
            left={0}
            tickFormat={(value) => (value === 'now' ? 'nykytila' : value)}
          />
          {series.map((sData, i) => (
            <LinePath
              key={i}
              stroke={colors[i]}
              strokeWidth={3}
              data={sData}
              x={(d) => xScale(String(getYear(d))) ?? 0}
              y={(d) => yScale(getValue(d)) ?? 0}
            />
          ))}
          {tooltipData && (
            <g>
              <Line
                from={{ x: tooltipLeft - margin.left, y: margin.top }}
                to={{
                  x: tooltipLeft - margin.left,
                  y: innerHeight + margin.top,
                }}
                stroke={'gray'}
                strokeWidth={2}
                pointerEvents="none"
                strokeDasharray="4,2"
                opacity={0.5}
              />
            </g>
          )}
          {/* {tooltipData &&
            tooltipData.map((d, i) => (
              <g>
                <GlyphCircle
                  left={tooltipLeft - margin.left}
                  top={yScale(d.amount) + 2}
                  size={110}
                  fill={colors[i]}
                  stroke={'white'}
                  strokeWidth={2}
                />
              </g>
            ))} */}
          <rect
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            onTouchStart={handleTooltip}
            fill={'transparent'}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />
        </Group>
      </svg>
      {/* render a tooltip */}
      {tooltipData ? (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          {tooltipData.map((d, i) => {
            var title = ''
            if (i === 0) {
              title = 'ilman muutosta'
            } else {
              title = planNames[i - 1]
            }
            return (
              <p key={i}>{`${title}: ${getValue(tooltipData[i])} ton/ha`}</p>
            )
          })}
        </TooltipWithBounds>
      ) : null}
      <ChartLegend />
    </div>
  )
}

export default CarbonLineChart
