import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { AxisLeft, AxisBottom } from '@visx/axis'
import { Line, LinePath } from '@visx/shape'
import { bisector, extent } from 'd3-array'
import { LinearGradient } from '@visx/gradient'
import { GridRows, GridColumns } from '@visx/grid'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { localPoint } from '@visx/event'
import { GlyphCircle } from '@visx/glyph'
import { useTranslate } from '@tolgee/react'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'

import { CalcFeatureCollection } from '../common/types'
import { pp } from '#/common/utils/general'
import { range } from 'lodash-es'
import { LegendOrdinal } from '@visx/legend'

type DataItem = {
  valHa: number
  valTotal: number
  year: number
}

interface Props {
  data: CalcFeatureCollection[]
  featureYears: string[]
  planNames: string[]
  width: number
  height: number
  useHaVals: boolean
}

const CarbonLineChart = ({
  data,
  featureYears,
  planNames,
  width,
  height,
  useHaVals = false,
}: Props) => {
  const {
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
    showTooltip,
    hideTooltip,
  } = useTooltip<DataItem[]>()

  const { t } = useTranslate('hiilikartta')

  const localData = useMemo(() => {
    const seriesDatas = []
    for (const item of data) {
      let dataItems: DataItem[] = []
      item.features.forEach((feature) => {
        for (const year of featureYears) {
          if (feature.properties.bio_carbon_ha.planned[year] != null) {
            const valHa =
              feature.properties.bio_carbon_ha.planned[year] +
              feature.properties.ground_carbon_ha.planned[year]

            const valTotal =
              feature.properties.bio_carbon_total.planned[year] +
              feature.properties.ground_carbon_total.planned[year]

            if (valHa != null && valTotal != null) {
              dataItems.push({
                valHa,
                valTotal,
                year: Number(year),
              })
            }
          }
        }
      })

      seriesDatas.push(dataItems)

      dataItems = []

      item.features.forEach((feature) => {
        for (const year of featureYears) {
          if (feature.properties.bio_carbon_ha.nochange[year] != null) {
            const valHa =
              feature.properties.bio_carbon_ha.nochange[year] +
              feature.properties.ground_carbon_ha.nochange[year]

            const valTotal =
              feature.properties.bio_carbon_total.nochange[year] +
              feature.properties.ground_carbon_total.nochange[year]

            if (valHa != null && valTotal != null) {
              dataItems.push({
                valHa,
                valTotal,
                year: Number(year),
              })
            }
          }
        }
      })

      seriesDatas.push(dataItems)
    }

    return seriesDatas
  }, [data, featureYears])

  const localPlanNames = useMemo(() => {
    const currentSituationAppendix = t(
      'report.general.current_situation_appendix'
    )
    const localPlanNames = []

    for (const item of planNames) {
      localPlanNames.push(item)
      localPlanNames.push(item + ' ' + currentSituationAppendix)
    }

    return localPlanNames
  }, [planNames, t])

  const colorDomain = () => {
    const domain = range(localPlanNames.length)
    const domainStr = domain.map((d) => d.toString())
    return domainStr
  }

  const colorScale = useMemo(() => {
    return scaleOrdinal(schemeCategory10).domain(
      localPlanNames.map((_, index) => index.toString())
    )
  }, [localPlanNames])
  const getColorForIndex = (index: number): string => {
    return colorScale('' + index) as string
  }

  const margin = { top: 40, right: 40, bottom: 40, left: 60 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const getValue = (d: DataItem) => {
    if (useHaVals) {
      return d.valHa
    }
    return d.valTotal
  }
  const getYear = (d: DataItem) => d.year
  const bisectDate = bisector<DataItem, string>((d) => d.year).left

  const getDataForYear = (year: number) => {
    const yearData = []
    for (const item of localData) {
      const data = item.find((d) => d.year === year)
      if (data) {
        yearData.push(data)
      }
    }

    return yearData
  }
  // const formatDate = (year: string) => localData.toString()

  const xScale = scaleLinear({
    range: [0, innerWidth],
    domain: extent(localData[0], (d) => +getYear(d)) as [number, number],
    nice: true,
  })

  const yMax = Math.max(
    ...localData.flat().map((d) => getValue(d)) // Flattens all data and maps to the value
  )

  const yScale = scaleLinear({
    range: [innerHeight, 0],
    domain: [-5, yMax],
    nice: true,
  })

  const tooltipStyles = {
    ...defaultStyles,
    minWidth: 60,
    backgroundColor: 'white',
    color: 'black',
  }

  // const handleTooltip = useCallback(
  //   (
  //     event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>
  //   ) => {
  //     const { x } = localPoint(event) || { x: 0 }
  //     const x0 = xScale.invert(x - margin.left)
  //     const index = bisectDate(localData[0], x0 as unknown as string, 1)
  //     const d0 = localData[0][index - 1]
  //     const d1 = localData[0][index]
  //     let d = d0

  //     if (d1 && getYear(d1)) {
  //       d =
  //         x0.valueOf() - getYear(d0).valueOf() >
  //         getYear(d1).valueOf() - x0.valueOf()
  //           ? d1
  //           : d0
  //     }
  //     showTooltip({
  //       tooltipData: getDataForYear(getYear(d)),
  //       tooltipLeft: x,
  //       tooltipTop: yScale(getValue(d)),
  //     })
  //   },
  //   [showTooltip, data, xScale, yScale]
  // )

  // const handleTooltip = useCallback(
  //   (
  //     event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>
  //   ) => {
  //     const { x } = localPoint(event) || { x: 0 }
  //     const x0 = xScale.invert(x - margin.left)

  //     // Find the closest year to the mouse position
  //     const closestYear = featureYears.reduce((prev, curr) => {
  //       return Math.abs(Number(curr) - x0) < Math.abs(Number(prev) - x0)
  //         ? curr
  //         : prev
  //     })

  //     const tooltipData = getDataForYear(Number(closestYear))
  //     const tooltipLeftPosition = xScale(Number(closestYear))

  //     showTooltip({
  //       tooltipData,
  //       tooltipLeft: tooltipLeftPosition,
  //       tooltipTop: yScale(getValue(tooltipData[0])),
  //     })
  //   },
  //   [showTooltip, data, xScale, yScale, featureYears]
  // )

  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>
    ) => {
      const { x } = localPoint(event) || { x: 0 }
      const x0 = xScale.invert(x - margin.left)

      // Find the closest year to the mouse position
      const closestYear = featureYears.reduce((prev, curr) => {
        return Math.abs(Number(curr) - x0) < Math.abs(Number(prev) - x0)
          ? curr
          : prev
      })

      const tooltipData = getDataForYear(Number(closestYear))
      const tooltipLeftPosition = xScale(Number(closestYear)) + margin.left

      showTooltip({
        tooltipData,
        tooltipLeft: tooltipLeftPosition, // Use the mouse's x-coordinate directly for alignment
        tooltipTop: yScale(getValue(tooltipData[0])),
      })
    },
    [showTooltip, xScale, yScale, featureYears, getDataForYear, getValue]
  )

  const ChartLegend = () => {
    return (
      <LegendOrdinal
        direction="row"
        itemMargin="8px 8px 8px 0"
        scale={colorScale}
        labelFormat={(label) => localPlanNames[parseInt(label, 10)]}
        legendLabelProps={{ color: 'black' }}
        style={{
          marginTop: 0,
          paddingLeft: 0,
          color: 'black',
          display: 'flex',
        }}
      />
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fillOpacity={0}
          rx={14}
        />
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerWidth}
            height={innerHeight - margin.top}
            stroke="black"
            strokeOpacity={0.2}
          />
          <GridColumns
            scale={xScale}
            width={innerWidth}
            height={innerHeight}
            stroke="black"
            strokeOpacity={0.2}
          />
          <LinearGradient
            id="area-gradient"
            from={'#43b284'}
            to={'#43b284'}
            toOpacity={0.1}
          />
          <AxisLeft
            scale={yScale}
            stroke={'black'}
            tickStroke={'black'}
            tickLabelProps={(value) => ({
              fill: value < 0 ? 'transparent' : 'black', // Hide labels below 0
              fontSize: 11,
              textAnchor: 'end',
            })}
          />
          <text
            x={-10} // Adjust as necessary for horizontal positioning
            y={height - margin.bottom - 22} // Adjust for vertical positioning
            style={{ fontSize: '12px', textAnchor: 'end' }}
          >
            tCO2e
          </text>
          <AxisBottom
            scale={xScale}
            stroke={'black'}
            top={innerHeight}
            tickFormat={(value) => `${value}`}
            tickStroke={'black'}
            tickLabelProps={(value, index) => ({
              fill: index === 0 ? 'transparent' : 'black', // Hide first item
              fontSize: 11,
              textAnchor: 'middle',
            })}
          />
          {localData.map((sData, i) => (
            <LinePath
              key={i}
              // @ts-ignore
              stroke={getColorForIndex(i)}
              strokeWidth={3}
              data={sData}
              x={(d) => xScale(+getYear(d)) ?? 0}
              y={(d) => yScale(getValue(d)) ?? 0}
            />
          ))}
          {tooltipData && (
            <g>
              <Line
                from={{ x: tooltipLeft - margin.left, y: 0 }}
                to={{ x: tooltipLeft - margin.left, y: innerHeight }}
                stroke={'gray'}
                strokeWidth={2}
                pointerEvents="none"
                strokeDasharray="4,2"
                opacity={0.5}
              />
            </g>
          )}
          {tooltipData &&
            tooltipData.map((d, i) => (
              <g key={i}>
                <GlyphCircle
                  left={tooltipLeft - margin.left}
                  top={yScale(getValue(d)) + 2}
                  size={110}
                  fill={getColorForIndex(i)}
                  stroke={'white'}
                  strokeWidth={2}
                />
              </g>
            ))}
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
            const title = localPlanNames[i]
            return (
              <p key={i}>{`${title}: ${pp(
                getValue(tooltipData[i]),
                2
              )} ton/ha`}</p>
            )
          })}
        </TooltipWithBounds>
      ) : null}
      <ChartLegend />
    </div>
  )
}

export default CarbonLineChart
