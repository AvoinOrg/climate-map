import { generateShortId } from '#/common/utils/general'
import { useState, useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { NewPlanConf, PlanConf } from '../common/types'

type State = {
  planConfs: { [key: string]: PlanConf }
}

type Actions = {
  deletePlanConf: (planId: string) => void
  addPlanConf: (newPlanConf: NewPlanConf) => Promise<PlanConf>
  // addReport: (planId: string, report: any) => Promise<any>
}

export const useAppStore = create<State & Actions>()(
  persist(
    immer((set, get) => ({
      planConfs: {},
      deletePlanConf: async (planId: string) => {
        set((state) => {
          delete state.planConfs[planId]
        })
      },
      addPlanConf: async (newPlanConf: NewPlanConf) => {
        const id = generateShortId()
        const created = new Date().getTime()
        const planConf = { id, created, reports: {}, ...newPlanConf }
        await set((state) => {
          state.planConfs[id] = planConf
        })
        return planConf
      },
      addReport: async (planId: string, report: any) => {
        const id = generateShortId()
        const planConf = await get().planConfs[planId]
        await set((state) => {
          state.planConfs.reports[id] = report
        })
        return planConf
      },
    })),
    {
      name: 'hiilikarttaStore', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
    }
  )
)
