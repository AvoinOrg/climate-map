import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, SelectChangeEvent, ToggleButton, Typography } from '@mui/material'
import { cloneDeep } from 'lodash-es'
import { T, useTranslate } from '@tolgee/react'
import { styled } from '@mui/material/styles'

import DropDownSelect from '#/components/common/DropDownSelect'

import {
  CalcFeatureCollection,
  featureCols,
  MapGraphData,
  PlanConfWithReportData,
  ZONING_CODE_COL,
} from 'applets/hiilikartta/common/types'
import CarbonMapGraphMap from './CarbonMapGraphMap'
import CarbonChangeLegend from '../CarbonChangeLegend'
import { GraphCalcType } from 'applets/hiilikartta/common/types'
import { ZONING_CLASSES } from 'applets/hiilikartta/common/constants'
import {
  getCarbonChangeColor,
  getCarbonValueForProperties,
  isZoningCodeValid,
} from 'applets/hiilikartta/common/utils'
import CarbonMapGraphTable from './CarbonMapGraphTable'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
}

const CarbonMapGraph = ({ planConfs, featureYears }: Props) => {
  const { t } = useTranslate('hiilikartta')
  const [activePlanConfId, setActivePlanConfId] = useState(planConfs[0].id)
  const [activeYear, setActiveYear] = useState(featureYears[1])
  const [calcType, setCalcType] = React.useState<GraphCalcType>('total')
  const [areaType, setAreaType] = React.useState<string>('all')
  const [localDatas, setLocalDatas] = useState<MapGraphData[]>([])

  const handleCalcTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCalcType: GraphCalcType
  ) => {
    setCalcType(newCalcType)
  }

  const handleAreaTypeChange = (event: SelectChangeEvent<string>) => {
    setAreaType(event.target.value)
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

    datas = [currentSituation, ...cloneDeep(datas)]

    const dataIds = datas.map((data) => data.id)
    if (!dataIds.includes(activePlanConfId)) {
      setActivePlanConfId(dataIds[1])
    }

    return datas
  }, [planConfs])

  useEffect(() => {
    if (datas.length === 0) return
    const newDatas = updateDataWithColor(datas, activeYear, calcType, areaType)
    setLocalDatas(newDatas)
  }, [datas, activePlanConfId, activeYear, calcType, areaType])

  const areaTypeOptions = useMemo(() => {
    return [
      { value: 'all', label: t('report.map_graph.select_all_types') },
      ...ZONING_CLASSES.filter((zoningClass) => {
        if (zoningClass.code.length === 1) return true
      }).map((zoningClass) => {
        return {
          value: zoningClass.code,
          label: zoningClass.name,
        }
      }),
    ]
  }, [])

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flexWrap: { xs: 'wrap', md: 'nowrap' },
        }}
      >
        <StyledToggleButton
          value="total"
          aria-label="total"
          sx={{
            mr: { xs: 0, md: '0.75rem' },
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
            mr: { xs: 0, md: '0.75rem' },
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          border: '1px solid',
          borderColor: 'neutral.main',
          borderRadius: '0.3125rem',
          alignItems: { xs: 'flex-start', sm: 'center' },
          pt: '0.5rem',
          pb: '0.5rem',
          pl: '1.25rem',
          pr: '1.25rem',
        }}
      >
        <Typography
          sx={{
            typography: 'h5',
            letterSpacing: 'normal',
            width: 'auto',
            mr: { xs: 0, sm: '3rem' },
          }}
        >
          <T
            ns="hiilikartta"
            keyName={'report.map_graph.select_zoning_type'}
          ></T>
        </Typography>
        <DropDownSelect
          options={areaTypeOptions}
          value={areaType}
          onChange={handleAreaTypeChange}
          sx={{ width: '100%', maxWidth: '300px' }}
          selectSx={{
            borderRadius: '0.3125rem',
            height: '2.5rem',
            typography: 'h5',
            lineHeight: '1.5rem',
            letterSpacing: 'normal',
          }}
          iconSx={{ fontSize: '1rem', mr: '0.5rem' }}
        ></DropDownSelect>
      </Box>
      <CarbonChangeLegend
        sx={{
          backgroundColor: 'rgba(217, 217, 217, 0.90)',
          borderRadius: '0.3125rem',
          pl: { xs: '0.75rem', md: '3rem' },
          pr: { xs: '0.75rem', md: '3rem' },
          pt: '1rem',
          pb: '1rem',
          mt: '2rem',
        }}
      ></CarbonChangeLegend>
      <CarbonMapGraphMap
        datas={localDatas}
        activeYear={activeYear}
        featureYears={featureYears}
        setActiveYear={setActiveYear}
        activeDataId={activePlanConfId}
        setActiveDataId={setActivePlanConfId}
        activeCalcType={calcType}
        activeAreaType={areaType}
      />
      <CarbonMapGraphTable datas={localDatas} activeYear={activeYear} />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          mt: 2,
        }}
      >
        <Typography sx={{ display: 'inline', typography: 'body2' }}>
          <T ns="hiilikartta" keyName="report.overview_graph.calc_accuracy"></T>
          {` ${''}+- XX%`}
        </Typography>
        <Typography sx={{ display: 'inline', typography: 'body2' }}>
          <u>
            <T
              ns="hiilikartta"
              keyName="report.general.read_more_about_calc"
            ></T>
          </u>
        </Typography>
      </Box>
    </Box>
  )
}

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  borderRadius: '0.3125rem',
  border: '1px solid',
  borderColor: theme.palette.neutral.main,
  backgroundColor: theme.palette.neutral.lighter,
  color: theme.palette.neutral.darker,
  flexGrow: 1,
  flexShrink: 1,
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
    backgroundColor: theme.palette.neutral.light,
  },
}))

const updateDataWithColor = (
  datas: {
    id: string
    name: string
    data: CalcFeatureCollection
  }[],
  year: string,
  calcType: GraphCalcType,
  areaType: string
): MapGraphData[] => {
  const newDatas = datas.map((data) => {
    const updatedFeatures = data.data.features.map((feature) => {
      const valueHa =
        getCarbonValueForProperties(feature.properties, year, calcType, true) ||
        0

      const valueTotal =
        getCarbonValueForProperties(
          feature.properties,
          year,
          calcType,
          false
        ) || 0

      const color = getCarbonChangeColor(valueHa)

      let isHidden = false
      if (areaType !== 'all') {
        const zoningCode = feature.properties[ZONING_CODE_COL]
        if (
          !isZoningCodeValid(zoningCode) ||
          !feature.properties[ZONING_CODE_COL].startsWith(areaType)
        )
          isHidden = true
      }
      return {
        ...feature,
        properties: {
          ...feature.properties,
          color,
          valueTotal,
          valueHa,
          isHidden,
        },
      }
    })

    return { ...data, data: { ...data.data, features: updatedFeatures } }
  })

  return newDatas
}

export default CarbonMapGraph
