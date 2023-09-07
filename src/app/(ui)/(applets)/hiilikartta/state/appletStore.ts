import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { generateShortId } from '#/common/utils/general'

import { NewPlanConf, PlanConf } from '../common/types'

type State = {
  planConfs: { [key: string]: PlanConf }
}

type Actions = {
  deletePlanConf: (planId: string) => void
  addPlanConf: (newPlanConf: NewPlanConf) => Promise<PlanConf>
  updatePlanConf: (
    planId: string,
    planConf: Partial<PlanConf>
  ) => Promise<PlanConf>
}

export const useAppletStore = create<State & Actions>()(
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
        const planConf = {
          id,
          created,
          reportData: undefined,
          isCalculating: false,
          ...newPlanConf,
        }
        await set((state) => {
          state.planConfs[id] = planConf
        })
        return planConf
      },
      updatePlanConf: async (planId: string, planConf: Partial<PlanConf>) => {
        const updatedPlanConf = { ...get().planConfs[planId], ...planConf }
        await set((state) => {
          state.planConfs[planId] = updatedPlanConf
        })
        return updatedPlanConf
      },
    })),
    {
      name: 'hiilikarttaStore', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
    }
  )
)
