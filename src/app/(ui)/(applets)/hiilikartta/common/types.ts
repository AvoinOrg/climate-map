import { FetchStatus } from '#/common/types/general'
import { FeatureCollection, Geometry } from 'geojson'

export interface ReportData {
  areas: CalcFeatureCollection
  totals: CalcFeatureCollection
  metadata: {
    timestamp: number
    featureYears: string[]
  }
  agg: { totals: FeatureCalcs }
}

export interface PlanConf extends NewPlanConf {
  id: string
  serverId: string
  created: number
  calculationState: CalculationState
  reportData: undefined | ReportData
  // A lot of the following are conditional only to support older versions of the app without these variables
  state?: PlanConfState
  cloudLastSaved?: number
  localLastEdited?: number
  localLastSaved?: number
  userId?: string
  areSettingsValid?: boolean
  isHidden?: boolean
}

export interface ExternalPlanConf {
  serverId: string
  status: FetchStatus
  name?: string
  reportData?: ReportData
}

export interface PlaceholderPlanConf {
  id: string
  serverId: string
  name: string
  cloudLastSaved: number
  userId: string
  status?: FetchStatus
}

export type PlanData<G extends Geometry | null = Geometry> = FeatureCollection<
  G,
  FeatureProperties
>

export type PlanDataFeature = PlanData['features'][number]

export type PlanConfWithReportData = {
  serverId: string
  name: string
  reportData: ReportData
}

export enum CalculationState {
  NOT_STARTED = 'not-started',
  INITIALIZING = 'initializing',
  CALCULATING = 'calculating',
  ERRORED = 'errored',
  FINISHED = 'finished',
}

export enum PlanConfState {
  SAVING = 'saving',
  IDLE = 'idle',
  DELETING = 'deleting',
  FETCHING = 'fetching',
}

export type NewPlanConf = {
  name: string
  areaHa: number
  data: PlanData
  calculationState?: CalculationState
  reportData?: ReportData
}

export type FileType = 'shp' | 'geojson' | 'gpkg'

export const ZONING_CODE_COL = 'zoning_code'
export interface FeatureProperties {
  id: string
  name: string | number
  area_ha: number
  zoning_code: string | null
  old_zoning_code?: string
  old_id?: string | number
}

export const featureCols = [
  'bio_carbon_total',
  'ground_carbon_total',
  'bio_carbon_ha',
  'ground_carbon_ha',
] as const

export type CalcFeatureYearValues = {
  [key: string]: number
}

export type CarbonData = {
  nochange: CalcFeatureYearValues
  planned: CalcFeatureYearValues
}

export type CalcFeatureProperties = {
  [K in (typeof featureCols)[number]]: CarbonData
} & {
  id: string
  area: number
  [ZONING_CODE_COL]: string
}

export type CalcFeature = {
  id: string
  type: 'Feature'
  properties: CalcFeatureProperties
  geometry: { coordinates: [number, number][][]; type: 'Polygon' }
}

export type CalcFeatureCollection = {
  type: 'FeatureCollection'
  features: CalcFeature[]
}

// A helper type for extra calculations based on the carbon data
export type FeatureCalcs = {
  [K in `${(typeof featureCols)[number]}_diff`]: CalcFeatureYearValues
}

export type CarbonChangeColorItem = {
  color: string
  min: number
  max: number
}

export type GraphCalcType = 'ground' | 'bio' | 'total'

export interface MapGraphCalcFeature extends CalcFeature {
  properties: CalcFeatureProperties & {
    color: string
    valueHa: number
    valueTotal: number
    colorNochange: string
    valueHaNochange: number
    valueTotalNochange: number
    isHidden?: boolean
  }
}
export interface MapGraphCalcFeatureCollection extends CalcFeatureCollection {
  type: 'FeatureCollection'
  features: MapGraphCalcFeature[]
}

export type MapGraphData = {
  id: string
  name: string
  data: MapGraphCalcFeatureCollection
  isCurrent?: boolean
}

export type MapGraphDataSelectOption = {
  id: string
  isCurrent: boolean
}

export type UnitType = 'ha' | 'total'
