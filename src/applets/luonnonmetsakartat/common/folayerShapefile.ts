import type { FeatureCollection } from 'geojson'
import type { ColOptions } from 'applets/luonnonmetsakartat/common/types'
import { ensureShpjsBrowserGlobals } from 'applets/luonnonmetsakartat/common/shpjsCompat'

export type ShapefileColumns = Partial<ColOptions> &
  Pick<ColOptions, 'indexingStrategy'>
export type ShapefileValues = {
  colOptions: ColOptions
  rawShapefile: ArrayBuffer
}

export const mergeShapefileCollections = (
  json: FeatureCollection | FeatureCollection[]
): FeatureCollection => ({
  type: 'FeatureCollection',
  features: (Array.isArray(json) ? json : [json]).flatMap(
    (collection) => collection.features
  ),
})

export const getFeatureColumns = (geojson: FeatureCollection): string[] =>
  Object.keys(geojson.features[0]?.properties ?? {})

export const parseFolayerShapefile = async (buffer?: ArrayBuffer) => {
  if (!buffer?.byteLength) throw new Error('Empty shapefile input')
  await ensureShpjsBrowserGlobals()
  const shp = (await import('shpjs')).default
  const geojson = mergeShapefileCollections(await shp(buffer))
  if (!geojson.features.length) throw new Error('Shapefile has no features')
  return geojson
}

export const findBestColumnMatch = ({
  columns,
  candidates,
  allowPartial = false,
}: {
  columns: string[]
  candidates: string[]
  allowPartial?: boolean
}) => {
  for (const candidate of candidates) {
    const found = columns.find((column) => column.toLowerCase() === candidate.toLowerCase())
    if (found) return found
  }
  if (allowPartial) {
    for (const candidate of candidates) {
      const found = columns.find((column) =>
        column.toLowerCase().includes(candidate.toLowerCase())
      )
      if (found) return found
    }
  }
  return undefined
}

const candidates = {
  idCol: ['id', 'fid', 'oid', 'objectid', 'tunnus'],
  nameCol: ['name', 'nimi'],
  municipalityCol: ['municipality', 'kunta'],
  regionCol: ['region', 'maakunta'],
  descriptionCol: ['description', 'desc', 'kuvaus'],
  areaCol: ['ala', 'area', 'pinta'],
}

export const detectShapefileColumns = (
  columns: string[],
  saved?: Partial<ColOptions>
): ShapefileColumns => {
  const result: ShapefileColumns = {
    indexingStrategy: saved?.indexingStrategy ?? 'id',
  }
  for (const field of Object.keys(candidates) as (keyof typeof candidates)[]) {
    const configured = saved?.[field]
    result[field] =
      configured && columns.includes(configured)
        ? configured
        : findBestColumnMatch({
            columns,
            candidates: candidates[field],
            allowPartial: field === 'areaCol',
          })
  }
  return result
}

const invalidCharRegex = /[^a-zA-Z0-9åäöÅÄÖ\s-]/
const encodingErrorRegex = /Ã/
export interface FolayerDataColumnValidation {
  invalidChars: string[]
  encodingErrors: string[]
}

// This is deliberately the existing string policy, not backend value validation.
export const folayerDataValidateColumnValues = (
  geojson: FeatureCollection | undefined,
  colName?: string
): FolayerDataColumnValidation => {
  const invalidChars = new Set<string>()
  const encodingErrors = new Set<string>()
  if (colName) {
    for (const feature of geojson?.features ?? []) {
      const value = feature.properties?.[colName]
      if (typeof value !== 'string') continue
      if (invalidCharRegex.test(value)) invalidChars.add(value)
      if (encodingErrorRegex.test(value)) encodingErrors.add(value)
    }
  }
  return {
    invalidChars: [...invalidChars],
    encodingErrors: [...encodingErrors],
  }
}

export const folayerDataFindDuplicateIds = (
  geojson: FeatureCollection | undefined,
  idCol?: string
): string[] => {
  const counts = new Map<string, number>()
  if (idCol) {
    for (const feature of geojson?.features ?? []) {
      const id = feature.properties?.[idCol]
      if (id == null) continue
      const key = String(id)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts].filter(([, count]) => count > 1).map(([id]) => id)
}

// Compare tuples, not the human-readable label (which can contain the separator).
export const folayerDataFindDuplicateNameMunicipalityPairs = (
  geojson: FeatureCollection | undefined,
  nameCol?: string,
  municipalityCol?: string
): string[] => {
  const pairs = new Map<string, { label: string; count: number }>()
  if (nameCol && municipalityCol) {
    for (const feature of geojson?.features ?? []) {
      const name = feature.properties?.[nameCol]
      const municipality = feature.properties?.[municipalityCol]
      if (!name || !municipality) continue
      const key = JSON.stringify([String(name), String(municipality)])
      const pair = pairs.get(key)
      pairs.set(key, {
        label: `${name} - ${municipality}`,
        count: (pair?.count ?? 0) + 1,
      })
    }
  }
  return [
    ...new Set(
      [...pairs.values()]
        .filter(({ count }) => count > 1)
        .map(({ label }) => label)
    ),
  ]
}

type ValidationResult = {
  colOptions?: ColOptions
  error?: 'columns' | 'id' | 'name_municipality' | 'strings'
  duplicates: string[]
  warnings: string[]
  invalidValues: string[]
}

export const validateShapefile = ({
  geojson,
  selection,
}: {
  geojson?: FeatureCollection
  selection: ShapefileColumns
}): ValidationResult => {
  const result: ValidationResult = {
    duplicates: [],
    warnings: [],
    invalidValues: [],
  }
  const columns = geojson ? getFeatureColumns(geojson) : []
  const hasColumn = (column?: string): column is string =>
    column != null && columns.includes(column)
  const { nameCol, municipalityCol, idCol, indexingStrategy } = selection
  if (
    !geojson?.features.length ||
    !hasColumn(nameCol) ||
    !hasColumn(municipalityCol) ||
    (indexingStrategy === 'id' && !hasColumn(idCol))
  ) {
    return { ...result, error: 'columns' }
  }
  const colOptions: ColOptions = { ...selection, nameCol, municipalityCol }
  for (const field of [
    'idCol',
    'regionCol',
    'descriptionCol',
    'areaCol',
  ] as const) {
    if (!hasColumn(colOptions[field])) colOptions[field] = undefined
  }
  result.colOptions = colOptions
  result.duplicates =
    indexingStrategy === 'id'
      ? folayerDataFindDuplicateIds(geojson, idCol)
      : folayerDataFindDuplicateNameMunicipalityPairs(
          geojson,
          nameCol,
          municipalityCol
        )
  if (result.duplicates.length) return { ...result, error: indexingStrategy }
  const textFields =
    indexingStrategy === 'id'
      ? (['nameCol', 'municipalityCol', 'regionCol'] as const)
      : (['nameCol', 'municipalityCol'] as const)
  for (const field of textFields) {
    const issues = folayerDataValidateColumnValues(geojson, colOptions[field])
    if (issues.invalidChars.length || issues.encodingErrors.length) {
      result.warnings.push(colOptions[field]!)
      result.invalidValues.push(
        ...issues.invalidChars,
        ...issues.encodingErrors
      )
    }
  }
  result.invalidValues = [...new Set(result.invalidValues)]
  if (indexingStrategy === 'name_municipality' && result.warnings.length)
    result.error = 'strings'
  return result
}
