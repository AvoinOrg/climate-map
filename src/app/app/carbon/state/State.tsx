'use client'

import React, { createContext, useState } from 'react'

import { PlanConf } from '../types'

interface IContext {
  planConfs: PlanConf[]
  updatePlanConf: (planConf: PlanConf) => void
}

export const StateContext = createContext({} as IContext)

export const StateProvider = (props: any) => {
  const [planConfs, setPlanConfs] = useState<PlanConf[]>([])

  const updatePlanConf = (planConf: PlanConf) => {}

  const values: IContext = {
    planConfs,
    updatePlanConf,
  }

  return <StateContext.Provider value={values}>{props.children}</StateContext.Provider>
}
