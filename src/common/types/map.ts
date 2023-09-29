import {
  Style as MbStyle,
  AnyLayer,
  MapboxGeoJSONFeature,
  GeoJSONSource,
} from 'mapbox-gl'
import { Feature } from 'geojson'
import { ReactNode } from 'react'

import { Actions as MapStoreActions } from '#/common/store/mapStore'
// interface mapFunctions {}

export type PopupProps = { features: PopupFeature[] }

export type Popup = (props: PopupProps) => ReactNode

export type SourceType =
  | 'geojson'
  | 'vector'
  | 'raster'
  | 'image'
  | 'video'
  | 'canvas'

export type LayerGroupOptions = {
  id: string
  mapContext: MapContext
  isHidden: boolean
  persist: boolean
  layers: LayerOptionsObj
}

export type LayerOptions = {
  id: string
  source: string
  name: string
  layerType: LayerType
  selectable: boolean
  multiSelectable: boolean
  popup: Popup | false
  useMb: boolean
}

export type LayerOptionsObj = {
  [key: string]: LayerOptions
}

export interface LayerGroupDrawOptions {
  idField?: string
  polygonEnabled?: boolean
  editEnabled?: boolean
  featureAddMutator?: (feature: Feature) => Feature
  featureUpdateMutator?: (feature: Feature) => Feature
}

export interface MapDrawOptions extends LayerGroupDrawOptions {
  layerGroupId: string | null
  draw: MapboxDraw | null
  isEnabled: boolean
  originalStyles?: Record<string, any>
}

interface BaseLayerGroupAddOptions {
  mapContext?: MapContext
  layerConf?: SerializableLayerConf | LayerConf
  isAddedBefore?: boolean
  neighboringLayerGroupId?: LayerGroupId | string
  isHidden?: boolean
  persist?: boolean
  drawOptions?: LayerGroupDrawOptions
}

// Compatible with hydration.
export interface SerializableLayerGroupAddOptions
  extends BaseLayerGroupAddOptions {
  layerConf?: SerializableLayerConf
}

// Not compatible with hydration. Includes a possible popup function within layerConf.
// TODO: Make layerConf required. Currently, it is optional because layerConf can be
// imported by mapStore directly, which is not clean.
export interface LayerGroupAddOptions extends BaseLayerGroupAddOptions {
  layerConf?: LayerConf
  persist?: false
}

export interface LayerGroupAddOptionsWithConf extends LayerGroupAddOptions {
  mapContext: MapContext
  layerConf: LayerConf | SerializableLayerConf
}

// TODO: Remove this enforced id names and the list of layerGroupConf imports.
// Make functions submit their own layerGroupConfs.
export type LayerGroupId =
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
  | 'terramonitor'

export type ExtendedAnyLayer = AnyLayer & {
  source: string
  selectable?: boolean // whether a feature can be highlighted
  multiSelectable?: boolean // whether multiple features can be highlighted
}

export type ExtendedMbStyle = MbStyle & {
  layers: ExtendedAnyLayer[]
}

export type ExtendedMbStyleOrFn =
  | ExtendedMbStyle
  | (() => Promise<ExtendedMbStyle>)

// TODO: Rename all these from layerConf to layerGroupConf
type BaseLayerConf = {
  id: string
  style: ExtendedMbStyleOrFn
  useMb?: boolean
}

// SerializableLayerConf is used for hydration.
export interface SerializableLayerConf extends BaseLayerConf {
  style: ExtendedMbStyle
}

export interface LayerConf extends BaseLayerConf {
  popup?: Popup
}

// For checking if layer name adheres to LayerType, in runtime
export const layerTypes: readonly string[] = [
  'fill',
  'highlighted',
  'outline',
  'symbol',
  'raster',
]

export type LayerType = (typeof layerTypes)[number] | 'invalid'

export type OverlayMessage = {
  message: string | null
  layerGroupId: LayerGroupId
}

export type MapLibraryMode = 'hybrid' | 'mapbox'

// Queue priority is used to determine the order in which functions are executed.
// Low priority functions, such as layer styling, might depend on high priority functions.
export enum QueuePriority {
  LOW = 1, // layer styling, other stuff that can wait
  MEDIUM = 2,
  MEDIUM_HIGH = 3, // adding layers
  HIGH = 4, // for hydration and other vital stuff
}

export interface PopupOpts {
  features: Feature[] | MapboxGeoJSONFeature[]
  PopupElement: React.FC<{ features: any }>
}

export type PopupFeature = {
  properties: any
}

export interface ILayerOption {
  serverId: string
  minzoom: number
  maxzoom?: number
  layerMinzoom?: number | null
  layerMaxzoom?: number | null
}

export type QueueOptions = {
  skipQueue?: boolean
  priority?: QueuePriority
}

export type QueueFunctionFuncName = keyof MapStoreActions

export type QueueFunction = {
  fn: (...args: any) => Promise<void>
  args: any[]
  priority?: QueuePriority
}

export type FunctionQueue = (QueueFunction & {
  promise: { resolve: any; reject: any }
})[]

export type MapContext = 'main' | 'any' | string | null

export const isGeoJSONSource = (source: any): source is GeoJSONSource => {
  return source != null && 'setData' in source // or other appropriate conditions
}
