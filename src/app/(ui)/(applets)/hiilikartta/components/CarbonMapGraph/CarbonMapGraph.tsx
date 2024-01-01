import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'

import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import CarbonMapGraphMap from './CarbonMapGraphMap'
import CarbonChangeLegend from '../CarbonChangeLegend'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
}

const CarbonMapGraph = ({ planConfs, featureYears }: Props) => {
  const [activePlanConfId, setActivePlanConfId] = useState(planConfs[0].id)
  const [activeYear, setActiveYear] = useState(featureYears[0])

  return (
    <Box>
      <CarbonChangeLegend></CarbonChangeLegend>
      <CarbonMapGraphMap
        datas={planConfs.map((planConf) => ({
          id: planConf.id,
          name: planConf.name,
          data: planConf.reportData.areas,
        }))}
        activeYear={activeYear}
        featureYears={featureYears}
        setActiveYear={setActiveYear}
        activeDataId={activePlanConfId}
        setActiveDataId={setActivePlanConfId}
      />
    </Box>
  )
}

export default CarbonMapGraph
