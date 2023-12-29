import React, { useEffect, useRef, useState } from 'react'
import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import CarbonMapGraphMap from './CarbonMapGraphMap'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
}

const CarbonMapGraph = ({ planConfs, featureYears }: Props) => {
  const [activePlanConfId, setActivePlanConfId] = useState(planConfs[0].id)
  const [activeYear, setActiveYear] = useState(featureYears[0])

  return (
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
  )
}

export default CarbonMapGraph
