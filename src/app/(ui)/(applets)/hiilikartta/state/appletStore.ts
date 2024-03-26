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

import {
  CalculationState,
  NewPlanConf,
  PlanConf,
  PlanDataFeature,
  ExternalPlanConf,
  PlaceholderPlanConf,
} from '../common/types'
import { calcQueryPoll } from '../common/queries/calcQueryPoll'
import { FetchStatus } from '#/common/types/general'
import { externalPlanQuery } from '../common/queries/externalPlanQuery'

type Vars = {
  planConfs: { [key: string]: PlanConf }
  externalPlanConfs: { [key: string]: ExternalPlanConf }
  placeholderPlanConfs: { [key: string]: PlaceholderPlanConf }
}

type Actions = {
  deletePlanConf: (planId: string) => void
  addPlanConf: (newPlanConf: NewPlanConf) => Promise<PlanConf>
  updatePlanConf: (
    planId: string,
    planConf: Partial<PlanConf>
  ) => Promise<PlanConf | null>
  updatePlanConfDataFeature: (
    planId: string,
    featureId: string,
    feature: Partial<PlanDataFeature>
  ) => Promise<PlanDataFeature | null>
  copyPlanConf: (planId: string, nameSuffix?: string) => Promise<PlanConf>
  addExternalPlanConf: (
    serverId: string,
    externalPlanConf?: ExternalPlanConf
  ) => Promise<ExternalPlanConf>
  updateExternalPlanConf: (
    serverId: string,
    externalPlanConf: Partial<ExternalPlanConf>
  ) => Promise<ExternalPlanConf | null>
  updatePlaceholderPlanConf: (
    serverId: string,
    placeholderPlanConf: Partial<PlaceholderPlanConf>
  ) => Promise<PlaceholderPlanConf | null>
  deletePlaceholderPlanConf: (serverId: string) => Promise<void>
}

export const useAppletStore = create<Vars & Actions>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => {
        const vars: Vars = {
          planConfs: {},
          externalPlanConfs: {},
          placeholderPlanConfs: {},
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

            const planConf: PlanConf = {
              id,
              serverId,
              created,
              reportData: undefined,
              calculationState: CalculationState.NOT_STARTED,
              localLastEdited: created,
              ...newPlanConf,
            }
            await set((state) => {
              state.planConfs[planConf.id] = planConf
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

            const updatedPlanConf = {
              ...oldPlanConf,
              ...planConf,
              areSettingsValid: true,
            }

            if (
              planConf.localLastEdited == null &&
              (oldPlanConf.name !== planConf.name ||
                (planConf.data != null &&
                  !isEqual(planConf.data, oldPlanConf.data)))
            ) {
              planConf.localLastEdited = new Date().getTime()
            }

            await set((state) => {
              state.planConfs[planId] = updatedPlanConf
            })

            return updatedPlanConf
          },

          updatePlanConfDataFeature: async (
            planId: string,
            featureId: string,
            feature: Partial<PlanDataFeature>
          ) => {
            const planConf = get().planConfs[planId]
            if (!planConf) {
              console.error(
                "Can't update a feature in a planConf that does not exist"
              )
              return null
            }

            const features = planConf.data.features
            const featureIndex = features.findIndex(
              (f) => f.properties.id === featureId
            )
            if (featureIndex === -1) {
              console.error('Feature not found')
              return null
            }

            await set((state) => {
              if (feature.geometry != null) {
                state.planConfs[planId].data.features[featureIndex].geometry =
                  feature.geometry
              }
              if (feature.properties != null) {
                const featureProperties = {
                  ...features[featureIndex].properties,
                  ...feature.properties,
                }
                state.planConfs[planId].data.features[featureIndex].properties =
                  featureProperties
              }
              state.planConfs[planId].localLastEdited = new Date().getTime()
            })

            return features[featureIndex]
          },

          copyPlanConf: async (planId: string, nameSuffix?: string) => {
            const { addPlanConf, planConfs } = get()
            const planConf = planConfs[planId]

            const newPlanConf: NewPlanConf = {
              name: `${planConf.name}${nameSuffix != null && ' ' + nameSuffix}`,
              areaHa: planConf.areaHa,
              data: cloneDeep(planConf.data),
            }
            const copiedPlanConf = await addPlanConf(newPlanConf)
            return copiedPlanConf
          },

          addExternalPlanConf: async (
            serverId: string,
            externalPlanConf?: ExternalPlanConf
          ) => {
            let newExternalPlanConf = {
              serverId: serverId,
              status: FetchStatus.NOT_STARTED,
            }
            if (externalPlanConf != null) {
              externalPlanConf = { ...newExternalPlanConf, ...externalPlanConf }
            }
            await set((state) => {
              state.externalPlanConfs[serverId] = newExternalPlanConf
            })
            return newExternalPlanConf
          },

          updateExternalPlanConf: async (
            serverId: string,
            planConf: Partial<ExternalPlanConf>
          ) => {
            const oldPlanConf = get().externalPlanConfs[serverId]
            if (oldPlanConf == null) {
              console.error("Can't update a planConf that does not exist")
              return null
            }

            const updatedPlanConf = { ...oldPlanConf, ...planConf }
            await set((state) => {
              state.externalPlanConfs[serverId] = updatedPlanConf
            })
            return updatedPlanConf
          },

          updatePlaceholderPlanConf: async (
            serverId: string,
            planConf: Partial<PlaceholderPlanConf> | undefined
          ) => {
            let oldPlanConf = get().placeholderPlanConfs[serverId]
            if (oldPlanConf == null) {
              oldPlanConf = {
                serverId: serverId,
                status: FetchStatus.NOT_STARTED,
              }
            }

            let updatedPlanConf = oldPlanConf
            if (planConf != null) {
              updatedPlanConf = { ...oldPlanConf, ...planConf }
            }
            await set((state) => {
              state.placeholderPlanConfs[serverId] = updatedPlanConf
            })
            return updatedPlanConf
          },

          deletePlaceholderPlanConf: async (serverId: string) => {
            set((state) => {
              delete state.planConfs[serverId]
            })
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
            for (const extPlanId of Object.keys(state.externalPlanConfs)) {
              if (
                Object.keys(state.planConfs)
                  .map((id) => state.planConfs[id]?.serverId)
                  .includes(extPlanId)
              ) {
                delete state.externalPlanConfs[extPlanId]
              } else if (
                [FetchStatus.FETCHING, FetchStatus.ERRORED].includes(
                  state.externalPlanConfs[extPlanId].status
                )
              ) {
                state.externalPlanConfs[extPlanId].status =
                  FetchStatus.NOT_STARTED
              }
            }
            state.placeholderPlanConfs = {}
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
      queryClient.fetchQuery(calcQueryPoll(planConfs[planId]))
    })
  }
)

useAppletStore.subscribe(
  (state) =>
    pickBy(state.externalPlanConfs, (extPlanConf) =>
      [FetchStatus.NOT_STARTED].includes(extPlanConf.status)
    ),
  (extPlanConfs, _previousPlanConfs) => {
    Object.keys(extPlanConfs).forEach((planId: string) => {
      queryClient.fetchQuery(externalPlanQuery(planId))
    })
  },
  { fireImmediately: true }
)
