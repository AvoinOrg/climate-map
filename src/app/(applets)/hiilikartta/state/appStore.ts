import { generateShortId } from '#/common/utils/general'
import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { NewPlanConf, PlanConf } from '../common/types'

interface AppState {
  planConfs: { [key: string]: PlanConf }
  deletePlanConf: (planId: string) => void
  addPlanConf: (newPlanConf: NewPlanConf) => Promise<PlanConf>
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      planConfs: {},
      deletePlanConf: async (planId: string) => {
        set((state) => {
          const planConfs = { ...state.planConfs }
          delete planConfs[planId]
          return { planConfs }
        })
      },
      addPlanConf: async (newPlanConf: NewPlanConf) => {
        const id = generateShortId()
        const created = new Date().getTime()
        const planConf = { id, created, ...newPlanConf }
        await set((state) => {
          const planConfs = { ...state.planConfs }
          planConfs[id] = planConf
          return { planConfs }
        })
        return planConf
      },
    }),
    {
      name: 'food-storage', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
    }
  )
)
