import { create } from 'zustand'
import {
  persist,
  createJSONStorage,
  subscribeWithSelector,
} from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { cloneDeep, isEqual, pickBy } from 'lodash-es'

import { FetchStatus } from '#/common/types/general'
import { generateShortId, generateUUID } from '#/common/utils/general'
import { queryClient } from '#/common/queries/queryClient'

import {
  CalculationState,
  NewPlanConf,
  PlanConf,
  PlanDataFeature,
  ExternalPlanConf,
  PlaceholderPlanConf,
  PlanConfState,
  GlobalState,
} from '../common/types'
import { calcQueryPoll } from '../common/queries/calcQueryPoll'
import { externalPlanQuery } from '../common/queries/externalPlanQuery'
// import { checkIsValidZoningCode } from '../common/utils'

type Vars = {
  planConfs: { [key: string]: PlanConf }
  externalPlanConfs: { [key: string]: ExternalPlanConf }
  placeholderPlanConfs: { [key: string]: PlaceholderPlanConf }
  globalState: GlobalState
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
  addPlaceholderPlanConf: (
    id: string,
    planConf: PlaceholderPlanConf
  ) => Promise<PlaceholderPlanConf>
  updatePlaceholderPlanConf: (
    id: string,
    placeholderPlanConf: Partial<PlaceholderPlanConf>
  ) => Promise<PlaceholderPlanConf | null>
  deletePlaceholderPlanConf: (serverId: string) => Promise<void>
  clearPlaceholderPlanConfs: () => Promise<void>
  updateGlobalState: (globalState: GlobalState) => void
}

export const useAppletStore = create<Vars & Actions>()(
  persist(
    subscribeWithSelector(
      immer((set, get) => {
        const vars: Vars = {
          planConfs: {},
          externalPlanConfs: {},
          placeholderPlanConfs: {},
          globalState: GlobalState.INITIALIZING,
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
              // areSettingsValid: true,
              ...newPlanConf,
            }

            // if (
            //   planConf.userId == null &&
            //   useUserStore.getState().user?.id != null
            // ) {
            //   planConf.userId = useUserStore.getState().user?.id
            // }

            // if (planConf?.data.features && planConf.data.features.length > 0) {
            //   for (const feature of planConf.data.features) {
            //     if (!checkIsValidZoningCode(feature.properties.zoning_code)) {
            //       planConf.areSettingsValid = false
            //       break
            //     }
            //   }
            // } else {
            //   planConf.areSettingsValid = false
            // }

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

            // if (
            //   updatedPlanConf?.data.features &&
            //   updatedPlanConf.data.features.length > 0
            // ) {
            //   for (const feature of updatedPlanConf.data.features) {
            //     if (!checkIsValidZoningCode(feature.properties.zoning_code)) {
            //       updatedPlanConf.areSettingsValid = false
            //       break
            //     }
            //   }
            // } else {
            //   updatedPlanConf.areSettingsValid = false
            // }

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

                // if (!checkIsValidZoningCode(featureProperties.zoning_code)) {
                //   if (state.planConfs[planId].areSettingsValid) {
                //     state.planConfs[planId].areSettingsValid = false
                //   }
                // } else {
                //   if (!state.planConfs[planId].areSettingsValid) {
                //     let foundInvalid = false
                //     for (const feature of planConf.data.features) {
                //       if (
                //         !checkIsValidZoningCode(feature.properties.zoning_code)
                //       ) {
                //         foundInvalid = true
                //         break
                //       }
                //     }

                //     if (!foundInvalid) {
                //       state.planConfs[planId].areSettingsValid = true
                //     }
                //   }
                // }
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

          addPlaceholderPlanConf: async (
            id: string,
            planConf: PlaceholderPlanConf
          ) => {
            await set((state) => {
              state.placeholderPlanConfs[id] = {
                ...planConf,
                status: FetchStatus.NOT_STARTED,
              }
            })
            return planConf
          },

          updatePlaceholderPlanConf: async (
            id: string,
            planConf: Partial<PlaceholderPlanConf> | undefined
          ) => {
            let oldPlanConf = get().placeholderPlanConfs[id]
            if (oldPlanConf == null) {
              console.error('Unable to update non-existing placeholderPlanConf')
              return null
            }

            let updatedPlanConf = oldPlanConf
            if (planConf != null) {
              updatedPlanConf = { ...oldPlanConf, ...planConf }
            }
            await set((state) => {
              state.placeholderPlanConfs[id] = updatedPlanConf
            })
            return updatedPlanConf
          },

          deletePlaceholderPlanConf: async (id: string) => {
            set((state) => {
              delete state.placeholderPlanConfs[id]
            })
          },

          clearPlaceholderPlanConfs: async () => {
            set((state) => {
              state.placeholderPlanConfs = {}
            })
          },
          updateGlobalState: (globalState: GlobalState) => {
            if (globalState !== get().globalState) {
              set((state) => {
                state.globalState = globalState
              })
            }
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
            console.log(
              'hiilikartta store: an error happened during hydration',
              error
            )
          }
          if (state) {
            state.globalState = GlobalState.INITIALIZING
            for (const planId of Object.keys(state.planConfs)) {
              if (
                state.planConfs[planId].calculationState ===
                CalculationState.INITIALIZING
              ) {
                state.planConfs[planId].calculationState =
                  CalculationState.NOT_STARTED
              }
              if (
                state.planConfs[planId].state == null ||
                state.planConfs[planId].state !== PlanConfState.IDLE
              ) {
                state.planConfs[planId].state = PlanConfState.IDLE
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
