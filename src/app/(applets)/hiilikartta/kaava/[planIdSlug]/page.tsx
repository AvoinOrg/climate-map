'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'
import TuneIcon from '@mui/icons-material/Tune'
import ParkIcon from '@mui/icons-material/Park'
import ForestIcon from '@mui/icons-material/Forest'
import PeopleIcon from '@mui/icons-material/People'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'

import { getRoute } from '#/common/utils/routing'

import { AppStateContext } from 'applets/hiilikartta/state/AppState'
import { PlanConf } from 'applets/hiilikartta/types'
import { routeTree } from 'applets/hiilikartta/routes'

const Page = ({ params }: { params: { planIdSlug: string } }) => {
  const { planConfs } = useContext(AppStateContext)
  const [planConf, setPlanConf] = useState<PlanConf>()
  const [isLoaded, setIsLoaded] = useState(false)
  const router = useRouter()

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
          <MenuButton sx={{ margin: '25px 0 0 0' }} variant="outlined">
            Kaavan asetukset <TuneIcon />
          </MenuButton>
          <MenuButton variant="outlined">
            Laske hiilimuutokset <ForestIcon />
          </MenuButton>
          <MenuButton variant="outlined">
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
