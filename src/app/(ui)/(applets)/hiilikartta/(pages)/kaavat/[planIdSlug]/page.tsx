'use client'

import React, { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
// import SettingsIcon from '@mui/icons-material/Settings'
// import MuiLink from '@mui/material/Link'
// import Link from 'next/link'
import { T, useTranslate } from '@tolgee/react'
import { useMutation } from '@tanstack/react-query'
import FolderCopy from '@mui/icons-material/FolderCopyOutlined'

import { getRoute } from '#/common/utils/routing'
import useStore from '#/common/hooks/useStore'
import { useMapStore } from '#/common/store'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { getPlanLayerGroupId } from 'applets/hiilikartta/common/utils'
import { ArrowNextBig, Delete } from '#/components/icons'
import ZoneAccordion from './_components/ZoneAccordion'
import { calcPostMutation } from 'applets/hiilikartta/common/queries/calcPostMutation'
import PlanFolder from 'applets/hiilikartta/components/PlanFolder'
import {
  SCROLLBAR_WIDTH_REM,
  SIDEBAR_PADDING_REM,
  SIDEBAR_PADDING_WITH_SCROLLBAR_REM,
} from '#/common/style/theme/constants'
import { SIDEBAR_WIDTH_REM } from 'applets/hiilikartta/common/constants'
import { pp } from '#/common/utils/general'
import { FeatureYear, featureYears } from 'applets/hiilikartta/common/types'
import DropDownSelectMinimal from '#/components/common/DropDownSelectMinimal'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const removeSerializableLayerGroup = useMapStore(
    (state) => state.removeSerializableLayerGroup
  )
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[params.planIdSlug]
  )
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)
  const copyPlanConf = useAppletStore((state) => state.copyPlanConf)
  const calcPost = useMutation(calcPostMutation())
  const [currentYear, setCurrentYear] = useState<FeatureYear>(featureYears[1])

  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()
  const { t } = useTranslate('hiilikartta')

  const handleSubmit = async () => {
    if (planConf) {
      calcPost.mutate(planConf)
    }
  }

  const handleOpenReport = async () => {
    if (planConf) {
      const route = getRoute(routeTree.report, routeTree, {
        queryParams: {
          planIds: params.planIdSlug,
          prevPageId: params.planIdSlug,
        },
      })
      router.push(route)
    }
  }

  const handleDeleteClick = async () => {
    if (planConf) {
      await removeSerializableLayerGroup(getPlanLayerGroupId(planConf.id))
      await deletePlanConf(planConf.id)
      router.push(getRoute(routeTree, routeTree))
    }
  }

  const handleCopyClick = async () => {
    if (planConf) {
      const { id } = await copyPlanConf(
        planConf.id,
        t('sidebar.plan_settings.copy_suffix')
      )
      router.push(
        getRoute(routeTree.plans.plan, routeTree, {
          routeParams: { planId: id },
        })
      )
    }
  }

  useEffect(() => {
    if (planConf === undefined) {
      router.push(getRoute(routeTree, routeTree))
    } else {
      setIsLoaded(true)
    }
  }, [planConf])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: SIDEBAR_WIDTH_REM + 'rem',
      }}
    >
      {isLoaded && planConf && (
        <>
          <Box
            sx={{
              overflowY: 'scroll',
              direction: 'rtl',
            }}
          >
            <Box
              sx={{
                direction: 'ltr',
                overflow: 'visible',
                p: SIDEBAR_PADDING_REM + 'rem',
                mr: SCROLLBAR_WIDTH_REM + 'rem',
              }}
            >
              <PlanFolder
                isNameEditable={true}
                planConf={planConf}
                height={90}
              />

              {/* <MuiLink
            href={getRoute(routeTree.plans.plan.settings, routeTree, [planConf.id])}
            sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
            component={Link}
            >
            <MenuButton sx={{ margin: '25px 0 0 0' }} variant="outlined">
            Kaavatiedoston asetukset <SettingsIcon />
            </MenuButton>
          </MuiLink> */}

              {planConf.reportData && (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      flexDirection: 'row',
                      typography: 'h2',
                      justifyContent: 'space-between',
                      mt: 4,
                      mb: 2,
                    }}
                  >
                    <T
                      keyName={
                        'sidebar.plan_settings.report_preview.impact_on_carbon_stock'
                      }
                      ns="hiilikartta"
                    ></T>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      mt: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        display: 'inline-flex',
                        typography: 'h6',
                        textAlign: 'end',
                      }}
                    >
                      <T
                        keyName={'sidebar.plan_settings.report_preview.on_year'}
                        ns="hiilikartta"
                      ></T>
                    </Typography>
                    <DropDownSelectMinimal
                      value={currentYear}
                      isIconOnTheRight={false}
                      sx={{ mr: -4, mt: -0.5 }}
                      iconSx={{ ml: 2, mt: 0.8 }}
                      optionSx={{ mr: 1, typography: 'h8' }}
                      onChange={(e) =>
                        setCurrentYear(e.target.value as FeatureYear)
                      }
                      options={featureYears.slice(1).map((year) => {
                        return {
                          value: year,
                          label: year,
                        }
                      })}
                    ></DropDownSelectMinimal>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      typography: 'h4',
                      justifyContent: 'space-between',
                      mt: 4,
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        maxWidth: '15rem',
                        mr: 3,
                        pt: 0.3,
                        lineHeight: 1.2,
                      }}
                    >
                      <T
                        keyName={
                          'sidebar.plan_settings.report_preview.carbon_stores_shrink'
                        }
                        ns="hiilikartta"
                      ></T>
                    </Box>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'end',
                        textAlign: 'end',
                      }}
                    >
                      <Typography typography={'h1'}>
                        {pp(
                          planConf.reportData.agg.totals.bio_carbon_sum_diff[
                            currentYear
                          ] +
                            planConf.reportData.agg.totals
                              .ground_carbon_sum_diff[currentYear],
                          4
                        )}
                      </Typography>
                      <Typography mt={0.5} typography={'h5'}>
                        <T
                          keyName="sidebar.plan_settings.report_preview.carbon_eqv_unit"
                          ns="hiilikartta"
                        ></T>
                      </Typography>
                      <Typography mt={2} typography={'h1'}>
                        {pp(
                          planConf.reportData.agg.totals
                            .bio_carbon_per_area_diff[currentYear] +
                            planConf.reportData.agg.totals
                              .ground_carbon_per_area_diff[currentYear],
                          2
                        )}
                      </Typography>
                      <Typography mt={0.5} typography={'h5'}>
                        <T
                          keyName="sidebar.plan_settings.report_preview.carbon_eqv_unit_hectare"
                          ns="hiilikartta"
                        ></T>
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      typography: 'h2',
                      textAlign: 'end',
                      mt: 6,
                      mb: 1,
                      minWidth: '270px',
                      '&:hover': { cursor: 'pointer' },
                      textDecoration: 'underline',
                    }}
                    onClick={handleOpenReport}
                  >
                    <T
                      keyName={'sidebar.plan_settings.open_full_report'}
                      ns={'hiilikartta'}
                    ></T>
                  </Box>
                </Box>
              )}

              <ZoneAccordion
                planConfId={planConf.id}
                sx={{ mt: 4 }}
              ></ZoneAccordion>
            </Box>
          </Box>

          <Box
            sx={(theme) => ({
              display: 'flex',
              flexDirection: 'column',
              width:
                SIDEBAR_WIDTH_REM +
                // SIDEBAR_PADDING_WITH_SCROLLBAR_REM +
                // SIDEBAR_PADDING_REM +
                'rem',
              pl: SIDEBAR_PADDING_WITH_SCROLLBAR_REM + 'rem',
              pr: SIDEBAR_PADDING_WITH_SCROLLBAR_REM + 'rem',
              pt: 2,
              pb: 2,
              zIndex: 9999,
              borderTop: 1,
              borderColor: 'primary.lighter',
            })}
          >
            <FooterButtonContainer mt={0.4} onClick={handleCopyClick}>
              <Box sx={{ mr: 1.5 }}>
                <FolderCopy></FolderCopy>
              </Box>
              <Box
                sx={{
                  typography: 'h3',
                }}
              >
                <T keyName={'sidebar.plan_settings.copy'} ns={'hiilikartta'} />
              </Box>
              {/* </Box> */}
            </FooterButtonContainer>
            <FooterButtonContainer onClick={handleDeleteClick} sx={{ mt: 1.3 }}>
              <Box sx={{ mr: 1.7 }}>
                <Delete></Delete>
              </Box>
              <Box
                sx={{
                  typography: 'h3',
                }}
              >
                <T
                  keyName={'sidebar.plan_settings.delete'}
                  ns={'hiilikartta'}
                />
              </Box>
              {/* </Box> */}
            </FooterButtonContainer>
            {!planConf.reportData && (
              <Box
                sx={{
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      flexDirection: 'row',
                      '&:hover': { cursor: 'pointer' },
                      mt: 4,
                      flex: '0',
                    }}
                    onClick={handleSubmit}
                  >
                    <Box
                      sx={{
                        typography: 'h1',
                        textAlign: 'end',
                        mr: 3,
                        minWidth: '270px',
                      }}
                    >
                      <T
                        keyName={
                          'sidebar.plan_settings.calculate_carbon_effect'
                        }
                        ns={'hiilikartta'}
                      />
                    </Box>
                    <Box sx={{ mt: 0.2 }}>
                      <ArrowNextBig></ArrowNextBig>
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  )
}

const FooterButtonContainer = styled(Box)<{ component?: string }>({
  display: 'inline-flex',
  flexDirection: 'row',
  '&:hover': { cursor: 'pointer' },
  color: 'neutral.dark',
  flex: '0',
  whiteSpace: 'nowrap',
  alignSelf: 'flex-start',
})

export default Page
