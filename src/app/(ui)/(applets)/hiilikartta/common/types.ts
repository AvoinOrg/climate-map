import { Geometry } from 'geojson'

export interface ReportData {
  areas: CalcFeatureCollection
  totals: CalcFeatureCollection
  metadata: any
}

export interface PlanConf extends NewPlanConf {
  id: string
  created: number
  isCalculating: boolean
  reportData: undefined | ReportData
}

export type NewPlanConf = {
  name: string
  areaHa: number
  json: any
  isCalculating?: boolean
  reportData?: ReportData
  fileSettings: {
    fileType: FileType
    zoningColumn: string
    tableName?: string
    crs?: string
  }
}

export type FileType = 'shp' | 'geojson' | 'gpkg'

export type CalcFeatureYearValues = {
  now: number
  '2035': number
  '2045': number
  '2055': number
}

export const featureCols = [
  'bio_carbon_sum',
  'ground_carbon_sum',
  'bio_carbon_per_area',
  'ground_carbon_per_area',
] as const

export type CarbonData = {
  nochange: CalcFeatureYearValues
  planned: CalcFeatureYearValues
}

export type CalcFeatureProperties = {
  [K in (typeof featureCols)[number]]: CarbonData
}

export type CalcFeature = {
  id: string
  type: 'Feature'
  properties: CalcFeatureProperties
  geometry: Geometry
}

export type CalcFeatureCollection = {
  type: 'FeatureCollection'
  features: CalcFeature[]
}
