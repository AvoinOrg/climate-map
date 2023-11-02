import { create } from 'zustand'
import {
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { pickBy } from 'lodash-es'

import { generateShortId, generateUUID } from '#/common/utils/general'
import { queryClient } from '#/common/queries/queryClient'

import { CalculationState, NewPlanConf, PlanConf } from '../common/types'
import { calcPollQuery } from '../common/queries/calcPollQuery'

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
    subscribeWithSelector(
      immer((set, get) => ({
        planConfs: {},
        deletePlanConf: async (planId: string) => {
          set((state) => {
            delete state.planConfs[planId]
          })
        },
        addPlanConf: async (newPlanConf: NewPlanConf) => {
          const id = generateShortId()
          const serverId = generateUUID()
          const created = new Date().getTime()
          const planConf = {
            id,
            serverId,
            created,
            reportData: undefined,
            calculationState: CalculationState.NOT_STARTED,
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
      }))
    ),
    {
      name: 'hiilikarttaStore', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.log('an error happened during hydration', error)
          }
          if (state) {
            for (const planId of Object.keys(state.planConfs)) {
              if (
                state.planConfs[planId].calculationState ===
                CalculationState.INITIALIZING
              ) {
                state.planConfs[planId].calculationState =
                  CalculationState.NOT_STARTED
              }
            }
          }
        }
      },
    }
  )
)

useAppletStore.subscribe(
  (state) =>
    pickBy(
      state.planConfs,
      (planConf) => planConf.calculationState === CalculationState.CALCULATING
    ),
  (planConfs, _previousPlanConfs) => {
    Object.keys(planConfs).forEach((planId: string) => {
      queryClient.fetchQuery(calcPollQuery(planConfs[planId]))
    })
  }
)
