export interface PlanConf extends NewPlanConf {
  id: string
  created: number
  isCalculating: boolean
  reportData: undefined | GeoJSON.FeatureCollection
}

export type NewPlanConf = {
  name: string
  areaHa: number
  json: any
  isCalculating?: boolean
  reportData?: GeoJSON.FeatureCollection
  fileSettings: {
    fileType: FileType
    zoningColumn: string
    tableName?: string
    crs?: string
  }
}

export type FileType = 'shp' | 'geojson' | 'gpkg'
