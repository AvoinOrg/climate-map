import { LayerOrderLevel } from '#/common/types/map'
import {
  flattenLayerBackedListedLayerItems,
  getListedLayerMenuOrderLevel,
  isLayerBackedListedLayerItem,
  isListedLayerAccordionItem,
} from '#/common/utils/listedLayerGroups'
import {
  listedMmlKiinteistojaotusLayerGroup,
  listedMmlKiinteistotunnuksetLayerGroup,
} from '#/components/Map/layers/defaultListedLayerGroups'
import {
  ENERGYMAP_MAIN_LAYER_GROUP_IDS,
  listedBackgroundBuildingFiltersAccordion,
  listedLayerGroups,
} from './constants'
import { ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID } from '../layers/buildingPolygonsLayerConf'
import { ENERGYMAP_ENERGY_CERTIFICATE_LAYER_GROUP_ID } from '../layers/energyCertificateLayerConf'
import { ENERGYMAP_HEATING_LAYER_GROUP_ID } from '../layers/heatingLayerConf'
import { ENERGYMAP_VENTILATION_LAYER_GROUP_ID } from '../layers/ventilationLayerConf'

const getListedLayerGroupIndex = (layerGroupId: string) =>
  listedLayerGroups.findIndex((layerGroup) => layerGroup.id === layerGroupId)

describe('Energiakartta listed layer groups', () => {
  it('shows the building filter accordion in background overlays while drawing as a data layer', () => {
    expect(
      isListedLayerAccordionItem(listedBackgroundBuildingFiltersAccordion)
    ).toBe(true)
    expect(
      getListedLayerMenuOrderLevel(listedBackgroundBuildingFiltersAccordion)
    ).toBe(LayerOrderLevel.BACKGROUND_OVERLAY)
    expect(
      isLayerBackedListedLayerItem(listedBackgroundBuildingFiltersAccordion)
    ).toBe(true)

    if (
      isLayerBackedListedLayerItem(listedBackgroundBuildingFiltersAccordion)
    ) {
      expect(
        listedBackgroundBuildingFiltersAccordion.addOptions.layerOrderOptions
          .layerOrderLevel
      ).toBe(LayerOrderLevel.LAYER)
      expect(listedBackgroundBuildingFiltersAccordion.addOptions.isHidden).toBe(
        false
      )
    }
  })

  it('keeps cadastral layers in the background overlay order level', () => {
    expect(
      listedMmlKiinteistojaotusLayerGroup.addOptions.layerOrderOptions
        ?.layerOrderLevel
    ).toBe(LayerOrderLevel.BACKGROUND_OVERLAY)
    expect(
      listedMmlKiinteistotunnuksetLayerGroup.addOptions.layerOrderOptions
        ?.layerOrderLevel
    ).toBe(LayerOrderLevel.BACKGROUND_OVERLAY)
  })

  it('keeps only main Energiakartta layer views in the exclusivity set', () => {
    expect(ENERGYMAP_MAIN_LAYER_GROUP_IDS).toEqual([
      ENERGYMAP_ENERGY_CERTIFICATE_LAYER_GROUP_ID,
      ENERGYMAP_HEATING_LAYER_GROUP_ID,
      ENERGYMAP_VENTILATION_LAYER_GROUP_ID,
    ])
    expect(ENERGYMAP_MAIN_LAYER_GROUP_IDS).not.toContain(
      ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID
    )
  })

  it('registers only the shared building item for Energiakartta building vector tiles', () => {
    const layerBackedIds = flattenLayerBackedListedLayerItems(
      listedLayerGroups
    ).map((item) => item.id)

    expect(layerBackedIds).toContain(ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID)
    expect(layerBackedIds).not.toContain(
      ENERGYMAP_ENERGY_CERTIFICATE_LAYER_GROUP_ID
    )
    expect(layerBackedIds).not.toContain(ENERGYMAP_HEATING_LAYER_GROUP_ID)
    expect(layerBackedIds).not.toContain(ENERGYMAP_VENTILATION_LAYER_GROUP_ID)
  })

  it('keeps cadastral rows below and outside the building filter accordion', () => {
    const buildingFiltersIndex = getListedLayerGroupIndex(
      listedBackgroundBuildingFiltersAccordion.id
    )
    const cadastralBoundariesIndex = getListedLayerGroupIndex(
      listedMmlKiinteistojaotusLayerGroup.id
    )
    const propertyIdentifiersIndex = getListedLayerGroupIndex(
      listedMmlKiinteistotunnuksetLayerGroup.id
    )

    expect(buildingFiltersIndex).toBeGreaterThanOrEqual(0)
    expect(cadastralBoundariesIndex).toBeGreaterThan(buildingFiltersIndex)
    expect(propertyIdentifiersIndex).toBeGreaterThan(buildingFiltersIndex)
  })
})
