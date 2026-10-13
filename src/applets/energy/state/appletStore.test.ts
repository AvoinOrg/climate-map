import { ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE } from '../layers/buildingPolygonsLayerConf'
import type { EnergymapSelectedBuilding } from '../common/types'
import { useAppletStore } from './appletStore'

const selectedBuilding: EnergymapSelectedBuilding = {
  id: '9da63bcd-bb54-447c-b991-8eec8f8c5666',
  buildingKey: '9da63bcd-bb54-447c-b991-8eec8f8c5666',
  source: 'energymap_building_polygons',
  sourceLayer: 'energymap_building_polygons',
  layerId: 'energymap_building_polygons-fill',
  properties: {
    building_key: '9da63bcd-bb54-447c-b991-8eec8f8c5666',
    permanent_building_identifier: '101614422K',
    main_purpose: '05',
  },
}

describe('Energiakartta applet store building filters', () => {
  beforeEach(() => {
    useAppletStore.getState().resetBuildingFilters()
    useAppletStore.getState().clearSelectedBuilding()
  })

  it('defaults to no selected construction decade with both switches off', () => {
    const state = useAppletStore.getState()

    expect(state.selectedConstructionDecade).toBe(
      ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE
    )
    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
    expect(state.selectedBuilding).toBeNull()
  })

  it('resets to no selected construction decade with both switches off', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowBuildingsFromSelectedDecade(true)
    useAppletStore.getState().setShowOnlySelectedDecade(true)

    useAppletStore.getState().resetBuildingFilters()

    const state = useAppletStore.getState()

    expect(state.selectedConstructionDecade).toBe(
      ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE
    )
    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('turns only-selected-decade off when from-selected-decade is turned on', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowOnlySelectedDecade(true)

    useAppletStore.getState().setShowBuildingsFromSelectedDecade(true)

    const state = useAppletStore.getState()

    expect(state.showBuildingsFromSelectedDecade).toBe(true)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('turns from-selected-decade off when only-selected-decade is turned on', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowBuildingsFromSelectedDecade(true)

    useAppletStore.getState().setShowOnlySelectedDecade(true)

    const state = useAppletStore.getState()

    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(true)
  })

  it('turning from-selected-decade off leaves both construction switches off', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowBuildingsFromSelectedDecade(true)

    useAppletStore.getState().setShowBuildingsFromSelectedDecade(false)

    const state = useAppletStore.getState()

    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('turning only-selected-decade off leaves both construction switches off', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowOnlySelectedDecade(true)

    useAppletStore.getState().setShowOnlySelectedDecade(false)

    const state = useAppletStore.getState()

    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('keeps switches off when no construction decade is selected', () => {
    useAppletStore.getState().setShowBuildingsFromSelectedDecade(true)
    useAppletStore.getState().setShowOnlySelectedDecade(true)

    const state = useAppletStore.getState()

    expect(state.selectedConstructionDecade).toBe(
      ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE
    )
    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('clears both construction switches when no construction decade is selected', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowOnlySelectedDecade(true)

    useAppletStore.getState().setSelectedConstructionDecade(null)

    const state = useAppletStore.getState()

    expect(state.selectedConstructionDecade).toBe(
      ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE
    )
    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('stores and clears the selected building mirror without touching filters', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowBuildingsFromSelectedDecade(true)

    useAppletStore.getState().setSelectedBuilding(selectedBuilding)

    expect(useAppletStore.getState().selectedBuilding).toEqual(selectedBuilding)

    useAppletStore.getState().clearSelectedBuilding()

    const state = useAppletStore.getState()

    expect(state.selectedBuilding).toBeNull()
    expect(state.selectedConstructionDecade).toBe(1970)
    expect(state.showBuildingsFromSelectedDecade).toBe(true)
    expect(state.showOnlySelectedDecade).toBe(false)
  })

  it('keeps the selected building while resetting building filters', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowOnlySelectedDecade(true)
    useAppletStore.getState().setSelectedBuilding(selectedBuilding)

    useAppletStore.getState().resetBuildingFilters()

    const state = useAppletStore.getState()

    expect(state.selectedBuilding).toEqual(selectedBuilding)
    expect(state.selectedConstructionDecade).toBe(
      ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE
    )
    expect(state.showBuildingsFromSelectedDecade).toBe(false)
    expect(state.showOnlySelectedDecade).toBe(false)
  })
})

it.each(['region', 'municipality', 'postal_code'] as const)(
  'shares themes/categories at %s zoom while purpose filters remain building-only',
  (effectiveGeography) => {
    useAppletStore.setState({
      ...useAppletStore.getInitialState(),
      effectiveGeography,
    })
    const state = useAppletStore.getState()
    state.setActiveThematicMode('heating')
    state.setHeatingCategoryActive('other', false)
    state.setVentilationCategoryActive('no_info', false)
    state.setActiveEnergyCertificateClasses(['G', 'A', 'A'])
    expect(useAppletStore.getState().activeEnergyCertificateClasses).toEqual([
      'A',
      'G',
    ])
    state.toggleEnergyCertificateClass('G')
    state.setEnergyCertificateClassActive('B', true)
    expect(useAppletStore.getState().activeEnergyCertificateClasses).toEqual([
      'A',
      'B',
    ])
    state.setBuildingTypeFilter('02')
    state.setSelectedConstructionDecade(2000)
    state.setShowOnlySelectedDecade(true)
    expect(useAppletStore.getState().buildingTypeFilter).toBe(
      useAppletStore.getInitialState().buildingTypeFilter
    )
    expect(useAppletStore.getState().selectedConstructionDecade).toBeNull()
    expect(useAppletStore.getState().showOnlySelectedDecade).toBe(false)
    useAppletStore.setState({ effectiveGeography: 'buildings' })
    expect(useAppletStore.getState().activeThematicMode).toBe('heating')
    expect(useAppletStore.getState().heatingSwitchState.other).toBe(false)
    expect(useAppletStore.getState().ventilationSwitchState.no_info).toBe(false)
    state.resetEnergyCertificateClassFilters()
    expect(useAppletStore.getState().activeEnergyCertificateClasses).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ])
    useAppletStore.setState(useAppletStore.getInitialState())
  }
)
