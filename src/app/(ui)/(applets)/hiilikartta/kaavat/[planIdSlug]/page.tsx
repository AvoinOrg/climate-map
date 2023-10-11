'use client'

import React, { useEffect, useState } from 'react'
import { Box, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
// import SettingsIcon from '@mui/icons-material/Settings'
import ParkIcon from '@mui/icons-material/Park'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
// import MuiLink from '@mui/material/Link'
// import Link from 'next/link'
import axios from 'axios'
import JSZip from 'jszip'
import { T } from '@tolgee/react'

import { getRoute } from '#/common/utils/routing'
import useStore from '#/common/hooks/useStore'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { useMapStore } from '#/common/store'
import {
  getPlanLayerGroupId,
  transformCalcGeojsonToNestedStructure,
} from 'applets/hiilikartta/common/utils'
import Folder from '#/components/common/Folder'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const removeSerializableLayerGroup = useMapStore(
    (state) => state.removeSerializableLayerGroup
  )
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[params.planIdSlug]
  )
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)

  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (planConf) {
      updatePlanConf(planConf.id, { isCalculating: true })

      const zip = new JSZip()
      zip.file('file', JSON.stringify(planConf.data))

      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const formData = new FormData()
      formData.append('file', zipBlob, 'file.zip')
      formData.append('zoning_col', planConf.fileSettings.zoningColumn)

      // const response = await useFileUploadMutation("http://localhost:8000/calculate", uploadFile)

      try {
        // Start the calculation by making a POST request
        const postRes = await axios.post(
          `${'http://localhost:3000/api/hiilikartta/data'}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            params: { id: planConf.serverId },
          }
        )

        if (postRes.status !== 200) {
          throw new Error('Failed to start calculation.')
        }

        let isCompleted = false
        let response

        // Poll the GET request in a loop to check for completion
        while (!isCompleted) {
          await new Promise((res) => setTimeout(res, 5000)) // Wait for 5 seconds before polling again

          response = await axios.get(
            `${'http://localhost:3000/api/hiilikartta/data'}`,
            {
              params: { id: planConf.serverId },
            }
          )

          if (response.status === 200) {
            isCompleted = true
          }

          const areas = transformCalcGeojsonToNestedStructure(
            response.data.data.areas
          )
          const totals = transformCalcGeojsonToNestedStructure(
            response.data.data.totals
          )

          const metadata = {
            timestamp: Number(response.data.data.metadata.calculated_ts),
          }

          updatePlanConf(planConf.id, {
            reportData: { areas: areas, totals: totals, metadata: metadata },
            isCalculating: false,
          })
        }
      } catch (e) {
        console.log(e)
        updatePlanConf(planConf.id, {
          isCalculating: false,
          reportData: undefined,
        })
      }
    }
  }

  const handleOpenReport = async () => {
    if (planConf) {
      const route = getRoute(routeTree.plans.plan.report, routeTree, [
        params.planIdSlug,
      ])
      router.push(route)
    }
  }

  const handleDeleteClick = async () => {
    if (planConf) {
      await removeSerializableLayerGroup(getPlanLayerGroupId(planConf.id))
      deletePlanConf(planConf.id)
      router.push(getRoute(routeTree, routeTree))
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
    <>
      {isLoaded && planConf && (
        <>
          <Folder sx={{ width: '100%' }}>
            <Box
              sx={(theme) => ({
                typography: theme.typography.h2,
                margin: '50px 0 0 25px',
                color: theme.palette.neutral.darker,
              })}
            >
              {planConf.name}
            </Box>
          </Folder>

          {/* <MuiLink
            href={getRoute(routeTree.plans.plan.settings, routeTree, [planConf.id])}
            sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
            component={Link}
          >
            <MenuButton sx={{ margin: '25px 0 0 0' }} variant="outlined">
              Kaavatiedoston asetukset <SettingsIcon />
            </MenuButton>
          </MuiLink> */}
          {!planConf.isCalculating && (
            <>
              <Box sx={{}}>
                {/* {!planConf.reportData && ( */}
                <MenuButton variant="outlined" onClick={handleSubmit}>
                  <T
                    keyName={'sidebar.plan_settings.calculate_carbon_effect'}
                    ns={'hiilikartta'}
                  />
                  <ParkIcon />
                </MenuButton>
                {/* )} */}
                {planConf.reportData && (
                  <SmallMenuButton
                    variant="outlined"
                    onClick={handleOpenReport}
                  >
                    <T
                      keyName={'sidebar.plan_settings.open_full_report'}
                      ns={'hiilikartta'}
                    ></T>
                  </SmallMenuButton>
                )}
                <SmallMenuButton variant="outlined" onClick={handleDeleteClick}>
                  Poista kaava <DeleteForeverIcon />
                </SmallMenuButton>
              </Box>
            </>
          )}
        </>
      )}
    </>
  )
}

const MenuButton = styled(Button)<{ component?: string }>({
  width: '300px',
  height: '50px',
  margin: '15px 0 0 0',
  display: 'flex',
  justifyContent: 'space-between',
})

const SmallMenuButton = styled(Button)<{ component?: string }>({
  width: '300px',
  height: '35px',
  margin: '15px 0 0 0',
  display: 'flex',
  justifyContent: 'space-between',
})

export default Page
