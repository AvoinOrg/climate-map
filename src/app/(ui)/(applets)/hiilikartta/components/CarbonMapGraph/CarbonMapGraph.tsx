import React, { useEffect, useRef, useState } from 'react'
import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import CarbonMapGraphMap from './CarbonMapGraphMap'

type Props = {
  planConfs: PlanConfWithReportData[]
}

const CarbonMapGraph = ({ planConfs }: Props) => {
  const [activePlanConfId, setActivePlanConfId] = useState(planConfs[0].id)

  return (
    <CarbonMapGraphMap
      datas={planConfs.map((planConf) => ({
        id: planConf.id,
        name: planConf.name,
        data: planConf.reportData.areas,
      }))}
      activeYear={1234}
      activeDataId={activePlanConfId}
      setActiveDataId={setActivePlanConfId}
    />
  )
}

export default CarbonMapGraph
