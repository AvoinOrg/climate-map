import type { Feature, FeatureCollection } from 'geojson'
import type { ComponentType, ReactNode } from 'react'
import type {
  StyleSpecification,
  LayerSpecification,
  MapGeoJSONFeature,
  GeoJSONSource,
  Map,
  MapLayerEventType,
  MapLayerMouseEvent,
  MapLayerTouchEvent,
  SourceSpecification,
  GeoJSONSourceSpecification,
} from 'maplibre-gl'
import type { TerraDraw } from 'terra-draw'

import type { MapStoreActions } from '#/common/store/mapStore'
import { StoreApi, UseBoundStore } from 'zustand'
// interface mapFunctions {}

export type { ColorStop } from './color'
export type { MapDims } from './mapDims'

export const EMBEDDED_PARAMS_URL_PREFIX = 'mapparams::'

export type PopupProps<P = Record<string, any>> = {
  features: (Omit<MapGeoJSONFeature, 'properties'> & { properties: P })[]
  onClose?: () => void
}

export type Popup = (props: PopupProps & any) => ReactNode

export type SelectionSource = {
  source: string
  sourceLayer?: string
}

export type SourceType = SourceSpecification['type']

export type ListedLayerGroupStyleOptions = {
  defaultOpacity?: number
  showOpacitySlider?: boolean
}

export type ListedLayerGroup = {
  id: string
  // orderLevel: LayerOrderLevel
  addOptions: LayerGroupAddOptionsWithOrderLevel
  nameTranslationKey: string
  translationNs: string
  name?: string
  description?: string
  descriptionTranslationKey?: string
  thumbnail?: string
  infoElement?: ReactNode
  styleOptions?: ListedLayerGroupStyleOptions
}

export type ListedLayerAccordionItem = {
  id: string
  type: 'accordion'
  menuOrderLevel: LayerOrderLevel
  translationNs: string
  titleTranslationKey: string
  title?: string
  ariaLabelTranslationKey?: string
  ariaLabel?: string
  backgroundImageSrc?: string
  defaultExpanded?: boolean
  addOptions?: LayerGroupAddOptionsWithOrderLevel
  content?: ReactNode
  ContentComponent?: ComponentType
  items?: ListedLayerMenuItem[]
}

export type ListedLayerMenuItem = ListedLayerGroup | ListedLayerAccordionItem

export type ListedLayerBackedMenuItem =
  | ListedLayerGroup
  | (ListedLayerAccordionItem & {
      addOptions: LayerGroupAddOptionsWithOrderLevel
    })

export type LayerGroupOptions = {
  id: string
  isProcessing: boolean
  mapContext: MapContext
  isHidden: boolean
  persist: boolean
  layers: LayerOptionsObj
  orderLevel: LayerOrderLevel
  sources: SourceOptionsObj
  eventHandlers: LayerEventHandlerOptions[]
  handleDataUpdate?: (e: any) => void
}

export type LayerEventHandlers = Record<
  keyof MapLayerEventType,
  (e: any) => void
>

export type LayerOptions = {
  id: string
  source?: string
  sourceLayer?: string
  name: string
  layerType: LayerType
  activeOn: ActiveOnOption
  selectable: boolean
  multiSelectable: boolean
  hoverPointer: boolean
  popupOpts: PopupOpts | null
}

export type LayerOptionsObj = {
  [key: string]: LayerOptions
}

export type DataSearchOpts = {
  name: string
  fields: string[]
  appendDatasetName?: boolean
  displayPattern?: (feature: any, fields?: string[]) => string[]
  getCoordinates?: (feature: Feature) => [number, number] | null
}

type BaseSourceExtendedOpts = {
  selectable?: boolean
  multiSelectable?: boolean
}

type StoreSourceExtendedOpts = BaseSourceExtendedOpts & {
  selectable?: boolean
  multiSelectable?: boolean
  storeData: {
    sync: {
      store: UseBoundStore<StoreApi<any>>
      selector: (state: any) => FeatureCollection | null
    }
    // query?: () => Promise<FeatureCollection | null>
  }
  dataSearchOpts?: DataSearchOpts
}

type GeoJSONSourceExtendedOpts = BaseSourceExtendedOpts & {
  useAccessToken?: boolean
  ensureLocalData?: boolean
  dataSearchOpts?: DataSearchOpts
}

type DataSourceExtendedOpts = BaseSourceExtendedOpts & {
  useAccessToken?: boolean
  ensureLocalData?: boolean
}

type BaseSourceOptions = {
  id: string
  popupOpts: PopupOpts | null
  layerIds: string[]
}

type StandardSourceOptions = BaseSourceOptions & {
  url?: string
  tiles?: string[]
  type?: SourceType
  extendedOpts?: DataSourceExtendedOpts
}

type StoreSourceOptions = BaseSourceOptions & {
  type: 'store'
  extendedOpts?: StoreSourceExtendedOpts
}

type GeoJSONSourceOptions = BaseSourceOptions & {
  type: 'geojson'
  url?: string
  extendedOpts?: GeoJSONSourceExtendedOpts
}

export type SourceOptions =
  | StandardSourceOptions
  | StoreSourceOptions
  | GeoJSONSourceOptions

export type SourceOptionsObj = {
  [key: string]: SourceOptions
}

export const isStandardSourceOptions = (
  opts: SourceOptions
): opts is StandardSourceOptions => {
  return opts.type !== 'store'
}

export type LayerGroups = Record<string, LayerGroupOptions>

export interface LayerGroupDrawOptions {
  polygonEnabled?: boolean
  editEnabled?: boolean
  deleteOptions?: {
    enabled: boolean
    deleteOutsideDrawMode?: boolean
  }
  corridorEnabled?: boolean
  corridorHalfWidthMeters?: number
  featureAddMutator?: (feature: Feature) => Feature
  featureUpdateMutator?: (feature: Feature) => Feature
}

export interface MapDrawOptions extends LayerGroupDrawOptions {
  layerGroupId: string | null
  isEnabled: boolean
  currentMode?: DrawMode | null
  originalStyles?: Record<string, any>
  handleDrawFinish?: (...args: any[]) => Promise<void>
  handleDrawUpdate?: (...args: any[]) => void
  handleSelectionChange?: (...args: any[]) => void
  handleDeselectionChange?: (...args: any[]) => void
  handleModeChange?: (...args: any[]) => void
  corridorHalfWidthMeters?: number
  drawGeneration: number
}

export enum LayerOrderLevel {
  BACKGROUND = 'background',
  BACKGROUND_OVERLAY = 'background-overlay',
  LAYER = 'layer',
  OVERLAY = 'overlay',
}

export type LayerOrderOptions = {
  layerOrderLevel: LayerOrderLevel
  disableOthersInGroup?: boolean // If true, disables all other layers in the group.
  isAddedUnder?: boolean // If true, the layer is added under (before) the neighboringLayerGroupId / first layer of the level.
  neighboringLayerGroupId?: string // The id of the layer group to add the layer under or over.
}

interface BaseLayerGroupAddOptions {
  mapContext?: MapContext
  layerConf?: SerializableLayerConf | LayerConf
  layerOrderOptions?: LayerOrderOptions
  isHidden?: boolean
  persist?: boolean
  drawOptions?: LayerGroupDrawOptions
  zoomToExtent?: boolean
}

export type DataUpdateMutator = (data: FeatureCollection) => Promise<void>

// Compatible with hydration.
export interface SerializableLayerGroupAddOptions extends BaseLayerGroupAddOptions {
  layerConf?: SerializableLayerConf
  dataUpdateMutator?: DataUpdateMutator
}

// Not compatible with hydration. Includes a possible popup function within layerConf.
// TODO: Make layerConf required. Currently, it is optional because layerConf can be
// imported by mapStore directly, which is not clean.
export interface LayerGroupAddOptions extends BaseLayerGroupAddOptions {
  layerConf?: LayerConf
  persist?: false
  // Recheck ownership when queued work starts and after resolving its style.
  isCurrent?: () => boolean
}

export interface LayerGroupAddOptionsWithOrderLevel extends BaseLayerGroupAddOptions {
  layerOrderOptions: LayerOrderOptions
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
  | 'mml_taustakartta'

export type ActiveOnOption =
  | 'always'
  | 'hover'
  | 'selected'
  | 'hover-or-selected'

// export type ExtendedLayerSpecification = LayerSpecification & {
//   source: string
//   'source-layer': string
//   activeOn?: ActiveOnOption
//   selectable?: boolean // whether a feature can be highlighted
//   multiSelectable?: boolean // whether multiple features can be highlighted
//   hoverPointer?: boolean // whether the pointer should change to a pointer when hovering over the layer
// }

export type CanvasFillImageId =
  | 'DiagonalCross'
  | 'Cross'
  | 'ForwardDiagonal'
  | 'BackwardDiagonal'
  | 'Vertical'
  | 'Horizontal'

export type GeneratedFillPatternOptions = {
  patternId: CanvasFillImageId
  colorRGBA?: string
  backgroundColorRGBA?: string
}

type LayerExtras = {
  source?: string
  'source-layer'?: string
  activeOn?: ActiveOnOption
  generatedFillPatternOptions?: GeneratedFillPatternOptions
  selectable?: boolean
  multiSelectable?: boolean
  hoverPointer?: boolean
}

type ExtendEachLayerSpec<T> = T extends any ? T & LayerExtras : never

export type ExtendedLayerSpecification = ExtendEachLayerSpec<LayerSpecification>

export type StoreSourceSpecification = Omit<
  GeoJSONSourceSpecification,
  'data' | 'type'
> & {
  type: 'store'
  extendedOpts: StoreSourceExtendedOpts
}

export type StandardSourceSpecification = SourceSpecification & {
  extendedOpts?: DataSourceExtendedOpts
}

export type CustomGeoJSONSourceSpecification = Omit<
  GeoJSONSourceSpecification,
  'data' | 'type'
> & {
  type: 'geojson'
  extendedOpts?: GeoJSONSourceExtendedOpts
}

export type ExtendedSourceSpecification =
  | StandardSourceSpecification
  | StoreSourceSpecification
  | CustomGeoJSONSourceSpecification

export type ExtendedStyleSpecification = Omit<
  StyleSpecification,
  'sources' | 'layers'
> & {
  sources: Record<string, ExtendedSourceSpecification>
  layers: ExtendedLayerSpecification[]
}

export type ExtendedStyleSpecificationOrFn =
  | ExtendedStyleSpecification
  | (() => Promise<ExtendedStyleSpecification>)

export type LayerEventHandlerOptions = {
  eventType: keyof MapLayerEventType
  layers: string[]
  handler: (e: MapLayerMouseEvent | MapLayerTouchEvent) => void
}

export type LayerEventHandlerAddOptions = {
  eventType: keyof MapLayerEventType
  layers: string[]
  handlerCreator: (
    map: Map
  ) => (e: MapLayerMouseEvent | MapLayerTouchEvent) => void
}
// TODO: Rename all these from layerConf to layerGroupConf
type BaseLayerConf = {
  id: string
  style: ExtendedStyleSpecificationOrFn
  signatureColor?: string
  eventHandlers?: LayerEventHandlerAddOptions[]
  joinedSelectionSources?: SelectionSource[][]
}

// SerializableLayerConf is used for hydration.
export interface SerializableLayerConf extends BaseLayerConf {
  style: ExtendedStyleSpecification
}

export interface LayerConf extends BaseLayerConf {
  popupOpts?: PopupOpts
}

export interface EventHandlerInitializer {
  eventType: keyof MapLayerEventType
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

// Queue priority is used to determine the order in which functions are executed.
// Low priority functions, such as layer styling, might depend on high priority functions.
export enum QueuePriority {
  LOW = 1, // layer styling, other stuff that can wait
  MEDIUM = 2,
  MEDIUM_HIGH = 3, // adding layers
  HIGH = 4, // for hydration and other vital stuff
}

export type PopupType = 'tooltip' | 'sidebar' | 'modal' | 'unique'

export interface PopupData {
  features: MapGeoJSONFeature[]
  component: Popup
  source: string
  type: PopupType
  componentProps?: Record<string, any>
  sourceLayer?: string
  multiPoppable?: boolean
}

export interface PopupOpts {
  component: Popup
  source: string
  type: PopupType
  componentProps?: Record<string, any>
  sourceLayer?: string
  multiPoppable?: boolean
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
  key?: string // a key to identify duplicates
  skipQueue?: boolean
  priority?: QueuePriority
  allowDuplicates?: boolean // If true, the function can be added to the queue multiple times. Checked by deep comparison of the function and arguments.
}

export type QueueOptionsEnforceKey = {
  key: string // a key to identify duplicates
  skipQueue?: boolean
  priority?: QueuePriority
  allowDuplicates?: boolean // If true, the function can be added to the queue multiple times. Checked by deep comparison of the function and arguments.
}

export type QueueFunctionFuncName = keyof MapStoreActions

export type QueueFunction = {
  fn: (...args: any) => Promise<void>
  args: any[]
  key: string // If provided, two functions with the same uniqueKey will not run concurrently
  priority?: QueuePriority
  allowDuplicates?: boolean // If true, the function can be added to the queue multiple times. Checked by deep comparison of the function and arguments.
}

export type FunctionQueue = (QueueFunction & {
  promise: { resolve: any; reject: any }
})[]

export type MapContext = 'main' | 'any' | string | null

export const isGeoJSONSource = (source: any): source is GeoJSONSource => {
  return source != null && 'setData' in source // or other appropriate conditions
}

export type DrawMode = 'polygon' | 'edit' | 'corridor'

export type ExtendedMaplibreDrawMode = 'polygon' | 'select' | 'corridor'

export type FitBoundsOptions = {
  duration?: number
  lonExtra?: number
  latExtra?: number
}

export type AutoRelocateOptions = {
  checkIfAutoRelocate?: boolean
  disableAutoRelocate?: boolean
}

export type ImageOptions = {
  id: string
  layerGroupId: string
  colorCode?: string
  size?: number
}

export type ExtendedMapGeoJSONFeature = MapGeoJSONFeature & {
  isAdditional?: boolean
  isPlaceholder?: boolean
}

export type SearchableDataOpts = DataSearchOpts & {
  layerGroupId: string
  data: FeatureCollection
  enabled: boolean
}
