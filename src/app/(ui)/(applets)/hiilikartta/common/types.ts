export interface PlanConf extends NewPlanConf {
  id: string
  created: number
  isCalculating: boolean
  reports: {
    [key: string]: any
  }
}

export type NewPlanConf = {
  name: string
  areaHa: number
  json: any
  isCalculating?: boolean
  fileSettings: {
    fileType: FileType
    zoningColumn: string
    tableName?: string
    crs?: string
  }
}

export type FileType = 'shp' | 'geojson' | 'gpkg'
