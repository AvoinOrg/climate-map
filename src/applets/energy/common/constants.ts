import { LayerOrderLevel, ListedLayerMenuItem } from '#/common/types/map'
import BackgroundBuildingFiltersAccordionContent from 'applets/energy/components/BackgroundBuildingFiltersAccordionContent'
import energymapBuildingPolygonsLayerConf from 'applets/energy/layers/buildingPolygonsLayerConf'
import {
  ENERGYMAP_ENERGY_CERTIFICATE_LAYER_GROUP_ID,
} from 'applets/energy/layers/energyCertificateLayerConf'
import {
  ENERGYMAP_HEATING_LAYER_GROUP_ID,
} from 'applets/energy/layers/heatingLayerConf'
import {
  ENERGYMAP_VENTILATION_LAYER_GROUP_ID,
} from 'applets/energy/layers/ventilationLayerConf'
import {
  listedMmlKiinteistojaotusLayerGroup,
  listedMmlKiinteistotunnuksetLayerGroup,
  listedMmlMaastokarttaLayerGroup,
  listedMmlOrtokuvaLayerGroup,
  listedMmlSelkokarttaLayerGroup,
  listedMmlTaustakarttaLayerGroup,
  listedOsmBackgroundLayerGroup,
} from '#/components/Map/layers/defaultListedLayerGroups'

export const ENERGYMAP_MAIN_LAYER_GROUP_IDS = [
  ENERGYMAP_ENERGY_CERTIFICATE_LAYER_GROUP_ID,
  ENERGYMAP_HEATING_LAYER_GROUP_ID,
  ENERGYMAP_VENTILATION_LAYER_GROUP_ID,
] as const

export const listedBackgroundBuildingFiltersAccordion: ListedLayerMenuItem = {
  id: energymapBuildingPolygonsLayerConf.id,
  type: 'accordion',
  menuOrderLevel: LayerOrderLevel.BACKGROUND_OVERLAY,
  addOptions: {
    layerConf: energymapBuildingPolygonsLayerConf,
    layerOrderOptions: {
      layerOrderLevel: LayerOrderLevel.LAYER,
    },
    isHidden: false,
  },
  translationNs: 'energiakartta',
  titleTranslationKey: 'sidebar.background_filters.accordion.title',
  ariaLabelTranslationKey: 'sidebar.background_filters.accordion.aria_label',
  backgroundImageSrc:
    '/files/img/energiakartta/sidebar/main-hero-header-crop.jpg',
  defaultExpanded: true,
  ContentComponent: BackgroundBuildingFiltersAccordionContent,
}

export const listedLayerGroups: ListedLayerMenuItem[] = [
  {
    ...listedOsmBackgroundLayerGroup,
    addOptions: {
      ...listedOsmBackgroundLayerGroup.addOptions,
      isHidden: false,
    },
  },
  listedMmlTaustakarttaLayerGroup,
  listedMmlMaastokarttaLayerGroup,
  listedMmlOrtokuvaLayerGroup,
  listedMmlSelkokarttaLayerGroup,
  listedBackgroundBuildingFiltersAccordion,
  listedMmlKiinteistojaotusLayerGroup,
  listedMmlKiinteistotunnuksetLayerGroup,
]
