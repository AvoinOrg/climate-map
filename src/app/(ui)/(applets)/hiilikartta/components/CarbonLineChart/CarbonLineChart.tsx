import React, { useState, useEffect, useRef } from 'react'
import { Box, ToggleButton, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

import { CalcFeatureCollection, UnitType } from '../../common/types'
import CarbonLineChartInner from './CarbonLineChartInner'
import { T } from '@tolgee/react'

interface Props {
  data: CalcFeatureCollection[]
  featureYears: string[]
  planNames: string[]
}

const MIN_WIDTH = 700 // Define a minimum width for the chart

const CarbonLineChart = ({ data, featureYears, planNames }: Props) => {
  const [width, setWidth] = useState(800) // Start with a default width
  const [unitType, setUnitType] = React.useState<UnitType>('ha')
  const boxRef = useRef(null) // Ref for the container Box

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0].contentRect.width > MIN_WIDTH) {
        setWidth(entries[0].contentRect.width)
      } else {
        setWidth(MIN_WIDTH)
      }
    })

    if (boxRef.current) {
      resizeObserver.observe(boxRef.current)
    }

    return () => {
      if (boxRef.current) {
        resizeObserver.unobserve(boxRef.current)
      }
    }
  }, [boxRef])

  const handleUnitTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCalcType: UnitType
  ) => {
    setUnitType(newCalcType)
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mt: { xs: 0, md: 2.5 }, ml: { xs: 0, md: 2.5 } }}>
        <Typography
          sx={(theme) => ({
            typography: theme.typography.h1,
            display: 'inline',
          })}
        >
          <T keyName="report.carbon_line_chart.title" ns={'hiilikartta'}></T>{' '}
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'inline-flex',
          flexDirection: 'row',
          mt: 10,
          ml: 10,
        }}
      >
        <StyledToggleButton
          value="ha"
          aria-label="ha"
          sx={{ typography: 'body7', letterSpacing: 'normal' }}
          selected={unitType === 'ha'}
          onChange={handleUnitTypeChange}
        >
          <T
            ns="hiilikartta"
            keyName={'report.carbon_line_chart.unit_select_ha'}
          ></T>
        </StyledToggleButton>
        <StyledToggleButton
          value="total"
          aria-label="total"
          sx={{
            typography: 'body7',
            letterSpacing: 'normal',
            ml: 0.5,
          }}
          selected={unitType === 'total'}
          onChange={handleUnitTypeChange}
        >
          <T
            ns="hiilikartta"
            keyName={'report.carbon_line_chart.unit_select_total'}
          ></T>
        </StyledToggleButton>
      </Box>
      <Box ref={boxRef} sx={{ width: '100%', overflowX: 'auto', pb: 2.5 }}>
        <CarbonLineChartInner
          data={data}
          featureYears={featureYears}
          planNames={planNames}
          unitType={unitType}
          width={width}
          height={500}
        />
      </Box>
    </Box>
  )
}

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  borderRadius: '0.3125rem',
  border: '1px solid',
  borderColor: theme.palette.primary.dark,
  color: theme.palette.neutral.darker,
  width: '8.5rem',
  whiteSpace: 'normal',
  textTransform: 'none',
  wordBreak: 'break-word',
  marginBottom: '0.75rem',
  paddingLeft: '1.25rem',
  paddingRight: '1.25rem',
  textAlign: 'left',
  display: 'flex',
  justifyContent: 'flex-start',
  '&.Mui-selected': {
    borderColor: theme.palette.secondary.dark,
    backgroundColor: theme.palette.neutral.lighter,
  },
}))

export default CarbonLineChart
