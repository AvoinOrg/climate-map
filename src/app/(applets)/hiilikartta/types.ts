export type PlanConf = {
  id: string
  name: string
  areaHa: number
  json: any
  fileSettings: {
    fileType: FileType
    tableName?: string
    zoningColumn?: string
    crs?: string
  }
}

export type FileType = 'shp' | 'geojson' | 'gpkg'
