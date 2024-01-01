import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box } from '@mui/material'
import { cloneDeep } from 'lodash-es'
import { useTranslate } from '@tolgee/react'

import {
  featureCols,
  PlanConfWithReportData,
  ZONING_CODE_COL,
} from 'applets/hiilikartta/common/types'
import CarbonMapGraphMap from './CarbonMapGraphMap'
import CarbonChangeLegend from '../CarbonChangeLegend'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
}

const CarbonMapGraph = ({ planConfs, featureYears }: Props) => {
  const { t } = useTranslate('hiilikartta')
  const [activePlanConfId, setActivePlanConfId] = useState(planConfs[0].id)
  const [activeYear, setActiveYear] = useState(featureYears[0])

  const datas = useMemo(() => {
    let datas = planConfs.map((planConf) => ({
      id: planConf.id,
      name: planConf.name,
      data: planConf.reportData.areas,
    }))

    const currentSituation = cloneDeep(datas[0])
    for (const feature of currentSituation.data.features) {
      featureCols.forEach((propertyKey) => {
        const property = feature.properties[propertyKey]
        if (property && property.planned && property.nochange) {
          // Update each planned year with the corresponding nochange value
          Object.keys(property.planned).forEach((year) => {
            property.planned[year] =
              property.nochange[year] ?? property.planned[year]
          })
        }
        feature.properties[ZONING_CODE_COL] = 'none'
      })
    }
    currentSituation.id = currentSituation.id + '-current'
    currentSituation.name = t('report.general.current_situation')

    datas = [currentSituation, ...datas]

    return datas
  }, [planConfs])

  return (
    <Box>
      <CarbonChangeLegend></CarbonChangeLegend>
      <CarbonMapGraphMap
        datas={datas}
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
