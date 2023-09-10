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
  FeatureCalcs,
  featureCols,
  CalcFeatureYearValues,
} from 'applets/hiilikartta/common/types'

const MAX_WIDTH = '1000px'

const getCalculations = (calcFeature: CalcFeature): FeatureCalcs => {
  const calculations: Partial<FeatureCalcs> = {} // Start as a partial for intermediate computations

  featureCols.forEach((col) => {
    const nochange = calcFeature.properties[col].nochange
    const planned = calcFeature.properties[col].planned
    const yearDiffs: Partial<CalcFeatureYearValues> = {}

    // Dynamically compute differences for each year
    for (let yearKey in nochange) {
      if (nochange.hasOwnProperty(yearKey) && planned.hasOwnProperty(yearKey)) {
        // Assure TypeScript of the type
        const year = yearKey as keyof CalcFeatureYearValues
        yearDiffs[year] = nochange[year] - planned[year]
      }
    }

    calculations[`${col}_diff`] = yearDiffs as CalcFeatureYearValues
  })

  return calculations as FeatureCalcs // Cast back to FeatureCalcs after computing all the values
}

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const [isLoaded, setIsLoaded] = useState(false)
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
      {isLoaded && (
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
                href={getRoute(routeTree.plan, routeTree, [params.planIdSlug])}
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
                  keyName="report.impact_on_carbon_stock"
                  ns={'hiilikartta'}
                ></T>
              </Typography>
              {/* <Typography
                sx={(theme) => ({
                  typography: theme.typography.h4,
                  display: 'inline',
                  mt: theme.spacing(0.5),
                })}
              >
                {pp(reportData.sum / 100, 5)} tCO2e
              </Typography> */}
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
                <Typography typography={'h5'}>
                  <T
                    keyName="report.carbon_stocks_decrease"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography typography={'h5'}>
                  <T
                    keyName="report.carbon_stocks_decrease"
                    ns="hiilikartta"
                  ></T>
                </Typography>
              </Col>
              <Col sx={{}}></Col>
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
