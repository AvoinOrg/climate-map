export type PlanConf = {
  id: string
  name: string
  areaHa: number
  json: any
  fileSettings: {
    fileType: FileType
    zoningColumn: string
    tableName?: string
    crs?: string
  }
}

export type FileType = 'shp' | 'geojson' | 'gpkg'
