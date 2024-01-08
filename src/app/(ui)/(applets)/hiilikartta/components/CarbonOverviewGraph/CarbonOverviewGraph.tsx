import React, { useState } from 'react'
import { styled } from '@mui/material/styles'
import {
  Box,
  SxProps,
  Theme,
  Typography,
  SelectChangeEvent,
} from '@mui/material'
import { T } from '@tolgee/react'

import { pp } from '#/common/utils/general'
import DropDownSelectMinimal from '#/components/common/DropDownSelectMinimal'

import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import GeomGraphic from './GeomGraphic'
import CarbonChangeLegend from '../CarbonChangeLegend'
import { Info } from '#/components/icons'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
  sx?: SxProps<Theme>
}

const CarbonOverviewGraph = ({ planConfs, featureYears, sx }: Props) => {
  const [activeYear, setActiveYear] = useState(featureYears[1])

  const handleYearChange = (event: SelectChangeEvent<string>) => {
    setActiveYear(event.target.value)
  }

  return (
    <Box sx={[...(Array.isArray(sx) ? sx : [sx])]}>
      <Row>
        <Col>
          <Row sx={{ justifyContent: 'flex-start' }}>
            <Typography
              sx={(theme) => ({
                typography: theme.typography.h1,
                display: 'inline',
              })}
            >
              <T
                keyName="report.overview_graph.impact_on_carbon_stock"
                ns={'hiilikartta'}
              ></T>{' '}
            </Typography>
            <Info
              sx={{
                height: '1.1rem',
                mt: 'auto',
                mb: '0.28rem',
                ml: '0.85rem',
              }}
            ></Info>
          </Row>
          <Row sx={{ justifyContent: 'flex-start', mt: 0.5 }}>
            <Typography
              sx={(theme) => ({
                typography: theme.typography.h1,
                display: 'inline',
              })}
            >
              <T keyName="report.overview_graph.on_year" ns={'hiilikartta'}></T>{' '}
            </Typography>
            <DropDownSelectMinimal
              options={featureYears.map((featureYear) => ({
                label: featureYear,
                value: featureYear,
              }))}
              value={activeYear}
              onChange={handleYearChange}
              optionSx={{
                typography: 'h1',
                display: 'inline',
              }}
              iconSx={{
                mt: 0.2,
                height: '0.75rem',
              }}
            ></DropDownSelectMinimal>
          </Row>
        </Col>
      </Row>
      <Row
        sx={{
          mt: 3,
          mb: 5,
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          gap: '1.75rem',
        }}
      >
        {planConfs.map((planConf) => {
          return (
            <Row
              sx={{
                flex: 0,
                border: '1px solid',
                borderRadius: '0.3125rem',
                borderColor: 'primary.dark',
                pt: '2rem',
                pb: '2rem',
                pl: '1.75rem',
                pr: '1.75rem',
                boxShadow: '1px 1px 4px 1px rgba(217, 217, 217, 0.50);',
              }}
              key={planConf.id}
            >
              <Col>
                <Typography typography={'h8'}>
                  <T keyName="report.overview_graph.plan" ns="hiilikartta"></T>
                </Typography>
                <Typography typography={'h7'} sx={{ whiteSpace: 'nowrap' }}>
                  {planConf?.name}
                </Typography>
                <Typography typography={'h5'} sx={{ mt: 2 }}>
                  <T
                    keyName="report.overview_graph.carbon_stock_decreases"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={4} typography={'h5'}>
                  <T
                    keyName="report.overview_graph.carbon_eqv_unit"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={1} typography={'h1'}>
                  {pp(
                    planConf.reportData.agg.totals.bio_carbon_total_diff[
                      activeYear
                    ] +
                      planConf.reportData.agg.totals.ground_carbon_total_diff[
                        activeYear
                      ],
                    4
                  )}
                </Typography>
                <Typography mt={3} typography={'h5'}>
                  <T
                    keyName="report.overview_graph.carbon_eqv_unit_hectare"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={1} typography={'h1'}>
                  {pp(
                    planConf.reportData.agg.totals.bio_carbon_ha_diff[
                      activeYear
                    ] +
                      planConf.reportData.agg.totals.ground_carbon_ha_diff[
                        activeYear
                      ],
                    2
                  )}
                </Typography>
              </Col>
              <Col sx={{ ml: 2 }}>
                <GeomGraphic
                  feature={planConf.reportData.totals.features[0]}
                  year={activeYear}
                  width={120}
                  height={200}
                  sx={{ mt: 3 }}
                ></GeomGraphic>
              </Col>
            </Row>
          )
        })}
      </Row>
      <CarbonChangeLegend></CarbonChangeLegend>
      <Col sx={{ alignItems: 'flex-end', mt: 2 }}>
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
      </Col>
    </Box>
  )
}

export default CarbonOverviewGraph

const Row = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
}))

const Col = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  width: '100%',
}))
