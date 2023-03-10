'use client'

import React, { createContext, useState } from 'react'

import { PlanConf } from '../types'

interface IContext {
  planConfs: PlanConf[]
  addPlanConf: (planConf: PlanConf) => void
  updatePlanConf: (planConf: PlanConf) => void
}

export const AppStateContext = createContext({} as IContext)

export const AppStateProvider = (props: any) => {
  const [planConfs, setPlanConfs] = useState<PlanConf[]>([])

  const updatePlanConf = (planConf: PlanConf) => {}

  const addPlanConf = (planConf: PlanConf) => {
    setPlanConfs((prev) => [...prev, planConf])
  }

  const values: IContext = {
    planConfs,
    addPlanConf,
    updatePlanConf,
  }

  return <AppStateContext.Provider value={values}>{props.children}</AppStateContext.Provider>
}
