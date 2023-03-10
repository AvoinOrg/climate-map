'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

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

  return <>{isLoaded && <Box>{planConf && <Box>{planConf.name}</Box>}</Box>}</>
}

export default Page
