import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, ToggleButton, Typography } from '@mui/material'
import { cloneDeep } from 'lodash-es'
import { T, useTranslate } from '@tolgee/react'
import { styled } from '@mui/material/styles'

import {
  featureCols,
  PlanConfWithReportData,
  ZONING_CODE_COL,
} from 'applets/hiilikartta/common/types'
import CarbonMapGraphMap from './CarbonMapGraphMap'
import CarbonChangeLegend from '../CarbonChangeLegend'
import { GraphCalcType } from 'applets/hiilikartta/common/types'
import DropDownSelectMinimal from '#/components/common/DropDownSelectMinimal'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
}

const CarbonMapGraph = ({ planConfs, featureYears }: Props) => {
  const { t } = useTranslate('hiilikartta')
  const [activePlanConfId, setActivePlanConfId] = useState(planConfs[0].id)
  const [activeYear, setActiveYear] = useState(featureYears[0])
  const [calcType, setCalcType] = React.useState<GraphCalcType>('total')

  const handleCalcTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCalcType: GraphCalcType
  ) => {
    setCalcType(newCalcType)
  }

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
      <Box
        sx={{
          display: 'flex',
          flexDirection: { sm: 'column', md: 'row' },
          flexWrap: { sm: 'wrap', md: 'nowrap' },
        }}
      >
        <StyledToggleButton
          value="total"
          aria-label="total"
          sx={{
            mr: { sm: 0, md: '0.75rem' },
            typography: 'h5',
            letterSpacing: 'normal',
          }}
          selected={calcType === 'total'}
          onChange={handleCalcTypeChange}
        >
          <T
            ns="hiilikartta"
            keyName={'report.map_graph.calc_select_total'}
          ></T>
        </StyledToggleButton>
        <StyledToggleButton
          value="bio"
          aria-label="bio"
          sx={{
            mr: { sm: 0, md: '0.75rem' },
            typography: 'h5',
            letterSpacing: 'normal',
          }}
          selected={calcType === 'bio'}
          onChange={handleCalcTypeChange}
        >
          <T ns="hiilikartta" keyName={'report.map_graph.calc_select_bio'}></T>
        </StyledToggleButton>
        <StyledToggleButton
          value="ground"
          aria-label="ground"
          sx={{ typography: 'h5', letterSpacing: 'normal' }}
          selected={calcType === 'ground'}
          onChange={handleCalcTypeChange}
        >
          <T
            ns="hiilikartta"
            keyName={'report.map_graph.calc_select_ground'}
          ></T>
        </StyledToggleButton>
      </Box>
      <CarbonChangeLegend></CarbonChangeLegend>
      <CarbonMapGraphMap
        datas={datas}
        activeYear={activeYear}
        featureYears={featureYears}
        setActiveYear={setActiveYear}
        activeDataId={activePlanConfId}
        setActiveDataId={setActivePlanConfId}
        activeCalcType={calcType}
      />
    </Box>
  )
}

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  borderRadius: '0.3125rem',
  border: '1px solid',
  borderColor: theme.palette.neutral.main,
  backgroundColor: theme.palette.neutral.lighter,
  flexGrow: 1,
  flexShrink: 1,
  whiteSpace: 'normal',
  textTransform: 'none',
  wordBreak: 'break-word',
  marginBottom: '0.5rem',
  '&.Mui-selected': {
    backgroundColor: theme.palette.neutral.light,
  },
}))

export default CarbonMapGraph
