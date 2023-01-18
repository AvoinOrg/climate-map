import { Style as MbStyle, AnyLayer } from 'mapbox-gl'
import { ReactNode } from 'react'
import Feature from 'ol/Feature'
// interface mapFunctions {}

export type Popup = (props: { features: Feature[] }) => ReactNode

export type SourceType = 'geojson' | 'vector' | 'raster' | 'image' | 'video' | 'canvas'

export type LayerOpt = {
  id: string
  source: string
  name: string
  layerType: LayerType
  selectable: boolean
  multiSelectable: boolean
  popup: Popup | false
  useMb: boolean
}

export type LayerOpts = {
  [key: string]: LayerOpt
}

export type LayerId =
  | 'building_energy_certs'
  | 'no2'
  | 'snow_cover_loss'
  | 'fi_buildings'
  | 'helsinki_buildings'
  | 'hsy_solarpotential'
  | 'fi_bogs'
  | 'cifor_peatdepth'
  | 'cifor_wetlands'
  | 'metsaan_ete_basic'
  | 'metsaan_ete_important'
  | 'zonation'
  | 'natura2000'
  | 'hansen'
  | 'fi_mature_forests'
  | 'mangrove_forests'
  | 'gfw_tree_plantations'
  | 'fi_forests'

export type ExtendedAnyLayer = AnyLayer & {
  source: string
  selectable?: boolean // whether a feature can be highlighted
  multiSelectable?: boolean // whether multiple features can be highlighted
}

export type ExtendedMbStyle = MbStyle & {
  layers: ExtendedAnyLayer[]
}

export type LayerConf = {
  id: LayerId
  style: () => Promise<ExtendedMbStyle>
  popup?: Popup
  useMb?: boolean
}

// For checking if layer name adheres to LayerType, in runtime
export const layerTypes: readonly string[] = ['fill', 'highlighted', 'outline', 'raster']

export type LayerType = typeof layerTypes[number] | 'invalid'
