import {
  MOCK_AUTH_ACCESS_TOKEN,
  MOCK_AUTH_REJECTED_ACCESS_TOKEN,
} from '#/common/auth/mock'
import type {
  Feature,
  FeatureCollection,
  Geometry,
  Point,
  Position,
} from 'geojson'
import type {
  ColOptions,
  IndexingStrategy,
} from 'applets/luonnonmetsakartat/common/types'
import {
  attachLuonnonmetsakartatMockLayerAreaPictures,
  createLuonnonmetsakartatMockLayer,
  deleteLuonnonmetsakartatMockLayer,
  getLuonnonmetsakartatMockLayer,
  getLuonnonmetsakartatMockLayerAreas,
  getLuonnonmetsakartatMockLayers,
  updateLuonnonmetsakartatMockLayer,
  updateLuonnonmetsakartatMockLayerArea,
} from './mockDataStore'

type LuonnonmetsakartatMockApiEnv = Record<string, string | undefined> & {
  LUONNONMETSAKARTAT_MOCK_API_ENABLED?: string
  NODE_ENV?: string
}

type MockAuthStatus = 'missing' | 'verified' | 'rejected' | 'unknown'
type ParseResult<T> =
  | {
      value: T
    }
  | {
      error: Response
    }
type MockPictureAttachment = Parameters<
  typeof attachLuonnonmetsakartatMockLayerAreaPictures
>[0]['attachments'][number]

const ROUTE_PREFIX = '/api/luonnonmetsakartat'
const MOCK_API_ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])
const TRUE_FORM_VALUES = new Set(['1', 'true', 'yes', 'on'])
const FALSE_FORM_VALUES = new Set(['0', 'false', 'no', 'off'])
const MOCK_GEOSERVER_WORKSPACE = 'mock'
const MOCK_VECTOR_TILE_CONTENT_TYPE = 'application/vnd.mapbox-vector-tile'
const COL_OPTION_FORM_FIELDS = [
  'indexing_strategy',
  'name_col',
  'municipality_col',
  'region_col',
  'description_col',
  'area_col',
  'id_col',
]

const normalizeFlag = (value: string | undefined) =>
  value?.trim().toLowerCase() ?? ''

const getDefaultMockApiEnv = (): LuonnonmetsakartatMockApiEnv => ({
  LUONNONMETSAKARTAT_MOCK_API_ENABLED:
    process.env.LUONNONMETSAKARTAT_MOCK_API_ENABLED,
  NODE_ENV: process.env.NODE_ENV,
})

const isTruthyMockApiFlag = (value: string | undefined) =>
  MOCK_API_ENABLED_VALUES.has(normalizeFlag(value))

export const assertLuonnonmetsakartatMockApiAllowed = (
  env: LuonnonmetsakartatMockApiEnv = getDefaultMockApiEnv()
) => {
  if (
    isTruthyMockApiFlag(env.LUONNONMETSAKARTAT_MOCK_API_ENABLED) &&
    env.NODE_ENV === 'production'
  ) {
    throw new Error(
      'Luonnonmetsakartat mock API cannot be enabled when NODE_ENV=production. Unset LUONNONMETSAKARTAT_MOCK_API_ENABLED.'
    )
  }
}

export const isLuonnonmetsakartatMockApiEnabled = (
  env: LuonnonmetsakartatMockApiEnv = getDefaultMockApiEnv()
) => {
  assertLuonnonmetsakartatMockApiAllowed(env)

  return isTruthyMockApiFlag(env.LUONNONMETSAKARTAT_MOCK_API_ENABLED)
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })

const jsonErrorResponse = (error: string, status: number) =>
  jsonResponse({ error }, status)

const emptyMockVectorTileResponse = (method: string) =>
  new Response(method === 'HEAD' ? null : new Uint8Array(), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-length': '0',
      'content-type': MOCK_VECTOR_TILE_CONTENT_TYPE,
    },
  })

const getMockPath = (request: Request) => {
  const requestUrl = new URL(request.url)
  const normalizedPrefix = ROUTE_PREFIX.replace(/\/+$/, '')

  if (
    requestUrl.pathname !== normalizedPrefix &&
    !requestUrl.pathname.startsWith(`${normalizedPrefix}/`)
  ) {
    return null
  }

  return requestUrl.pathname.slice(normalizedPrefix.length) || '/'
}

const getBearerToken = (request: Request) => {
  const authHeader = request.headers.get('authorization')
  const match = authHeader?.match(/^Bearer\s+(.+)$/i)

  return match?.[1]?.trim() || null
}

const getMockAuthStatus = (request: Request): MockAuthStatus => {
  const token = getBearerToken(request)

  if (!token) {
    return request.headers.has('authorization') ? 'unknown' : 'missing'
  }

  if (token === MOCK_AUTH_ACCESS_TOKEN) {
    return 'verified'
  }

  if (token === MOCK_AUTH_REJECTED_ACCESS_TOKEN) {
    return 'rejected'
  }

  return 'unknown'
}

const getAdminAuthErrorResponse = (authStatus: MockAuthStatus) => {
  if (authStatus === 'rejected') {
    return jsonResponse(
      {
        error: 'Mock admin access rejected',
        is_editor: false,
        is_admin: false,
      },
      403
    )
  }

  return jsonResponse(
    {
      error: 'Mock admin authorization required',
      is_editor: false,
      is_admin: false,
    },
    401
  )
}

const getLayerIdWithoutHyphens = (layerId: string) => layerId.replace(/-/g, '')

const getFolayerSourceLayer = (layerId: string) =>
  `forest_areas_${getLayerIdWithoutHyphens(layerId)}`

const getFolayerCentroidSourceLayer = (layerId: string) =>
  `${getFolayerSourceLayer(layerId)}_centroid`

const getCaseInsensitiveSearchParam = (
  params: URLSearchParams,
  key: string
) => {
  const normalizedKey = key.toLowerCase()

  for (const [paramKey, value] of params.entries()) {
    if (paramKey.toLowerCase() === normalizedKey) {
      return value
    }
  }

  return null
}

const resolveLayerFromCentroidTypeName = ({
  typeName,
  workspace,
}: {
  typeName: string
  workspace: string
}) => {
  const typeNameMatch = typeName.match(
    /^([^:]+):forest_areas_([A-Za-z0-9]+)_centroid$/
  )

  if (!typeNameMatch || typeNameMatch[1] !== workspace) {
    return null
  }

  const layerToken = typeNameMatch[2]

  return (
    getLuonnonmetsakartatMockLayers().find(
      (layer) => getLayerIdWithoutHyphens(layer.id) === layerToken
    ) ?? null
  )
}

const isValidPosition = (
  position: Position | undefined
): position is [number, number] =>
  position != null &&
  Number.isFinite(position[0]) &&
  Number.isFinite(position[1])

const isClosingPosition = (
  first: Position | undefined,
  last: Position | undefined
) =>
  isValidPosition(first) &&
  isValidPosition(last) &&
  first[0] === last[0] &&
  first[1] === last[1]

const getRingPositions = (ring: Position[]) =>
  ring.length > 1 && isClosingPosition(ring[0], ring[ring.length - 1])
    ? ring.slice(0, -1)
    : ring

const getGeometryPositions = (geometry: Geometry): Position[] => {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates]
    case 'MultiPoint':
    case 'LineString':
      return geometry.coordinates
    case 'MultiLineString':
      return geometry.coordinates.flat()
    case 'Polygon':
      return geometry.coordinates.flatMap(getRingPositions)
    case 'MultiPolygon':
      return geometry.coordinates.flatMap((polygon) =>
        polygon.flatMap(getRingPositions)
      )
    case 'GeometryCollection':
      return geometry.geometries.flatMap(getGeometryPositions)
  }
}

const getCentroidPointGeometry = (geometry: Geometry): Point => {
  const positions = getGeometryPositions(geometry).filter(isValidPosition)

  if (positions.length === 0) {
    return {
      type: 'Point',
      coordinates: [0, 0],
    }
  }

  const [sumX, sumY] = positions.reduce(
    ([accX, accY], [x, y]) => [accX + x, accY + y],
    [0, 0]
  )

  return {
    type: 'Point',
    coordinates: [sumX / positions.length, sumY / positions.length],
  }
}

const getWfsFeatureCollection = (
  layerId: string
): FeatureCollection<Point> | null => {
  const areaCollection = getLuonnonmetsakartatMockLayerAreas(layerId)

  if (!areaCollection) {
    return null
  }

  return {
    type: 'FeatureCollection',
    features: areaCollection.features.map((feature): Feature<Point> => {
      const properties = { ...feature.properties }
      const featureId = properties.id || feature.id

      return {
        id: featureId,
        type: 'Feature',
        geometry: getCentroidPointGeometry(feature.geometry),
        properties,
      }
    }),
  }
}

const handleMockWfsRequest = ({
  authStatus,
  method,
  request,
  workspace,
}: {
  authStatus: MockAuthStatus
  method: string
  request: Request
  workspace: string
}) => {
  if (method !== 'GET') {
    return jsonErrorResponse('Method not allowed', 405)
  }

  if (workspace !== MOCK_GEOSERVER_WORKSPACE) {
    return jsonErrorResponse('Unsupported mock GeoServer workspace', 404)
  }

  const requestUrl = new URL(request.url)
  const requestedOperation = getCaseInsensitiveSearchParam(
    requestUrl.searchParams,
    'request'
  )

  if (requestedOperation?.toLowerCase() !== 'getfeature') {
    return jsonErrorResponse('Unsupported mock WFS request', 400)
  }

  const typeName =
    getCaseInsensitiveSearchParam(requestUrl.searchParams, 'typeName') ??
    getCaseInsensitiveSearchParam(requestUrl.searchParams, 'typeNames')

  if (!typeName) {
    return jsonErrorResponse('Missing mock WFS typeName', 400)
  }

  const layer = resolveLayerFromCentroidTypeName({ typeName, workspace })

  if (!layer || (authStatus === 'missing' && layer.is_hidden)) {
    return jsonErrorResponse('Mock WFS layer not found', 404)
  }

  if (authStatus !== 'missing' && authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  const featureCollection = getWfsFeatureCollection(layer.id)

  if (!featureCollection) {
    return jsonErrorResponse('Mock WFS layer not found', 404)
  }

  return jsonResponse(featureCollection)
}

const isMockVectorTileLayerSpec = (layerSpec: string) => {
  const [qualifiedLayer, gridSet, format] = layerSpec.split('@')

  if (gridSet !== 'EPSG:900913' || format !== 'pbf') {
    return false
  }

  const layerMatch = qualifiedLayer.match(/^mock:forest_areas_[A-Za-z0-9]+$/)

  return layerMatch !== null
}

const handleMockTmsRequest = ({
  method,
  mockPath,
}: {
  method: string
  mockPath: string
}) => {
  if (method !== 'GET' && method !== 'HEAD') {
    return jsonErrorResponse('Method not allowed', 405)
  }

  const tmsMatch = mockPath.match(
    /^\/geoserver\/gwc\/service\/tms\/1\.0\.0\/([^/]+)\/\d+\/\d+\/\d+\.pbf$/
  )

  if (!tmsMatch) {
    return jsonErrorResponse('Unsupported mock GeoServer TMS endpoint', 404)
  }

  const layerSpec = decodeURIComponent(tmsMatch[1])

  if (!isMockVectorTileLayerSpec(layerSpec)) {
    return jsonErrorResponse('Unsupported mock GeoServer TMS layer', 404)
  }

  return emptyMockVectorTileResponse(method)
}

const handleMockGeoServerRequest = ({
  authStatus,
  method,
  mockPath,
  request,
}: {
  authStatus: MockAuthStatus
  method: string
  mockPath: string
  request: Request
}) => {
  const wfsMatch = mockPath.match(/^\/geoserver\/([^/]+)\/ows\/?$/)

  if (wfsMatch) {
    return handleMockWfsRequest({
      authStatus,
      method,
      request,
      workspace: decodeURIComponent(wfsMatch[1]),
    })
  }

  if (mockPath.startsWith('/geoserver/gwc/service/tms/')) {
    return handleMockTmsRequest({ method, mockPath })
  }

  return jsonErrorResponse(
    'Unsupported Luonnonmetsakartat mock GeoServer endpoint',
    404
  )
}

const toPublicLayerItem = (
  layer: ReturnType<typeof getLuonnonmetsakartatMockLayers>[number]
) => ({
  id: layer.id,
  name: layer.name,
  description: layer.description,
  created_ts: layer.created_ts,
  updated_ts: layer.updated_ts,
  color_code: layer.color_code,
})

const toAdminLayerItem = (
  layer: ReturnType<typeof getLuonnonmetsakartatMockLayers>[number]
) => ({
  id: layer.id,
  name: layer.name,
  description: layer.description,
  created_ts: layer.created_ts,
  updated_ts: layer.updated_ts,
  color_code: layer.color_code,
  is_hidden: layer.is_hidden,
  col_options: layer.col_options,
})

const isParseError = <T>(
  result: ParseResult<T>
): result is { error: Response } => 'error' in result

const readMockFormData = async (
  request: Request
): Promise<ParseResult<FormData>> => {
  try {
    return { value: await request.formData() }
  } catch {
    return {
      error: jsonErrorResponse('Expected multipart form data', 400),
    }
  }
}

const getOptionalStringField = (
  formData: FormData,
  key: string
): ParseResult<string | undefined> => {
  if (!formData.has(key)) {
    return { value: undefined }
  }

  const value = formData.get(key)

  if (typeof value !== 'string') {
    return {
      error: jsonErrorResponse(`Expected string form field: ${key}`, 400),
    }
  }

  const trimmedValue = value.trim()

  return { value: trimmedValue || undefined }
}

const getRequiredStringField = (
  formData: FormData,
  key: string
): ParseResult<string> => {
  const valueResult = getOptionalStringField(formData, key)

  if (isParseError(valueResult)) {
    return valueResult
  }

  if (valueResult.value === undefined) {
    return {
      error: jsonErrorResponse(`Missing required form field: ${key}`, 400),
    }
  }

  return { value: valueResult.value }
}

const parseBooleanField = ({
  formData,
  key,
  required = false,
}: {
  formData: FormData
  key: string
  required?: boolean
}): ParseResult<boolean | undefined> => {
  const valueResult = getOptionalStringField(formData, key)

  if (isParseError(valueResult)) {
    return valueResult
  }

  if (valueResult.value === undefined) {
    return required
      ? {
          error: jsonErrorResponse(`Missing required form field: ${key}`, 400),
        }
      : { value: undefined }
  }

  const normalizedValue = normalizeFlag(valueResult.value)

  if (TRUE_FORM_VALUES.has(normalizedValue)) {
    return { value: true }
  }

  if (FALSE_FORM_VALUES.has(normalizedValue)) {
    return { value: false }
  }

  return {
    error: jsonErrorResponse(`Invalid boolean form field: ${key}`, 400),
  }
}

const isIndexingStrategy = (value: string): value is IndexingStrategy =>
  value === 'name_municipality' || value === 'id'

const getColStringValue = ({
  existing,
  formData,
  key,
  required,
}: {
  existing?: string
  formData: FormData
  key: string
  required: boolean
}): ParseResult<string | undefined> => {
  const valueResult = getOptionalStringField(formData, key)

  if (isParseError(valueResult)) {
    return valueResult
  }

  if (valueResult.value !== undefined) {
    return { value: valueResult.value }
  }

  if (!formData.has(key) && existing !== undefined) {
    return { value: existing }
  }

  return required
    ? {
        error: jsonErrorResponse(`Missing required form field: ${key}`, 400),
      }
    : { value: undefined }
}

const parseColOptionsFromFormData = ({
  existing,
  formData,
  required,
}: {
  existing?: ColOptions
  formData: FormData
  required: boolean
}): ParseResult<ColOptions | undefined> => {
  const hasAnyColOptions = COL_OPTION_FORM_FIELDS.some((field) =>
    formData.has(field)
  )

  if (!required && !hasAnyColOptions) {
    return { value: undefined }
  }

  const indexingStrategyResult = getColStringValue({
    existing: existing?.indexingStrategy,
    formData,
    key: 'indexing_strategy',
    required: true,
  })

  if (isParseError(indexingStrategyResult)) {
    return indexingStrategyResult
  }

  const indexingStrategy = indexingStrategyResult.value

  if (!indexingStrategy || !isIndexingStrategy(indexingStrategy)) {
    return {
      error: jsonErrorResponse('Invalid indexing_strategy form field', 400),
    }
  }

  const nameColResult = getColStringValue({
    existing: existing?.nameCol,
    formData,
    key: 'name_col',
    required: true,
  })
  const municipalityColResult = getColStringValue({
    existing: existing?.municipalityCol,
    formData,
    key: 'municipality_col',
    required: true,
  })
  const regionColResult = getColStringValue({
    existing: existing?.regionCol,
    formData,
    key: 'region_col',
    required: false,
  })
  const descriptionColResult = getColStringValue({
    existing: existing?.descriptionCol,
    formData,
    key: 'description_col',
    required: false,
  })
  const areaColResult = getColStringValue({
    existing: existing?.areaCol,
    formData,
    key: 'area_col',
    required: false,
  })
  const idColResult = getColStringValue({
    existing: existing?.idCol,
    formData,
    key: 'id_col',
    required: false,
  })

  if (isParseError(nameColResult)) {
    return nameColResult
  }

  if (isParseError(municipalityColResult)) {
    return municipalityColResult
  }

  if (isParseError(regionColResult)) {
    return regionColResult
  }

  if (isParseError(descriptionColResult)) {
    return descriptionColResult
  }

  if (isParseError(areaColResult)) {
    return areaColResult
  }

  if (isParseError(idColResult)) {
    return idColResult
  }

  if (!nameColResult.value || !municipalityColResult.value) {
    return {
      error: jsonErrorResponse('Missing required column option form field', 400),
    }
  }

  return {
    value: {
      indexingStrategy,
      nameCol: nameColResult.value,
      municipalityCol: municipalityColResult.value,
      ...(regionColResult.value ? { regionCol: regionColResult.value } : {}),
      ...(descriptionColResult.value
        ? { descriptionCol: descriptionColResult.value }
        : {}),
      ...(areaColResult.value ? { areaCol: areaColResult.value } : {}),
      ...(idColResult.value ? { idCol: idColResult.value } : {}),
    },
  }
}

const parseLayerCreateFormData = (
  formData: FormData
): ParseResult<Parameters<typeof createLuonnonmetsakartatMockLayer>[0]> => {
  const nameResult = getRequiredStringField(formData, 'name')
  const colorResult = getRequiredStringField(formData, 'color_code')
  const descriptionResult = getOptionalStringField(formData, 'description')
  const hiddenResult = parseBooleanField({
    formData,
    key: 'is_hidden',
    required: true,
  })
  const colOptionsResult = parseColOptionsFromFormData({
    formData,
    required: true,
  })

  if (isParseError(nameResult)) {
    return nameResult
  }

  if (isParseError(colorResult)) {
    return colorResult
  }

  if (isParseError(descriptionResult)) {
    return descriptionResult
  }

  if (isParseError(hiddenResult)) {
    return hiddenResult
  }

  if (isParseError(colOptionsResult)) {
    return colOptionsResult
  }

  if (hiddenResult.value === undefined || !colOptionsResult.value) {
    return {
      error: jsonErrorResponse('Missing required layer form field', 400),
    }
  }

  return {
    value: {
      name: nameResult.value,
      color_code: colorResult.value,
      description: descriptionResult.value,
      is_hidden: hiddenResult.value,
      col_options: colOptionsResult.value,
    },
  }
}

const parseLayerPatchFormData = ({
  existing,
  formData,
}: {
  existing: ReturnType<typeof getLuonnonmetsakartatMockLayer>
  formData: FormData
}): ParseResult<Parameters<typeof updateLuonnonmetsakartatMockLayer>[1]> => {
  if (!existing) {
    return { error: jsonErrorResponse('Mock layer not found', 404) }
  }

  const nameResult = getOptionalStringField(formData, 'name')
  const colorResult = getOptionalStringField(formData, 'color_code')
  const descriptionResult = getOptionalStringField(formData, 'description')
  const hiddenResult = parseBooleanField({ formData, key: 'is_hidden' })
  const deleteAreasNotUpdatedResult = parseBooleanField({
    formData,
    key: 'delete_areas_not_updated',
  })
  const colOptionsResult = parseColOptionsFromFormData({
    existing: existing.col_options,
    formData,
    required: false,
  })

  if (isParseError(nameResult)) {
    return nameResult
  }

  if (isParseError(colorResult)) {
    return colorResult
  }

  if (isParseError(descriptionResult)) {
    return descriptionResult
  }

  if (isParseError(hiddenResult)) {
    return hiddenResult
  }

  if (isParseError(deleteAreasNotUpdatedResult)) {
    return deleteAreasNotUpdatedResult
  }

  if (isParseError(colOptionsResult)) {
    return colOptionsResult
  }

  return {
    value: {
      ...(nameResult.value !== undefined ? { name: nameResult.value } : {}),
      ...(colorResult.value !== undefined
        ? { color_code: colorResult.value }
        : {}),
      ...(descriptionResult.value !== undefined
        ? { description: descriptionResult.value }
        : {}),
      ...(hiddenResult.value !== undefined
        ? { is_hidden: hiddenResult.value }
        : {}),
      ...(colOptionsResult.value !== undefined
        ? { col_options: colOptionsResult.value }
        : {}),
    },
  }
}

const isBlobLike = (
  value: FormDataEntryValue
): value is File =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Blob).arrayBuffer === 'function'

const getUploadFileName = (value: File, index: number) => {
  const name = value.name?.trim()

  return name || `upload-${index + 1}.bin`
}

const parsePictureAttachmentsFromFormData = (
  formData: FormData
): ParseResult<MockPictureAttachment[]> => {
  const images = formData.getAll('bulk_images')
  const areaIds = formData.getAll('bulk_area_ids')

  if (images.length === 0 && areaIds.length === 0) {
    return { value: [] }
  }

  if (
    images.length === 0 ||
    areaIds.length === 0 ||
    images.length !== areaIds.length
  ) {
    return {
      error: jsonErrorResponse(
        'bulk_images and bulk_area_ids must be aligned',
        400
      ),
    }
  }

  const attachments: MockPictureAttachment[] = []

  for (const [index, image] of images.entries()) {
    const areaId = areaIds[index]

    if (!isBlobLike(image) || typeof areaId !== 'string' || !areaId.trim()) {
      return {
        error: jsonErrorResponse(
          'bulk_images must be files and bulk_area_ids must be strings',
          400
        ),
      }
    }

    attachments.push({
      areaId: areaId.trim(),
      fileName: getUploadFileName(image, index),
    })
  }

  return { value: attachments }
}

const parseAreaPatchPropertiesFromFormData = (
  formData: FormData
): ParseResult<Record<string, string>> => {
  const properties: Record<string, string> = {}

  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') {
      return {
        error: jsonErrorResponse(
          `Expected string area property field: ${key}`,
          400
        ),
      }
    }

    properties[key] = value
  }

  return { value: properties }
}

const handleAdminValidate = (authStatus: MockAuthStatus) => {
  if (authStatus === 'verified') {
    return jsonResponse({ is_editor: true, is_admin: true })
  }

  return getAdminAuthErrorResponse(authStatus)
}

const handleLayers = (authStatus: MockAuthStatus) => {
  if (authStatus === 'missing') {
    return jsonResponse(
      getLuonnonmetsakartatMockLayers()
        .filter((layer) => !layer.is_hidden)
        .map(toPublicLayerItem)
    )
  }

  if (authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  return jsonResponse(getLuonnonmetsakartatMockLayers().map(toAdminLayerItem))
}

const handleLayerDetail = ({
  authStatus,
  layerId,
}: {
  authStatus: MockAuthStatus
  layerId: string
}) => {
  if (authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  const layer = getLuonnonmetsakartatMockLayer(layerId)

  if (!layer) {
    return jsonErrorResponse('Mock layer not found', 404)
  }

  return jsonResponse(toAdminLayerItem(layer))
}

const handleLayerCreate = async ({
  authStatus,
  request,
}: {
  authStatus: MockAuthStatus
  request: Request
}) => {
  if (authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  const formDataResult = await readMockFormData(request)

  if (isParseError(formDataResult)) {
    return formDataResult.error
  }

  const inputResult = parseLayerCreateFormData(formDataResult.value)

  if (isParseError(inputResult)) {
    return inputResult.error
  }

  const layer = createLuonnonmetsakartatMockLayer(inputResult.value)

  return jsonResponse(toAdminLayerItem(layer), 201)
}

const handleLayerPatch = async ({
  authStatus,
  layerId,
  request,
}: {
  authStatus: MockAuthStatus
  layerId: string
  request: Request
}) => {
  if (authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  const existingLayer = getLuonnonmetsakartatMockLayer(layerId)

  if (!existingLayer) {
    return jsonErrorResponse('Mock layer not found', 404)
  }

  const formDataResult = await readMockFormData(request)

  if (isParseError(formDataResult)) {
    return formDataResult.error
  }

  const patchResult = parseLayerPatchFormData({
    existing: existingLayer,
    formData: formDataResult.value,
  })
  const attachmentsResult = parsePictureAttachmentsFromFormData(
    formDataResult.value
  )

  if (isParseError(patchResult)) {
    return patchResult.error
  }

  if (isParseError(attachmentsResult)) {
    return attachmentsResult.error
  }

  if (attachmentsResult.value.length > 0) {
    const attachResult = attachLuonnonmetsakartatMockLayerAreaPictures({
      attachments: attachmentsResult.value,
      layerId,
    })

    if (attachResult.status === 'layer-not-found') {
      return jsonErrorResponse('Mock layer not found', 404)
    }

    if (attachResult.status === 'area-not-found') {
      return jsonErrorResponse('Mock area not found', 404)
    }
  }

  const updatedLayer = updateLuonnonmetsakartatMockLayer(
    layerId,
    patchResult.value
  )

  if (!updatedLayer) {
    return jsonErrorResponse('Mock layer not found', 404)
  }

  return jsonResponse(toAdminLayerItem(updatedLayer))
}

const handleLayerDelete = ({
  authStatus,
  layerId,
}: {
  authStatus: MockAuthStatus
  layerId: string
}) => {
  if (authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  if (!deleteLuonnonmetsakartatMockLayer(layerId)) {
    return jsonErrorResponse('Mock layer not found', 404)
  }

  return jsonResponse({ id: layerId, deleted: true })
}

const handleLayerAreaPatch = async ({
  authStatus,
  featureId,
  layerId,
  request,
}: {
  authStatus: MockAuthStatus
  featureId: string
  layerId: string
  request: Request
}) => {
  if (authStatus !== 'verified') {
    return getAdminAuthErrorResponse(authStatus)
  }

  const formDataResult = await readMockFormData(request)

  if (isParseError(formDataResult)) {
    return formDataResult.error
  }

  const propertiesResult = parseAreaPatchPropertiesFromFormData(
    formDataResult.value
  )

  if (isParseError(propertiesResult)) {
    return propertiesResult.error
  }

  const updateResult = updateLuonnonmetsakartatMockLayerArea({
    featureId,
    layerId,
    properties: propertiesResult.value,
  })

  if (updateResult.status === 'layer-not-found') {
    return jsonErrorResponse('Mock layer not found', 404)
  }

  if (updateResult.status === 'area-not-found') {
    return jsonErrorResponse('Mock area not found', 404)
  }

  return jsonResponse(updateResult.feature)
}

export const handleLuonnonmetsakartatMockApiRequest = async ({
  request,
}: {
  request: Request
}) => {
  const method = request.method.toUpperCase()
  const mockPath = getMockPath(request)

  if (!mockPath) {
    return jsonErrorResponse('Mock proxy path is missing', 404)
  }

  // Validate escapes before individual route fields are decoded. Keep the
  // encoded path for routing so encoded separators cannot introduce routes.
  try {
    decodeURIComponent(mockPath)
  } catch (error) {
    if (error instanceof URIError) {
      return jsonErrorResponse('Malformed mock URL encoding', 400)
    }
    throw error
  }

  const authStatus = getMockAuthStatus(request)

  if (mockPath.startsWith('/geoserver/')) {
    return handleMockGeoServerRequest({
      authStatus,
      method,
      mockPath,
      request,
    })
  }

  if (mockPath === '/admin/validate') {
    return method === 'GET'
      ? handleAdminValidate(authStatus)
      : jsonErrorResponse('Method not allowed', 405)
  }

  if (mockPath === '/layers') {
    return method === 'GET'
      ? handleLayers(authStatus)
      : jsonErrorResponse('Method not allowed', 405)
  }

  if (mockPath === '/layer' || mockPath === '/layer/') {
    if (method === 'GET') {
      return jsonErrorResponse('Missing required layer id', 400)
    }

    if (method === 'POST') {
      return handleLayerCreate({ authStatus, request })
    }

    return jsonErrorResponse('Method not allowed', 405)
  }

  const areaMatch = mockPath.match(/^\/layer\/([^/]+)\/area\/([^/]+)\/?$/)

  if (areaMatch) {
    return method === 'PATCH'
      ? handleLayerAreaPatch({
          authStatus,
          featureId: decodeURIComponent(areaMatch[2]),
          layerId: decodeURIComponent(areaMatch[1]),
          request,
        })
      : jsonErrorResponse('Method not allowed', 405)
  }

  const layerMatch = mockPath.match(/^\/layer\/([^/]+)\/?$/)

  if (layerMatch) {
    if (method === 'GET') {
      return handleLayerDetail({
        authStatus,
        layerId: decodeURIComponent(layerMatch[1]),
      })
    }

    if (method === 'PATCH') {
      return handleLayerPatch({
        authStatus,
        layerId: decodeURIComponent(layerMatch[1]),
        request,
      })
    }

    if (method === 'DELETE') {
      return handleLayerDelete({
        authStatus,
        layerId: decodeURIComponent(layerMatch[1]),
      })
    }

    return jsonErrorResponse('Method not allowed', 405)
  }

  return jsonErrorResponse(
    'Unsupported Luonnonmetsakartat mock API endpoint',
    404
  )
}
