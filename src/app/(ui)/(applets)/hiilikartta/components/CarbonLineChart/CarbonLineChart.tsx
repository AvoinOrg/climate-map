import React, { useState, useEffect, useRef } from 'react'
import { Box } from '@mui/material'

import { CalcFeatureCollection } from '../../common/types'
import CarbonLineChartInner from './CarbonLineChartInner'

interface Props {
  data: CalcFeatureCollection[]
  featureYears: string[]
  planNames: string[]
  useHaVals: boolean
}

const MIN_WIDTH = 700 // Define a minimum width for the chart

const CarbonLineChart = ({
  data,
  featureYears,
  planNames,
  useHaVals = false,
}: Props) => {
  const [width, setWidth] = useState(800) // Start with a default width
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

  return (
    <Box ref={boxRef} sx={{ overflowX: 'auto' }}>
      <CarbonLineChartInner
        data={data}
        featureYears={featureYears}
        planNames={planNames}
        useHaVals={useHaVals}
        width={width}
        height={500}
      />
    </Box>
  )
}

export default CarbonLineChart
