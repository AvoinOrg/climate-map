import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { commonDevtools } from '#/common/store/shared-devtools'

import {
  AdminVerificationStatus,
  AdminFolayerConf,
  FolayerConf,
  FolayerAreaConf,
  FolayerFeature,
  PartialFolayerFeature,
} from 'applets/luonnonmetsakartat/common/types'

type AdminFolayerConfMap = {
  [id: string]: AdminFolayerConf
}

type FolayerConfMap = {
  [id: string]: FolayerConf
}

type FolayerAreaConfMap = {
  [id: string]: FolayerAreaConf
}

type Vars = {
  folayerConfs: FolayerConfMap
  adminFolayerConfs: AdminFolayerConfMap
  folayerAreaConfs: FolayerAreaConfMap
  adminVerificationStatus: AdminVerificationStatus
  adminAccessGeneration: number
}

type Actions = {
  addFolayerConf: (folayerConf: FolayerConf) => void
  setFolayerConfs: (folayerConfs: FolayerConf[]) => void
  updateFolayerConf: (folayerId: string, updates: Partial<FolayerConf>) => void
  deleteFolayerConf: (folayerId: string) => void

  addAdminFolayerConf: (folayerConf: AdminFolayerConf) => void
  setAdminFolayerConfs: (folayerConfs: AdminFolayerConf[]) => void
  updateAdminFolayerConf: (
    folayerId: string,
    updates: Partial<AdminFolayerConf>
  ) => void
  deleteAdminFolayerConf: (folayerId: string) => void

  addFolayerAreaConf: (
    folayerId: string,
    folayerAreaConf: FolayerAreaConf
  ) => void
  updateFolayerAreaConf: (
    folayerId: string,
    updates: Partial<FolayerAreaConf>
  ) => void
  deleteFolayerAreaConf: (folayerId: string) => void
  setAdminVerificationStatus: (status: AdminVerificationStatus) => void
  getFolayerAreaById: (
    folayerId: string,
    areaId: string
  ) => FolayerFeature | undefined
  updateFolayerArea: (
    folayerId: string,
    areaId: string,
    updates: PartialFolayerFeature
  ) => void
}

export type State = Vars & Actions

export const useAppletStore = create<State>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => {
        const vars = {
          folayerConfs: {} as FolayerConfMap,
          adminFolayerConfs: {} as AdminFolayerConfMap,
          folayerAreaConfs: {} as FolayerAreaConfMap,
          adminVerificationStatus: AdminVerificationStatus.NoUser,
          adminAccessGeneration: 0,
        }

        const actions = {
          // FolayerConf actions
          addFolayerConf: (folayerConf: FolayerConf) => {
            set((state) => {
              state.folayerConfs[folayerConf.id] = folayerConf
            })
          },

          setFolayerConfs: (folayerConfs: FolayerConf[]) => {
            set((state) => {
              const folayerConfMap: FolayerConfMap = {}
              folayerConfs.forEach((conf) => {
                folayerConfMap[conf.id] = conf
              })
              state.folayerConfs = folayerConfMap
            })
          },

          updateFolayerConf: (
            folayerId: string,
            updates: Partial<FolayerConf>
          ) => {
            set((state) => {
              const existingConf = state.folayerConfs[folayerId]
              if (existingConf) {
                state.folayerConfs[folayerId] = {
                  ...existingConf,
                  ...updates,
                }
              }
            })
          },

          deleteFolayerConf: (folayerId: string) => {
            set((state) => {
              const { [folayerId]: _, ...rest } = state.folayerConfs
              state.folayerConfs = rest
            })
          },

          // AdminFolayerConf actions
          addAdminFolayerConf: (folayerConf: AdminFolayerConf) => {
            set((state) => {
              state.adminFolayerConfs[folayerConf.id] = folayerConf
            })
          },

          setAdminFolayerConfs: (folayerConfs: AdminFolayerConf[]) => {
            set((state) => {
              const folayerConfMap: AdminFolayerConfMap = {}
              folayerConfs.forEach((conf) => {
                folayerConfMap[conf.id] = conf
              })
              state.adminFolayerConfs = folayerConfMap
            })
          },

          updateAdminFolayerConf: (
            folayerId: string,
            updates: Partial<AdminFolayerConf>
          ) => {
            set((state) => {
              const existingConf = state.adminFolayerConfs[folayerId]
              if (existingConf) {
                state.adminFolayerConfs[folayerId] = {
                  ...existingConf,
                  ...updates,
                }
              }
            })
          },

          deleteAdminFolayerConf: (folayerId: string) => {
            set((state) => {
              const {
                [folayerId]: _adminFolayerConf,
                ...restAdminFolayerConfs
              } = state.adminFolayerConfs
              state.adminFolayerConfs = restAdminFolayerConfs

              if (state.folayerAreaConfs[folayerId]) {
                const {
                  [folayerId]: _folayerAreaConf,
                  ...restFolayerAreaConfs
                } = state.folayerAreaConfs
                state.folayerAreaConfs = restFolayerAreaConfs
              }
            })
          },

          // FolayerAreaConf actions
          addFolayerAreaConf: (
            folayerId: string,
            folayerAreaConf: FolayerAreaConf
          ) => {
            set((state) => {
              state.folayerAreaConfs[folayerId] = folayerAreaConf
            })
          },

          updateFolayerAreaConf: (
            folayerId: string,
            updates: Partial<FolayerAreaConf>
          ) => {
            set((state) => {
              const existingCollection = state.folayerAreaConfs[folayerId]
              if (existingCollection) {
                state.folayerAreaConfs[folayerId] = {
                  ...existingCollection,
                  ...updates,
                }
              }
            })
          },

          deleteFolayerAreaConf: (folayerId: string) => {
            set((state) => {
              const { [folayerId]: _, ...rest } = state.folayerAreaConfs
              state.folayerAreaConfs = rest
            })
          },

          // Admin verification status
          setAdminVerificationStatus: (status: AdminVerificationStatus) => {
            set((state) => {
              state.adminVerificationStatus = status
            })
          },
          getFolayerAreaById: (folayerId: string, areaId: string) => {
            const areaObj = get().folayerAreaConfs[folayerId]
            if (areaObj) {
              return areaObj.data.features.find(
                (feature) => feature.id === areaId
              )
            }
            return undefined
          },
          updateFolayerArea: (
            folayerId: string,
            areaId: string,
            updates: PartialFolayerFeature
          ) => {
            set((state) => {
              const areaObj = state.folayerAreaConfs[folayerId]
              if (areaObj) {
                const featureIndex = areaObj.data.features.findIndex(
                  (feature) => feature.id === areaId
                )
                if (featureIndex !== -1) {
                  const updatedFeature = {
                    ...areaObj.data.features[featureIndex],
                  }
                  if (updates.properties) {
                    updatedFeature.properties = {
                      ...updatedFeature.properties,
                      ...updates.properties,
                    }
                  }

                  areaObj.data.features[featureIndex] = updatedFeature
                }
              }
            })
          },
        }

        return { ...vars, ...actions }
      })
    ),
    { ...commonDevtools, store: 'luonnonmetsakartatStore' }
  )
)
