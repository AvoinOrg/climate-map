import React, { use, useCallback, useMemo, useRef, useState } from 'react'
import { Group } from '@visx/group'
import { scaleLinear } from '@visx/scale'
import { AxisLeft, AxisBottom } from '@visx/axis'
import { Line, LinePath } from '@visx/shape'
import { extent } from 'd3-array'
import { LinearGradient } from '@visx/gradient'
import { GridRows, GridColumns } from '@visx/grid'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { localPoint } from '@visx/event'
import { GlyphCircle } from '@visx/glyph'
import { useTranslate } from '@tolgee/react'
import { scaleOrdinal } from 'd3-scale'
import { schemeCategory10 } from 'd3-scale-chromatic'
import { useTheme } from '@mui/material/styles'

import { CalcFeatureCollection, UnitType } from '../../common/types'
import { pp } from '#/common/utils/general'
import { LegendOrdinal } from '@visx/legend'
import { Box, Typography } from '@mui/material'

type DataItem = {
  valHa: number
  valTotal: number
  year: number
  lineIndex?: number
}

interface Props {
  data: CalcFeatureCollection[]
  featureYears: string[]
  planNames: string[]
  width: number
  height: number
  unitType?: UnitType
}

const CarbonLineChartInner = ({
  data,
  featureYears,
  planNames,
  width,
  height,
  unitType = 'ha',
}: Props) => {
  const {
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0,
    showTooltip,
    hideTooltip,
  } = useTooltip<DataItem[]>()

  const { t } = useTranslate('hiilikartta')
  const units = {
    ha: t('report.carbon_line_chart.tooltip_unit_ha'),
    total: t('report.carbon_line_chart.tooltip_unit_total'),
  }
  const theme = useTheme()
  const textStyle = {
    fontSize: theme.typography.body2.fontSize,
    fontFamily: theme.typography.body2.fontFamily,
    fontWeight: theme.typography.body2.fontWeight,
    letterSpacing: theme.typography.body2.letterSpacing,
  }

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

  const [lineVisibility, setLineVisibility] = useState(
    new Array(localPlanNames.length).fill(true)
  )

  const toggleLineVisibility = useCallback((index: number) => {
    setLineVisibility((currentVisibility) => {
      const newVisibility = [...currentVisibility]
      newVisibility[index] = !newVisibility[index]
      return newVisibility
    })
  }, [])

  const colorScale = useMemo(() => {
    return scaleOrdinal(schemeCategory10).domain(
      localPlanNames.map((_, index) => index.toString())
    )
  }, [localPlanNames])
  const getColorForIndex = (index: number): string => {
    return colorScale('' + index) as string
  }

  const margin = { top: 40, right: 40, bottom: 40, left: 80 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const getValue = (d: DataItem) => {
    if (unitType === 'ha') {
      return d.valHa
    }
    return d.valTotal
  }
  const getYear = (d: DataItem) => d.year

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

  const yAxisFormatter = useMemo(() => {
    // TODO: adjust the locale dynamically
    const formatter = new Intl.NumberFormat('en-FI', {
      maximumFractionDigits: 0,
    })
    return (value: any) => formatter.format(value)
  }, [])

  const tooltipStyles = {
    ...defaultStyles,
    minWidth: 60,
    backgroundColor: 'white',
    color: 'black',
  }

  const handleTooltip = useCallback(
    (
      event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>
    ) => {
      const { x } = localPoint(event) || { x: 0 }
      const x0 = xScale.invert(x - margin.left)

      // Find the closest year to the mouse position
      const closestYear = featureYears.reduce((prev, curr) =>
        Math.abs(Number(curr) - x0) < Math.abs(Number(prev) - x0) ? curr : prev
      )

      const tooltipData = getDataForYear(Number(closestYear)).filter(
        (_, i) => lineVisibility[i]
      )
      for (let i = 0; i < tooltipData.length; i++) {
        tooltipData[i].lineIndex = i
      }
      if (tooltipData.length > 0) {
        const tooltipLeftPosition = xScale(Number(closestYear)) + margin.left
        showTooltip({
          tooltipData,
          tooltipLeft: tooltipLeftPosition,
          tooltipTop: yScale(getValue(tooltipData[0])),
        })
      } else {
        hideTooltip()
      }
    },
    [
      showTooltip,
      hideTooltip,
      xScale,
      yScale,
      featureYears,
      getDataForYear,
      getValue,
      lineVisibility,
    ]
  )

  const sortedTooltipData = useMemo(() => {
    if (tooltipData != null) {
      return [...tooltipData].sort((a, b) => getValue(b) - getValue(a))
    }
  }, [tooltipData])

  const ChartLegend = () => {
    return (
      <Box sx={{ mt: 1, ml: 9.5 }}>
        <LegendOrdinal
          scale={colorScale}
          labelFormat={(label) => localPlanNames[parseInt(label, 10)]}
          direction="row"
          itemMargin="8px 8px 8px 0"
          legendLabelProps={{ color: 'black' }}
          style={{
            paddingLeft: 0,
            color: 'black',
            display: 'flex',
            flexWrap: 'wrap', // Allows wrapping
          }}
        >
          {(labels) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
              }}
            >
              {labels.map((label, i) => {
                const color = getColorForIndex(i)
                return (
                  <div
                    key={`legend-${i}`}
                    onClick={() => toggleLineVisibility(i)}
                    style={{
                      cursor: 'pointer',
                      marginRight: '2rem',
                      marginTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width={15} height={15}>
                      <rect
                        fill={lineVisibility[i] ? color : '#FFF'}
                        width={15}
                        height={15}
                        stroke={color}
                        strokeWidth={3}
                      />
                    </svg>
                    <span style={{ marginLeft: 5, ...textStyle }}>
                      {label.text}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </LegendOrdinal>
      </Box>
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
            tickFormat={yAxisFormatter}
            tickLabelProps={(value) => ({
              fill: value < 0 ? 'transparent' : 'black', // Hide labels below 0
              textAnchor: 'end',
              dx: '-0.3rem',
              ...textStyle,
            })}
          />
          <text
            x={-10} // Adjust as necessary for horizontal positioning
            y={height - margin.bottom - 18} // Adjust for vertical positioning
            style={{ textAnchor: 'end', ...textStyle }}
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
              textAnchor: 'middle',
              dy: '0.4rem',
              ...textStyle,
            })}
          />
          {localData.map(
            (sData, i) =>
              lineVisibility[i] && (
                <LinePath
                  key={i}
                  stroke={getColorForIndex(i)}
                  strokeWidth={3}
                  data={sData}
                  x={(d) => xScale(+getYear(d)) ?? 0}
                  y={(d) => yScale(getValue(d)) ?? 0}
                />
              )
          )}
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
            tooltipData.map(
              (d, i) =>
                lineVisibility[i] && (
                  <g key={i}>
                    <Line
                      from={{ x: tooltipLeft - margin.left, y: 0 }}
                      to={{ x: tooltipLeft - margin.left, y: innerHeight }}
                      stroke={'gray'}
                      strokeWidth={2}
                      pointerEvents="none"
                      strokeDasharray="4,2"
                      opacity={0.5}
                    />
                    <GlyphCircle
                      left={tooltipLeft - margin.left}
                      top={yScale(getValue(d)) + 2}
                      size={110}
                      fill={getColorForIndex(i)}
                      stroke={'white'}
                      strokeWidth={2}
                    />
                  </g>
                )
            )}
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
      {sortedTooltipData && sortedTooltipData.length > 0 && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <Typography sx={{ mb: 1.5, ml: '18px', typography: 'body2' }}>
            {t('report.carbon_line_chart.tooltip_year')}
            <b>{` ${sortedTooltipData[0].year}`}</b>
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedTooltipData.map(
              (d) =>
                d.lineIndex != null && (
                  <Box
                    key={d.lineIndex}
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <Box sx={{}}>
                      <Box
                        sx={{
                          width: '10px',
                          height: '10px',
                          backgroundColor: getColorForIndex(d.lineIndex),
                          display: 'inline-flex',
                          mr: 1,
                        }}
                      ></Box>
                      <Typography
                        sx={{ display: 'inline', typography: 'body2' }}
                      >{`${localPlanNames[d.lineIndex]}:`}</Typography>
                    </Box>
                    <Typography
                      sx={{ ml: 1, display: 'inline', typography: 'body2' }}
                    >
                      <b>{`${pp(getValue(d), 2)} `}</b>
                      {`${units[unitType]}`}
                    </Typography>
                  </Box>
                )
            )}
          </Box>
        </TooltipWithBounds>
      )}
      <ChartLegend />
    </div>
  )
}

export default CarbonLineChartInner
