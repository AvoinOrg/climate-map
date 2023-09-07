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

import { getRoute } from '#/common/utils/routing'
import useStore from '#/common/hooks/useStore'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { useMapStore } from '#/common/store'
import { getPlanLayerGroupId } from 'applets/hiilikartta/common/utils'
import Folder from '#/components/common/Folder'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const getSourceJson = useMapStore((state) => state.getSourceJson)
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[params.planIdSlug]
  )
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const addReportToPlan = useAppletStore((state) => state.addReportToPlan)
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)

  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    if (planConf) {
      updatePlanConf(planConf.id, { isCalculating: true })
      const json = await getSourceJson(getPlanLayerGroupId(planConf.id))

      const zip = new JSZip()
      zip.file('file', JSON.stringify(json))

      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const formData = new FormData()
      formData.append('file', zipBlob, 'file.zip')
      formData.append('zoning_col', planConf.fileSettings.zoningColumn)

      // const response = await useFileUploadMutation("http://localhost:8000/calculate", uploadFile)

      const response = await axios.post(
        'http://localhost:8000/calculate',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )


      updatePlanConf(planConf.id, { isCalculating: false })
    }
  }

  const handleDeleteClick = async () => {
    if (planConf) {
      router.push(getRoute(routeTree, routeTree))
      deletePlanConf(planConf.id)
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
            href={getRoute(routeTree.plan.settings, routeTree, [planConf.id])}
            sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
            component={Link}
          >
            <MenuButton sx={{ margin: '25px 0 0 0' }} variant="outlined">
              Kaavatiedoston asetukset <SettingsIcon />
            </MenuButton>
          </MuiLink> */}
          <Box sx={{}}>
            <SmallMenuButton variant="outlined" onClick={handleDeleteClick}>
              Poista kaava <DeleteForeverIcon />
            </SmallMenuButton>
            <MenuButton variant="outlined" onClick={handleSubmit}>
              <T
                keyName={'sidebar.plan_settings.calculate_carbon_effect'}
                ns={'hiilikartta'}
              />
              <ParkIcon />
            </MenuButton>
          </Box>
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
