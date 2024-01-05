import React, { useState } from 'react'
import { styled } from '@mui/material/styles'
import { Box, SxProps, Theme, Typography } from '@mui/material'
import { T } from '@tolgee/react'

import { pp } from '#/common/utils/general'

import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import GeomGraphic from './GeomGraphic'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
  sx?: SxProps<Theme>
}

const CarbonOverviewGraph = ({ planConfs, featureYears, sx }: Props) => {
  return (
    <Box sx={[...(Array.isArray(sx) ? sx : [sx])]}>
      <Row
        sx={(theme) => ({
          mt: 6,
        })}
      >
        <Typography
          sx={(theme) => ({
            typography: theme.typography.h1,
            display: 'inline',
          })}
        >
          <T keyName="report.impact_on_carbon_stock" ns={'hiilikartta'}></T>{' '}
          {featureYears[1]}
        </Typography>
      </Row>
      <Row sx={{ mt: 10, flexWrap: 'wrap', justifyContent: 'normal' }}>
        {planConfs.map((planConf) => {
          return (
            <Row sx={{ mb: 10, flex: 0, mr: 'auto' }} key={planConf.id}>
              <Col>
                <Typography typography={'h8'}>
                  <T keyName="report.plan" ns="hiilikartta"></T>
                </Typography>
                <Typography typography={'h7'} sx={{ whiteSpace: 'nowrap' }}>
                  {planConf?.name}
                </Typography>
                <Typography typography={'h5'} sx={{ mt: 2 }}>
                  <T
                    keyName="report.carbon_stock_decreases"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={4} typography={'h5'}>
                  <T keyName="report.carbon_eqv_unit" ns="hiilikartta"></T>
                </Typography>
                <Typography mt={1} typography={'h1'}>
                  {pp(
                    planConf.reportData.agg.totals.bio_carbon_total_diff[
                      featureYears[1]
                    ] +
                      planConf.reportData.agg.totals.ground_carbon_total_diff[
                        featureYears[1]
                      ],
                    4
                  )}
                </Typography>
                <Typography mt={3} typography={'h5'}>
                  <T
                    keyName="report.carbon_eqv_unit_hectare"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={1} typography={'h1'}>
                  {pp(
                    planConf.reportData.agg.totals.bio_carbon_ha_diff[
                      featureYears[1]
                    ] +
                      planConf.reportData.agg.totals.ground_carbon_ha_diff[
                        featureYears[1]
                      ],
                    2
                  )}
                </Typography>
              </Col>
              <Col sx={{ ml: 2 }}>
                <GeomGraphic
                  feature={planConf.reportData.totals.features[0]}
                  year={featureYears[1]}
                  width={120}
                  height={200}
                  sx={{ mt: 3 }}
                ></GeomGraphic>
              </Col>
            </Row>
          )
        })}
      </Row>
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
