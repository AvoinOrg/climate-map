'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box, Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

import { AppStateContext } from '../../state/AppState'
import { PlanConf } from '../../types'
import { routes } from '../../constants'

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
        router.push(routes.base)
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
            Kaavan asetukset
          </MenuButton>
          <MenuButton variant="outlined">Laske hiilimuutokset</MenuButton>
          <MenuButton variant="outlined">Laske nykyiset hiilivarastot</MenuButton>
          <SmallMenuButton sx={{ margin: '50px 0 0 0' }} variant="outlined">
            Jakoasetukset
          </SmallMenuButton>
          <SmallMenuButton variant="outlined">Poista kaava</SmallMenuButton>
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
