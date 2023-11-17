import { create } from 'zustand'
import {
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { cloneDeep, pickBy } from 'lodash-es'

import { generateShortId, generateUUID } from '#/common/utils/general'
import { queryClient } from '#/common/queries/queryClient'

import { CalculationState, NewPlanConf, PlanConf } from '../common/types'
import { calcPollQuery } from '../common/queries/calcPollQuery'

type Vars = {
  planConfs: { [key: string]: PlanConf }
}

type Actions = {
  deletePlanConf: (planId: string) => void
  addPlanConf: (newPlanConf: NewPlanConf) => Promise<PlanConf>
  updatePlanConf: (
    planId: string,
    planConf: Partial<PlanConf>
  ) => Promise<PlanConf | null>
  copyPlanConf: (planId: string, nameSuffix?: string) => Promise<PlanConf>
}

export const useAppletStore = create<Vars & Actions>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => {
        const vars: Vars = {
          planConfs: {},
        }

        const actions: Actions = {
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

          updatePlanConf: async (
            planId: string,
            planConf: Partial<PlanConf>
          ) => {
            const oldPlanConf = get().planConfs[planId]
            if (oldPlanConf == null) {
              console.error("Can't update a planConf that does not exist")
              return null
            }

            const updatedPlanConf = { ...oldPlanConf, ...planConf }
            await set((state) => {
              state.planConfs[planId] = updatedPlanConf
            })
            return updatedPlanConf
          },

          copyPlanConf: async (planId: string, nameSuffix?: string) => {
            const { addPlanConf, planConfs } = get()
            const planConf = planConfs[planId]

            const newPlanConf: NewPlanConf = {
              name: `${planConf.name}${nameSuffix != null && ' ' + nameSuffix}`,
              areaHa: planConf.areaHa,
              data: cloneDeep(planConf.data),
              fileSettings: cloneDeep(planConf.fileSettings),
            }
            const copiedPlanConf = await addPlanConf(newPlanConf)
            return copiedPlanConf
          },
        }
        return { ...vars, ...actions }
      })
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
