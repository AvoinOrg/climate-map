import type {
  ColOptions,
  FolayerFeature,
} from 'applets/luonnonmetsakartat/common/types'
import {
  createLuonnonmetsakartatMockAreaCollection,
  createLuonnonmetsakartatMockAreaFeature,
  createLuonnonmetsakartatMockSeedLayers,
  LUONNONMETSAKARTAT_MOCK_LAYER_UPDATED_TS,
  type LuonnonmetsakartatMockLayerRecord,
} from 'applets/luonnonmetsakartat/common/mockDataSeed'

type MockLayerInput = {
  name: string
  description?: string
  color_code: string
  is_hidden: boolean
  col_options: ColOptions
}

type MockLayerUpdates = Partial<MockLayerInput>

type MockPictureAttachment = {
  areaId: string
  fileName: string
}

type MockAreaPatchInput = {
  layerId: string
  featureId: string
  properties: Record<string, string>
}

type MockAreaMutationResult =
  | {
      status: 'ok'
      feature: FolayerFeature
    }
  | {
      status: 'layer-not-found'
    }
  | {
      status: 'area-not-found'
    }

type MockPictureAttachmentResult =
  | {
      status: 'ok'
      layer: LuonnonmetsakartatMockLayerRecord
    }
  | {
      status: 'layer-not-found'
    }
  | {
      status: 'area-not-found'
      areaId: string
    }

const MOCK_MUTATION_LAYER_TS_BASE =
  LUONNONMETSAKARTAT_MOCK_LAYER_UPDATED_TS + 3_600
const MOCK_MUTATION_AREA_TS_BASE = Date.UTC(2025, 1, 1, 0, 0, 0)
const MUTATION_TS_STEP_SECONDS = 60
const PROTECTED_AREA_PROPERTY_KEYS = new Set([
  'id',
  'created_ts',
  'updated_ts',
  'layer_id',
  'area_ha',
  'geometry',
])

let layersById = new Map<string, LuonnonmetsakartatMockLayerRecord>()
let nextLayerSequence = 1
let nextMutationSequence = 1

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const getNextMutationSequence = () => nextMutationSequence++

const getLayerMutationTimestamp = (mutationSequence: number) =>
  MOCK_MUTATION_LAYER_TS_BASE + mutationSequence * MUTATION_TS_STEP_SECONDS

const getAreaMutationTimestamp = (mutationSequence: number) =>
  new Date(
    MOCK_MUTATION_AREA_TS_BASE + mutationSequence * MUTATION_TS_STEP_SECONDS * 1000
  ).toISOString()

const createImportedLayerAreaFeatures = ({
  areaTimestamp,
  layerId,
  layerName,
  layerSequence,
}: {
  areaTimestamp: string
  layerId: string
  layerName: string
  layerSequence: number
}) => {
  const baseOffsetX = 0.06 + layerSequence * 0.018
  const baseOffsetY = 0.02 + layerSequence * 0.006

  return [
    createLuonnonmetsakartatMockAreaFeature({
      id: `${layerId}-area-1`,
      layerId,
      name: `${layerName} mock area 1`,
      municipality: 'Vantaa',
      region: 'Uusimaa',
      description: 'Deterministic imported mock forest area.',
      date: '2025-02-01',
      areaHa: 10 + layerSequence,
      offsetX: baseOffsetX,
      offsetY: baseOffsetY,
      createdTs: areaTimestamp,
      updatedTs: areaTimestamp,
    }),
    createLuonnonmetsakartatMockAreaFeature({
      id: `${layerId}-area-2`,
      layerId,
      name: `${layerName} mock area 2`,
      municipality: 'Kirkkonummi',
      region: 'Uusimaa',
      description: 'Second deterministic imported mock forest area.',
      date: '2025-02-02',
      areaHa: 6.5 + layerSequence,
      offsetX: baseOffsetX + 0.012,
      offsetY: baseOffsetY + 0.004,
      createdTs: areaTimestamp,
      updatedTs: areaTimestamp,
    }),
  ]
}

const resetStorage = () => {
  nextLayerSequence = 1
  nextMutationSequence = 1
  layersById = new Map(
    createLuonnonmetsakartatMockSeedLayers().map((layer) => [
      layer.id,
      deepClone(layer),
    ])
  )
}

export const resetLuonnonmetsakartatMockApiForTests = () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Mock API test reset is unavailable in production')
  }

  resetStorage()
}

export const getLuonnonmetsakartatMockLayers = () =>
  Array.from(layersById.values()).map((layer) => deepClone(layer))

export const getLuonnonmetsakartatMockLayer = (id: string) => {
  const layer = layersById.get(id)

  return layer ? deepClone(layer) : null
}

export const getLuonnonmetsakartatMockLayerAreas = (id: string) => {
  const layer = layersById.get(id)

  return layer ? deepClone(layer.areas) : null
}

export const createLuonnonmetsakartatMockLayer = (input: MockLayerInput) => {
  const layerSequence = nextLayerSequence++
  const mutationSequence = getNextMutationSequence()
  const timestamp = getLayerMutationTimestamp(mutationSequence)
  const areaTimestamp = getAreaMutationTimestamp(mutationSequence)
  const layerId = `mock-created-layer-${layerSequence}`
  const layer: LuonnonmetsakartatMockLayerRecord = {
    id: layerId,
    name: input.name,
    description: input.description ?? '',
    color_code: input.color_code,
    is_hidden: input.is_hidden,
    created_ts: timestamp,
    updated_ts: timestamp,
    col_options: deepClone(input.col_options),
    areas: createLuonnonmetsakartatMockAreaCollection(
      createImportedLayerAreaFeatures({
        areaTimestamp,
        layerId,
        layerName: input.name,
        layerSequence,
      })
    ),
  }

  layersById.set(layerId, deepClone(layer))

  return deepClone(layer)
}

export const updateLuonnonmetsakartatMockLayer = (
  id: string,
  updates: MockLayerUpdates
) => {
  const layer = layersById.get(id)

  if (!layer) {
    return null
  }

  const mutationSequence = getNextMutationSequence()

  if (updates.name !== undefined) {
    layer.name = updates.name
  }

  if (updates.description !== undefined) {
    layer.description = updates.description
  }

  if (updates.color_code !== undefined) {
    layer.color_code = updates.color_code
  }

  if (updates.is_hidden !== undefined) {
    layer.is_hidden = updates.is_hidden
  }

  if (updates.col_options !== undefined) {
    layer.col_options = deepClone(updates.col_options)
  }

  layer.updated_ts = getLayerMutationTimestamp(mutationSequence)

  return deepClone(layer)
}

export const deleteLuonnonmetsakartatMockLayer = (id: string) => {
  const layer = layersById.get(id)

  if (!layer) {
    return false
  }

  layersById.delete(id)

  return true
}

const getPictureList = (pictures: unknown) => {
  if (Array.isArray(pictures)) {
    return pictures.filter((picture): picture is string =>
      typeof picture === 'string'
    )
  }

  if (typeof pictures !== 'string') {
    return []
  }

  try {
    const parsed = JSON.parse(pictures) as unknown

    return Array.isArray(parsed)
      ? parsed.filter((picture): picture is string =>
          typeof picture === 'string'
        )
      : []
  } catch {
    return []
  }
}

const createMockPictureUrl = ({
  areaId,
  fileName,
  index,
  layerId,
}: MockPictureAttachment & {
  index: number
  layerId: string
}) =>
  `https://example.org/mock/uploads/${encodeURIComponent(
    layerId
  )}/${encodeURIComponent(areaId)}/${index}-${encodeURIComponent(fileName)}`

export const attachLuonnonmetsakartatMockLayerAreaPictures = ({
  attachments,
  layerId,
}: {
  attachments: MockPictureAttachment[]
  layerId: string
}): MockPictureAttachmentResult => {
  const layer = layersById.get(layerId)

  if (!layer) {
    return { status: 'layer-not-found' }
  }

  const featuresById = new Map(
    layer.areas.features.map((feature) => [String(feature.properties.id), feature])
  )
  const missingAttachment = attachments.find(
    (attachment) => !featuresById.has(attachment.areaId)
  )

  if (missingAttachment) {
    return {
      status: 'area-not-found',
      areaId: missingAttachment.areaId,
    }
  }

  const mutationSequence = getNextMutationSequence()
  const updatedTs = getAreaMutationTimestamp(mutationSequence)

  attachments.forEach((attachment, index) => {
    const feature = featuresById.get(attachment.areaId)

    if (!feature) {
      return
    }

    const pictures = getPictureList(feature.properties.pictures)
    const mutableProperties = feature.properties as unknown as Record<
      string,
      unknown
    >

    pictures.push(
      createMockPictureUrl({
        ...attachment,
        index: index + 1,
        layerId,
      })
    )
    mutableProperties.pictures = JSON.stringify(pictures)
    mutableProperties.updated_ts = updatedTs
  })

  return { status: 'ok', layer: deepClone(layer) }
}

export const updateLuonnonmetsakartatMockLayerArea = ({
  featureId,
  layerId,
  properties,
}: MockAreaPatchInput): MockAreaMutationResult => {
  const layer = layersById.get(layerId)

  if (!layer) {
    return { status: 'layer-not-found' }
  }

  const feature = layer.areas.features.find(
    (item) => item.id === featureId || item.properties.id === featureId
  )

  if (!feature) {
    return { status: 'area-not-found' }
  }

  const mutableProperties = feature.properties as unknown as Record<
    string,
    unknown
  >

  Object.entries(properties).forEach(([key, value]) => {
    if (!PROTECTED_AREA_PROPERTY_KEYS.has(key)) {
      mutableProperties[key] = value
    }
  })

  const mutationSequence = getNextMutationSequence()
  mutableProperties.updated_ts = getAreaMutationTimestamp(mutationSequence)

  return {
    status: 'ok',
    feature: deepClone(feature),
  }
}

resetStorage()
