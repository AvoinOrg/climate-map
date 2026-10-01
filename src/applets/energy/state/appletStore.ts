import { create } from 'zustand'
import { subscribeWithSelector, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { commonDevtools } from '#/common/store/shared-devtools'
import type {
  AreaGeographyMode,
  AreaMetric,
  EffectiveGeography,
} from 'applets/energy/common/areas/mapModes'
import {
  ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
  ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE,
} from '../layers/buildingPolygonsLayerConf'
import { ENERGY_CERTIFICATE_CLASS_CODES } from '../layers/energyCertificateLayerConf'
import { areEnergymapSelectedBuildingsEqual } from '../common/utils'
import type {
  EnergymapBuildingFilterState,
  EnergymapSelectedConstructionDecade,
  EnergymapBuildingTypeFilter,
} from '../layers/buildingPolygonsLayerConf'
import type { EnergymapSelectedBuilding } from '../common/types'
import type { EnergyCertificateClassCode } from '../layers/energyCertificateLayerConf'

type EnergyCertificateClassFilterState = {
  activeEnergyCertificateClasses: EnergyCertificateClassCode[]
}

type SelectedBuildingState = {
  selectedBuilding: EnergymapSelectedBuilding | null
}

type Vars = {
  geographyMode: AreaGeographyMode
  areaMetric: AreaMetric
  effectiveGeography: EffectiveGeography
  areaAvailable: boolean
  areaZoom: number
} & EnergymapBuildingFilterState &
  EnergyCertificateClassFilterState &
  SelectedBuildingState

type Actions = {
  setGeographyMode: (mode: AreaGeographyMode) => void
  setAreaMetric: (metric: AreaMetric) => void
  setSelectedBuilding: (selectedBuilding: EnergymapSelectedBuilding) => void
  clearSelectedBuilding: () => void
  setBuildingTypeFilter: (
    buildingTypeFilter: EnergymapBuildingTypeFilter
  ) => void
  setSelectedConstructionDecade: (
    selectedConstructionDecade: EnergymapSelectedConstructionDecade
  ) => void
  setShowBuildingsFromSelectedDecade: (
    showBuildingsFromSelectedDecade: boolean
  ) => void
  setShowOnlySelectedDecade: (showOnlySelectedDecade: boolean) => void
  setEnergyCertificateClassActive: (
    classCode: EnergyCertificateClassCode,
    isActive: boolean
  ) => void
  toggleEnergyCertificateClass: (classCode: EnergyCertificateClassCode) => void
  setActiveEnergyCertificateClasses: (
    activeEnergyCertificateClasses: EnergyCertificateClassCode[]
  ) => void
  resetEnergyCertificateClassFilters: () => void
  resetBuildingFilters: () => void
}

export type State = Vars & Actions

const initialBuildingFilterState: Vars = {
  geographyMode: 'automatic',
  areaMetric: 'certificate_coverage',
  effectiveGeography: 'buildings',
  areaAvailable: false,
  areaZoom: 12,
  buildingTypeFilter: ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
  selectedConstructionDecade: ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE,
  showBuildingsFromSelectedDecade: false,
  showOnlySelectedDecade: false,
  activeEnergyCertificateClasses: [...ENERGY_CERTIFICATE_CLASS_CODES],
  selectedBuilding: null,
}

export const useAppletStore = create<State>()(
  devtools(
    subscribeWithSelector(
      immer((set) => {
        const vars = initialBuildingFilterState

        const actions: Actions = {
          setGeographyMode: (geographyMode) => set({ geographyMode }),
          setAreaMetric: (areaMetric) => set({ areaMetric }),
          setSelectedBuilding: (selectedBuilding) => {
            set((state) => {
              if (
                areEnergymapSelectedBuildingsEqual(
                  state.selectedBuilding,
                  selectedBuilding
                )
              ) {
                return
              }

              state.selectedBuilding = selectedBuilding
            })
          },
          clearSelectedBuilding: () => {
            set((state) => {
              state.selectedBuilding = null
            })
          },
          setBuildingTypeFilter: (buildingTypeFilter) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              state.buildingTypeFilter = buildingTypeFilter
            })
          },
          setSelectedConstructionDecade: (selectedConstructionDecade) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              state.selectedConstructionDecade = selectedConstructionDecade

              if (selectedConstructionDecade == null) {
                state.showBuildingsFromSelectedDecade = false
                state.showOnlySelectedDecade = false
              }
            })
          },
          setShowBuildingsFromSelectedDecade: (
            showBuildingsFromSelectedDecade
          ) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              if (
                !showBuildingsFromSelectedDecade ||
                state.selectedConstructionDecade == null
              ) {
                state.showBuildingsFromSelectedDecade = false
                state.showOnlySelectedDecade = false
                return
              }

              state.showBuildingsFromSelectedDecade = true
              state.showOnlySelectedDecade = false
            })
          },
          setShowOnlySelectedDecade: (showOnlySelectedDecade) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              if (
                !showOnlySelectedDecade ||
                state.selectedConstructionDecade == null
              ) {
                state.showBuildingsFromSelectedDecade = false
                state.showOnlySelectedDecade = false
                return
              }

              state.showBuildingsFromSelectedDecade = false
              state.showOnlySelectedDecade = true
            })
          },
          setEnergyCertificateClassActive: (classCode, isActive) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              const classSet = new Set(state.activeEnergyCertificateClasses)

              if (isActive) {
                classSet.add(classCode)
              } else {
                classSet.delete(classCode)
              }

              state.activeEnergyCertificateClasses =
                ENERGY_CERTIFICATE_CLASS_CODES.filter((candidateClassCode) =>
                  classSet.has(candidateClassCode)
                )
            })
          },
          toggleEnergyCertificateClass: (classCode) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              const classSet = new Set(state.activeEnergyCertificateClasses)

              if (classSet.has(classCode)) {
                classSet.delete(classCode)
              } else {
                classSet.add(classCode)
              }

              state.activeEnergyCertificateClasses =
                ENERGY_CERTIFICATE_CLASS_CODES.filter((candidateClassCode) =>
                  classSet.has(candidateClassCode)
                )
            })
          },
          setActiveEnergyCertificateClasses: (
            activeEnergyCertificateClasses
          ) => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              const classSet = new Set(activeEnergyCertificateClasses)

              state.activeEnergyCertificateClasses =
                ENERGY_CERTIFICATE_CLASS_CODES.filter((classCode) =>
                  classSet.has(classCode)
                )
            })
          },
          resetEnergyCertificateClassFilters: () => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              state.activeEnergyCertificateClasses = [
                ...initialBuildingFilterState.activeEnergyCertificateClasses,
              ]
            })
          },
          resetBuildingFilters: () => {
            set((state) => {
              if (state.effectiveGeography !== 'buildings') return
              state.buildingTypeFilter =
                initialBuildingFilterState.buildingTypeFilter
              state.selectedConstructionDecade =
                initialBuildingFilterState.selectedConstructionDecade
              state.showBuildingsFromSelectedDecade =
                initialBuildingFilterState.showBuildingsFromSelectedDecade
              state.showOnlySelectedDecade =
                initialBuildingFilterState.showOnlySelectedDecade
            })
          },
        }

        return { ...vars, ...actions }
      })
    ),
    { ...commonDevtools, store: 'energyStore' }
  )
)
