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

const MAX_WIDTH = '1000px'

const Page = ({ params }: { params: { planIdSlug: string; reportIdSlug: string } }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const report = useStore(useAppletStore, (state) => state.planConfs[params.planIdSlug].reports[params.reportIdSlug])

  useEffect(() => {
    // useUIStore.setState((state) => {
    //   state.appBarTitle = 'Kaavat'
    // })
    if (report != null) {
      console.log(report)
      setIsLoaded(true)
    }
  }, [report])

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
              backgroundColor: theme.palette.secondary.dark,
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
                  typography: theme.typography.h3,
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
                  Tampereen keskusta, kaava V1
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
                mt: theme.spacing(4),
              })}
            >
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h4,
                  display: 'inline',
                })}
              >
                Hiilivarasto (biomassa)
              </Typography>
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h4,
                  display: 'inline',
                  mt: theme.spacing(0.5),
                })}
              >
                {/* {pp(reportData.sum / 100, 5)} tCO2e */}
              </Typography>
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
