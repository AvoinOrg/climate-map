'use client'
import React, { useContext, useEffect, useState } from 'react'

import useStore from '#/common/hooks/useStore'
import { useUIStore } from '#/common/store'
import Link from '#/components/common/Link'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { getPlanLayerGroupId } from 'applets/hiilikartta/common/utils'
import { Box, Typography } from '@mui/material'
import { styled } from '@mui/system'
import { pp } from '#/common/utils/general'
import { getRoute } from '#/common/utils/routing'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { T } from '@tolgee/react'
import {
  CalcFeature,
  CalcFeatureYearValues,
  FeatureCalcs,
  featureCols,
  featureYears,
} from 'applets/hiilikartta/common/types'
import CarbonMapGraph from 'applets/hiilikartta/components/CarbonMapGraph'
import CarbonLineChart from 'applets/hiilikartta/components/CarbonLineChart'

const MAX_WIDTH = '1000px'

const getCalculations = (calcFeature: CalcFeature): FeatureCalcs => {
  const calculations: Partial<FeatureCalcs> = {} // Start as a partial for intermediate computations

  featureCols.forEach((col) => {
    const nochange = calcFeature.properties[col].nochange
    const planned = calcFeature.properties[col].planned
    const yearDiffs: Partial<CalcFeatureYearValues> = {}

    // Dynamically compute differences for each year
    featureYears.forEach((year) => {
      if (nochange[year] !== undefined && planned[year] !== undefined) {
        yearDiffs[year] = planned[year] - nochange[year]
      }
    })

    calculations[`${col}_diff`] = yearDiffs as CalcFeatureYearValues
  })

  return calculations as FeatureCalcs // Cast back to FeatureCalcs after computing all the values
}

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [totalsCalcs, setTotalsCalcs] = useState<FeatureCalcs>()
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[params.planIdSlug]
  )

  useEffect(() => {
    // useUIStore.setState((state) => {
    //   state.appBarTitle = 'Kaavat'
    // })
    if (planConf?.reportData != null) {
      console.log(planConf.reportData)
      const newTotalsCalcs = getCalculations(
        planConf.reportData.totals.features[0]
      )
      console.log(newTotalsCalcs)
      setTotalsCalcs(newTotalsCalcs)
      setIsLoaded(true)
    }
  }, [planConf])

  // useEffect(() => {
  //   const planLayerGroupId = getPlanLayerGroupId(params.planIdSlug)
  //   enableSerializableLayerGroup(planLayerGroupId)
  //   const bounds = getSourceBounds(planLayerGroupId)
  //   if (bounds) {
  //     fitBounds(bounds, { duration: 2000, latExtra: 0.5, lonExtra: 0.5 })
  //   }
  // }, [])

  // useEffect(() => {
  //   setMapLibraryMode('mapbox')
  // }, [])
  return (
    <>
      {isLoaded && totalsCalcs && planConf && planConf.reportData && (
        <Box
          sx={(theme) => ({
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: '100vw',
            backgroundColor: theme.palette.neutral.light,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            pb: theme.spacing(20),
            alignItems: 'center',
          })}
        >
          <Section
            sx={(theme) => ({
              backgroundColor: theme.palette.primary.dark,
              pt: theme.spacing(10),
              pb: theme.spacing(4),
              px: theme.spacing(4),
            })}
          >
            <Row
              sx={(theme) => ({
                mt: theme.spacing(4),
              })}
            >
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h1,
                  display: 'inline',
                })}
              >
                Hiiliraportti
              </Typography>
              <Link
                href={getRoute(routeTree.plans.plan, routeTree, [params.planIdSlug])}
              >
                <Typography
                  sx={(theme) => ({
                    typography: theme.typography.body1,
                    display: 'inline',
                    color: theme.palette.neutral.light,
                  })}
                >
                  <u>Sulje raportti</u>
                </Typography>
              </Link>
            </Row>
            <Row
              sx={(theme) => ({
                mt: theme.spacing(4),
              })}
            >
              <Col>
                <Typography
                  sx={(theme) => ({
                    typography: theme.typography.h4,
                    display: 'inline',
                  })}
                >
                  {planConf?.name}
                </Typography>
                <Typography
                  sx={(theme) => ({
                    typography: theme.typography.h5,
                    display: 'inline',
                    mt: theme.spacing(0.5),
                  })}
                >
                  {/* {pp(reportData.area / 10000, 2)} hehtaaria */}
                </Typography>
              </Col>
              {/* <Typography
            sx={(theme) => ({
              typography: theme.typography.caption,
              display: 'inline',
              color: theme.palette.neutral.light,
            })}
          >
            <u>Sulje raportti</u>
          </Typography> */}
            </Row>
          </Section>
          <Section>
            <Row
              sx={(theme) => ({
                mt: theme.spacing(6),
              })}
            >
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h1,
                  display: 'inline',
                })}
              >
                <T
                  keyName="report.impact_on_carbon_stock_in_year"
                  ns={'hiilikartta'}
                ></T>{' '}
                {featureYears[1]}
              </Typography>
            </Row>
            <Row sx={{ mt: 6 }}>
              <Col>
                <Typography typography={'h8'}>
                  <T keyName="report.plan" ns="hiilikartta"></T>
                </Typography>
                <Typography typography={'h7'}>{planConf?.name}</Typography>
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
                    totalsCalcs.bio_carbon_sum_diff[featureYears[1]] +
                      totalsCalcs.ground_carbon_sum_diff[featureYears[1]],
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
                    totalsCalcs.bio_carbon_per_area_diff[featureYears[1]] +
                      totalsCalcs.ground_carbon_per_area_diff[featureYears[1]],
                    2
                  )}
                </Typography>
              </Col>
              <Col sx={{}}></Col>
            </Row>
          </Section>
          <Breaker sx={{ mt: 8 }} />
          <Section sx={{ mt: 8 }}>
            <Row>
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h1,
                  display: 'inline',
                })}
              >
                <T
                  keyName="report.carbon_stock_development"
                  ns={'hiilikartta'}
                ></T>{' '}
              </Typography>
            </Row>
            <Row>
              <CarbonMapGraph geojsonData={planConf.reportData.areas} />
            </Row>
          </Section>
          <Breaker sx={{ mt: 8 }} />
          <Section sx={{ mt: 8 }}>
            <Row>
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h1,
                  display: 'inline',
                })}
              >
                <T
                  keyName="report.carbon_stock_change_in_area_total"
                  ns={'hiilikartta'}
                ></T>{' '}
              </Typography>
            </Row>
            <Row>
              <CarbonLineChart data={planConf.reportData.totals} />
            </Row>
          </Section>
        </Box>
      )}
    </>
  )
}

const Section = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
}))

const Breaker = styled('div')(({ theme }) => ({
  width: '100%',
  borderTop: `3px solid ${theme.palette.primary.light}`,
  maxWidth: MAX_WIDTH,
}))

const Row = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  maxWidth: MAX_WIDTH,
}))

const Col = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  width: '100%',
}))

export default Page
