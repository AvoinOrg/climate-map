'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
import TuneIcon from '@mui/icons-material/Tune'
// import SettingsIcon from '@mui/icons-material/Settings'
import ParkIcon from '@mui/icons-material/Park'
import ForestIcon from '@mui/icons-material/Forest'
import PeopleIcon from '@mui/icons-material/People'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
// import MuiLink from '@mui/material/Link'
// import Link from 'next/link'
import axios from 'axios'
import JSZip from 'jszip'

import { getRoute } from '#/common/utils/routing'
import useStore from '#/common/hooks/useStore'

import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { PlanConf } from 'applets/hiilikartta/common/types'
import { routeTree } from 'applets/hiilikartta/common/routes'
import { MapContext } from '#/components/Map'
import { getPlanLayerId } from 'applets/hiilikartta/common/utils'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const { getSourceJson } = useContext(MapContext)
  const planConf = useStore(useAppStore, (state) => state.planConfs.planIdSlug)
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()
  const [res, setRes] = useState(null)

  const handleSubmit = async () => {
    if (planConf) {
      const json = getSourceJson(getPlanLayerId(planConf.id))

      const zip = new JSZip()
      zip.file('file', JSON.stringify(json))

      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const formData = new FormData()
      formData.append('file', zipBlob, 'file.zip')
      formData.append('zoning_col', planConf.fileSettings.zoningColumn)

      // const response = await useFileUploadMutation("http://localhost:8000/calculate", uploadFile)

      const response = await axios.post('http://localhost:8000/calculate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setRes(response.data)
    }
  }

  const handleDeleteClick = async () => {
    if (planConf) {
      router.push(getRoute(routeTree, routeTree))
      useAppStore((state) => state.deletePlanConf(planConf.id))
    }
  }

  useEffect(() => {
    if (planConf != null) {
      setIsLoaded(true)
    } else {
      router.push(getRoute(routeTree, routeTree))
    }
  }, [planConf])

  return (
    <>
      {isLoaded && planConf && (
        <>
          <Box sx={(theme) => ({ typography: theme.typography.h6, margin: '80px 0 0 0' })}>{planConf.name}</Box>
          {/* <MuiLink
            href={getRoute(routeTree.plan.settings, routeTree, [planConf.id])}
            sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
            component={Link}
          >
            <MenuButton sx={{ margin: '25px 0 0 0' }} variant="outlined">
              Kaavatiedoston asetukset <SettingsIcon />
            </MenuButton>
          </MuiLink> */}
          <MenuButton sx={{ margin: '25px 0 0 0' }} variant="outlined">
            Kaavan asetukset <TuneIcon />
          </MenuButton>
          <MenuButton variant="outlined">
            Laske hiilimuutokset <ForestIcon />
          </MenuButton>
          <MenuButton variant="outlined" onClick={handleSubmit}>
            Laske nykyiset hiilivarastot <ParkIcon />
          </MenuButton>
          <SmallMenuButton sx={{ margin: '50px 0 0 0' }} variant="outlined">
            Jakoasetukset <PeopleIcon />
          </SmallMenuButton>
          <SmallMenuButton variant="outlined" onClick={handleDeleteClick}>
            Poista kaava <DeleteForeverIcon />
          </SmallMenuButton>
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
