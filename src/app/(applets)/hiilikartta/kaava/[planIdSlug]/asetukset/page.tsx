'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box, Button, Select } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'

import { PlanConf } from 'applets/hiilikartta/types'
import { routeTree } from 'applets/hiilikartta/routes'
import SelectionMenu from 'applets/hiilikartta/components/SelectionMenu'

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
          <SelectionMenu />
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
