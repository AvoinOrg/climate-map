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

import { getRoute } from '#/common/utils/routing'
import useStore from '#/common/hooks/useStore'

import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { PlanConf } from 'applets/hiilikartta/types'
import { routeTree } from 'applets/hiilikartta/routes'
import { MapContext } from '#/components/Map'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const planConfs = useStore(useAppStore, (state) => state.planConfs)
  const { getSourceJson } = useContext(MapContext)
  const [planConf, setPlanConf] = useState<PlanConf>()
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()
  const [res, setRes] = useState(null)

  const handleSubmit = async () => {
    if (planConf) {
      const formData = new FormData()
      const json = getSourceJson(`${planConf.id}_zoning_plan`)
      console.log(json)
      formData.append('file', json)

      // const response = await useFileUploadMutation("http://localhost:8000/calculate", uploadFile)

      const response = await axios.post('http://localhost:8000/calculate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setRes(response.data)
    }
  }

  useEffect(() => {
    if (planConfs != null) {
      const planConf = planConfs.find((planConf) => planConf.id === params.planIdSlug)
      if (planConf) {
        setPlanConf(planConf)
      } else {
        router.push(getRoute(routeTree.base, routeTree))
      }
      setIsLoaded(true)
    }
  }, [planConfs])

  return (
    <>
      {isLoaded && planConf && (
        <>
          <Box sx={(theme) => ({ typography: theme.typography.h6, margin: '80px 0 0 0' })}>{planConf.name}</Box>
          {/* <MuiLink
            href={getRoute(routeTree.base.plan.settings, routeTree, [planConf.id])}
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
          <SmallMenuButton variant="outlined">
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
