export interface ReportData {
  areas: GeoJSON.FeatureCollection
  totals: GeoJSON.FeatureCollection
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
