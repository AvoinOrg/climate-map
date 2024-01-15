'use client'
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'

import useStore from '#/common/hooks/useStore'
import Link from '#/components/common/Link'
import { useSearchParams } from 'next/navigation'
import { map, isEqual, sortBy } from 'lodash-es'
import { useRouter } from 'next/navigation'
import { styled, SxProps } from '@mui/system'
import { Box, Theme, Typography, useMediaQuery, useTheme } from '@mui/material'
import { T, useTranslate } from '@tolgee/react'

import { getRoute } from '#/common/utils/routing'
import MultiSelectAutocomplete from '#/components/common/MultiSelectAutocomplete'
import { FetchStatus, SelectOption } from '#/common/types/general'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import CarbonMapGraph from 'applets/hiilikartta/components/CarbonMapGraph'
import CarbonLineChart from 'applets/hiilikartta/components/CarbonLineChart'
import CarbonOverviewGraph from 'applets/hiilikartta/components/CarbonOverviewGraph'

const MAX_WIDTH = '1000px'

enum ErrorState {
  NO_IDS = 'NO_IDS',
  INVALID_IDS = 'INVALID_IDS',
  NO_DATA = 'NO_DATA',
}

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslate('hiilikartta')
  const theme = useTheme()
  const useNarrowLayout = useMediaQuery(theme.breakpoints.down('md'))
  const addedExtPlanConfIds = useRef<string[]>([])

  const allPlanConfs = useStore(useAppletStore, (state) => state.planConfs)
  const externalPlanConfs = useStore(
    useAppletStore,
    (state) => state.externalPlanConfs
  )
  const addExternalPlanConf = useAppletStore(
    (state) => state.addExternalPlanConf
  )

  const [planConfs, setPlanConfs] = useState<PlanConfWithReportData[]>([])
  const [prevPageId, setPrevPageId] = useState<string>()
  const [errorState, setErrorState] = useState<ErrorState>()
  const [isLoaded, setIsLoaded] = useState(true)
  const [featureYears, setFeatureYears] = useState<string[]>([])

  const planConfSelectOptions = useMemo(() => {
    if (allPlanConfs == null || externalPlanConfs == null) {
      return []
    }

    const combinedPlanConfs = { ...externalPlanConfs, ...allPlanConfs }
    return Object.keys(combinedPlanConfs)
      .filter(
        (id) =>
          combinedPlanConfs[id].serverId != null &&
          combinedPlanConfs[id].reportData != null
      )
      .map((id) => {
        return {
          value: combinedPlanConfs[id]?.serverId,
          label: combinedPlanConfs[id]?.name || combinedPlanConfs[id]?.serverId,
        }
      })
  }, [allPlanConfs, externalPlanConfs])

  useEffect(() => {
    if (allPlanConfs != null && externalPlanConfs != null) {
      const paramPlanIds = searchParams.get('planIds')
      if (paramPlanIds != null) {
        const ids = paramPlanIds.split(',')

        const paramPlanConfs: PlanConfWithReportData[] = []
        for (const id of ids) {
          const foundPlanConfId = Object.keys(allPlanConfs).find(
            (planConfId) => allPlanConfs[planConfId].serverId === id
          )
          const foundExtPlanConfId = Object.keys(externalPlanConfs).find(
            (planConfId) => externalPlanConfs[planConfId].serverId === id
          )

          if (foundPlanConfId != null) {
            if (allPlanConfs[foundPlanConfId].reportData != null) {
              paramPlanConfs.push(
                allPlanConfs[foundPlanConfId] as PlanConfWithReportData
              )
            } else {
              // TODO: add error notification popup
              setErrorState(ErrorState.NO_DATA)
            }
          } else if (foundExtPlanConfId != null) {
            if (externalPlanConfs[foundExtPlanConfId].reportData != null) {
              paramPlanConfs.push(
                externalPlanConfs[foundExtPlanConfId] as PlanConfWithReportData
              )
            } else if (externalPlanConfs[id].status === FetchStatus.ERRORED) {
              // TODO: add error notification popup
              setErrorState(ErrorState.NO_DATA)
            }
          } else if (!addedExtPlanConfIds.current.includes(id)) {
            addedExtPlanConfIds.current.push(id)
            addExternalPlanConf(id)
          }
        }
        const areIdsEqualAndInOrder = isEqual(
          map(planConfs, 'id'),
          map(paramPlanConfs, 'id')
        )

        if (!areIdsEqualAndInOrder) {
          setPlanConfs(paramPlanConfs)

          for (const planConf of paramPlanConfs) {
            const allFeatureYears: string[][] = []
            if (planConf.reportData.metadata.featureYears != null) {
              allFeatureYears.push(planConf.reportData.metadata.featureYears)
            }
            const commonFeatureYears = allFeatureYears[0].filter(
              (item: string) =>
                allFeatureYears.every((featureYearArray: string[]) =>
                  featureYearArray.includes(item)
                )
            )
            setFeatureYears(commonFeatureYears)
          }
        }

        if (!isLoaded) {
          let newLoaded = true
          for (const id of ids) {
            if (allPlanConfs[id] != null || externalPlanConfs[id] != null) {
              newLoaded = false
              break
            }
          }

          if (newLoaded) {
            setIsLoaded(true)
          }
        }
      }

      const paramPrevPageId = searchParams.get('prevPageId')
      if (paramPrevPageId != null) {
        if (allPlanConfs[paramPrevPageId] != null) {
          setPrevPageId(paramPrevPageId)
        } else {
          const newSearchParams = new URLSearchParams(searchParams)
          newSearchParams.delete('prevPageId')

          // Use router.replace to update the URL without adding a new history entry
          router.replace(
            getRoute(routeTree.report, routeTree, {
              queryParams: newSearchParams,
            })
          )
        }
      }
    }
  }, [searchParams, allPlanConfs, externalPlanConfs])

  const handlePlanSelectClick = (
    event: React.SyntheticEvent<Element, Event>,
    newValue: SelectOption[]
  ) => {
    const newSearchParams = new URLSearchParams(searchParams)
    const valueString = newValue.map((option) => option.value).join(',')
    newSearchParams.set('planIds', valueString)

    // Use router.replace to update the URL without adding a new history entry
    router.replace(
      getRoute(routeTree.report, routeTree, {
        queryParams: newSearchParams,
      })
    )
  }

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
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100vw',
        backgroundColor: theme.palette.neutral.lighter,
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
          pt: 10,
          pb: 4,
          px: 4,
          [theme.breakpoints.down('md')]: {
            p: 3,
          },
        })}
      >
        <Row
          sx={(theme) => ({
            [theme.breakpoints.down('md')]: {
              flexDirection: 'column-reverse',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              mb: 2,
            },
          })}
        >
          <Typography
            sx={(theme) => ({
              typography: theme.typography.h1,
              display: 'inline',
              [theme.breakpoints.down('md')]: {
                width: '100%',
                mt: 7,
              },
            })}
          >
            <T keyName={'report.header.title'} ns={'hiilikartta'}></T>
          </Typography>
          <Link
            href={
              prevPageId != null
                ? getRoute(routeTree.plans.plan, routeTree, {
                    routeParams: { planId: prevPageId },
                  })
                : getRoute(routeTree, routeTree)
            }
          >
            <Typography
              sx={(theme) => ({
                typography: theme.typography.body1,
                display: 'inline',
                color: theme.palette.neutral.light,
              })}
            >
              <u>
                <T keyName={'report.header.close'} ns={'hiilikartta'}></T>
              </u>
            </Typography>
          </Link>
        </Row>
        <Row
          sx={(theme) => ({
            mt: 4,
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
          })}
        >
          <Typography
            sx={(theme) => ({
              typography: 'h3',
              lineHeight: '1.375rem',
              display: 'inline-flex',
              maxWidth: '15rem',
              [theme.breakpoints.down('md')]: {
                mb: 3,
              },
            })}
          >
            <T
              keyName={'report.header.compare_with_other_plans'}
              ns={'hiilikartta'}
            ></T>
          </Typography>
          <MultiSelectAutocomplete
            sx={(theme) => ({
              width: '21rem',
              [theme.breakpoints.down('md')]: {
                width: '100%',
              },
            })}
            value={planConfs.map((planConf) => ({
              value: planConf.serverId,
              label: planConf.name,
            }))}
            options={planConfSelectOptions}
            placeholder={t('report.header.plan_select_placeholder')}
            onChange={handlePlanSelectClick}
          ></MultiSelectAutocomplete>

          {planConfs.length === 1 && (
            <Col
              sx={(theme) => ({
                flex: 1,
                alignItems: 'end',
                letterSpacing: '0.075rem',
                color: 'neutral.lighter',
                [theme.breakpoints.down('md')]: {
                  mt: 3,
                },
              })}
            >
              <Typography
                sx={(theme) => ({
                  display: 'inline',
                  typography: 'body7',
                  flexWrap: 'no-wrap',
                  mt: theme.spacing(0.5),
                })}
              >
                <T
                  keyName={'report.report_calculated_on'}
                  ns={'hiilikartta'}
                ></T>
              </Typography>
              <Typography
                sx={(theme) => ({
                  typography: 'body7',
                  display: 'inline',
                })}
              >
                {new Date(
                  planConfs[0].reportData.metadata.timestamp * 1000
                ).toLocaleDateString(navigator.language)}
              </Typography>
            </Col>
          )}
        </Row>
      </Section>
      {isLoaded && planConfs.length > 0 && featureYears.length > 0 && (
        <Col sx={{ maxWidth: MAX_WIDTH, p: 3 }}>
          <Section>
            <CarbonOverviewGraph
              planConfs={planConfs}
              featureYears={featureYears}
              sx={{ maxWidth: MAX_WIDTH, width: '100%', mt: 5 }}
            />
          </Section>
          {useNarrowLayout && <Breaker sx={{ mt: 8 }} />}

          <Section
            sx={{
              mt: { xs: 8, md: 14 },
              border: { xs: 'none', md: '1px solid' },
              borderColor: { md: 'primary.dark' },
              boxShadow: {
                xs: 'none',
                md: '1px 1px 4px 1px rgba(217, 217, 217, 0.50);',
              },
              p: {
                xs: 0,
                md: 3,
              },
              borderRadius: '0.3125rem',
            }}
          >
            <Row sx={{ mb: 4 }}>
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h1,
                  display: 'inline',
                })}
              >
                <T keyName="report.map_graph.title" ns={'hiilikartta'}></T>
              </Typography>
            </Row>
            <Row>
              <Col>
                <CarbonMapGraph
                  planConfs={planConfs}
                  featureYears={featureYears}
                />
              </Col>
            </Row>
          </Section>
          <Section sx={{ mt: 8 }}>
            <Row>
              <Typography
                sx={(theme) => ({
                  typography: theme.typography.h1,
                  display: 'inline',
                })}
              >
                <T
                  keyName="report.carbon_line_chart.title"
                  ns={'hiilikartta'}
                ></T>{' '}
              </Typography>
            </Row>
            <Row>
              <CarbonLineChart
                data={planConfs.map((planConf) => planConf.reportData.totals)}
                featureYears={featureYears}
                planNames={planConfs.map((planConf) => planConf.name)}
                width={useNarrowLayout ? 400 : 800}
                height={500}
                useHaVals={true}
              />
            </Row>
          </Section>
        </Col>
      )}
    </Box>
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
