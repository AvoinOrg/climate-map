/** @jest-environment node */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import type { Geometry } from 'geojson'
import {
  createLuonnonmetsakartatMockDefaultColOptions as columns,
  createLuonnonmetsakartatMockSeedLayers as seed,
} from 'applets/luonnonmetsakartat/common/mockDataSeed'
import {
  attachLuonnonmetsakartatMockLayerAreaPictures as attach,
  createLuonnonmetsakartatMockLayer as create,
  deleteLuonnonmetsakartatMockLayer as remove,
  getLuonnonmetsakartatMockLayer as get,
  getLuonnonmetsakartatMockLayerAreas as areas,
  getLuonnonmetsakartatMockLayers as list,
  resetLuonnonmetsakartatMockApiForTests as reset,
  updateLuonnonmetsakartatMockLayer as update,
  updateLuonnonmetsakartatMockLayerArea as editArea,
} from './mockDataStore'

const polygonCoordinates = (geometry: Geometry) => {
  if (geometry.type !== 'Polygon') throw new Error('Expected a mock polygon')
  return geometry.coordinates
}

const layerId = 'mock-visible-layer'
const featureId = 'mock-visible-area-picture'
const input = () => ({
  name: 'Uploaded forests',
  color_code: '#abcdef',
  is_hidden: true,
  col_options: columns(),
})
const nextSuccess = () => ({
  created: create(input()),
  updated: update(layerId, { name: 'After failure' }),
})

// Each failure is compared against a clean replay, including both private counters.
const expectUnchangedAfter = (operation: () => void) => {
  const before = list()
  operation()
  expect(list()).toEqual(before)
  const afterFailure = nextSuccess()
  reset()
  expect(nextSuccess()).toEqual(afterFailure)
}

describe('mock data store', () => {
  beforeEach(reset)
  afterEach(() => {
    jest.restoreAllMocks()
    reset()
  })

  it('seeds stable visible, hidden and empty layers with polygon and picture data', () => {
    const layers = list()
    expect(
      layers.map(({ id, is_hidden, created_ts }) => [id, is_hidden, created_ts])
    ).toEqual([
      [layerId, false, 1_735_689_600],
      ['mock-hidden-layer', true, 1_735_689_660],
      ['mock-empty-layer', false, 1_735_689_720],
    ])
    expect(layers[0]).toMatchObject({
      name: 'Mock visible forest layer',
      color_code: '#2f855a',
      updated_ts: 1_735_776_000,
      col_options: {
        indexingStrategy: 'name_municipality',
        nameCol: 'name',
        areaCol: 'area_ha',
      },
    })
    expect(layers[1].col_options.indexingStrategy).toBe('id')
    expect(layers[1].areas.features.map((feature) => feature.id)).toEqual([
      'mock-hidden-area',
    ])
    const [picture, noPicture] = layers[0].areas.features
    expect(picture.properties).toMatchObject({
      id: featureId,
      name: 'Mock Ridge Forest',
      municipality: 'Espoo',
      region: 'Uusimaa',
      description: 'Old spruce stand with a small wetland edge.',
      date: '2025-05-10',
      area_ha: 12.34,
      layer_id: layerId,
      created_ts: '2025-01-01T00:00:00.000Z',
      updated_ts: '2025-01-02T00:00:00.000Z',
    })
    expect(picture.geometry.type).toBe('Polygon')
    expect(polygonCoordinates(picture.geometry)[0][0]).toEqual([24.85, 60.22])
    expect(JSON.parse(picture.properties.pictures!)).toEqual([
      'https://example.org/mock/forest-ridge-1.jpg',
      'https://example.org/mock/forest-ridge-2.jpg',
    ])
    expect(noPicture.properties).toMatchObject({
      id: 'mock-visible-area-no-picture',
      municipality: 'Lohja',
      region: 'Uusimaa',
      date: '2024-09-18',
      area_ha: 7.89,
    })
    expect(noPicture.properties.pictures).toBeUndefined()
    expect(areas('mock-empty-layer')).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
    expect(get('missing')).toBeNull()
    expect(areas('missing')).toBeNull()
  })

  it('creates fresh seed factories and clones every nested getter boundary', () => {
    const original = seed()
    const mutatedSeed = seed()
    mutatedSeed[0].col_options.nameCol = 'changed'
    polygonCoordinates(mutatedSeed[0].areas.features[0].geometry)[0][0][0] = 0
    expect(seed()).toEqual(original)
    const fromList = list()
    fromList[0].name = 'changed'
    fromList[0].col_options.nameCol = 'changed'
    fromList[0].areas.features[0].properties.name = 'changed'
    const fromDetail = get(layerId)!
    fromDetail.col_options.idCol = 'changed'
    polygonCoordinates(fromDetail.areas.features[0].geometry)[0][0][0] = 0
    const fromAreas = areas(layerId)!
    fromAreas.features[0].properties.pictures = '[]'
    polygonCoordinates(fromAreas.features[0].geometry)[0][0][1] = 0
    expect(list()).toEqual(original)
  })

  it('clones create and update column inputs and mutation results', () => {
    const callerInput = input()
    const created = create(callerInput)
    const committed = get(created.id)
    callerInput.col_options.nameCol = 'caller mutation'
    created.col_options.nameCol = 'result mutation'
    polygonCoordinates(created.areas.features[0].geometry)[0][0][0] = 0
    created.areas.features[0].properties.name = 'result mutation'
    expect(get(created.id)).toEqual(committed)
    const col_options = columns()
    const updated = update(created.id, { col_options })!
    const committedUpdate = get(created.id)
    col_options.nameCol = 'caller mutation'
    updated.col_options.nameCol = 'result mutation'
    polygonCoordinates(updated.areas.features[0].geometry)[0][0][0] = 0
    expect(get(created.id)).toEqual(committedUpdate)
  })

  it('creates deterministic synthetic areas, preserves omitted metadata, and deletes without reusing IDs', () => {
    const untouched = list()
    const created = create(input())
    expect(created).toMatchObject({
      id: 'mock-created-layer-1',
      description: '',
      created_ts: 1_735_779_660,
      updated_ts: 1_735_779_660,
    })
    expect(created.areas.features.map((feature) => feature.id)).toEqual([
      'mock-created-layer-1-area-1',
      'mock-created-layer-1-area-2',
    ])
    expect(created.areas.features[0].properties).toMatchObject({
      name: 'Uploaded forests mock area 1',
      layer_id: created.id,
      created_ts: '2025-02-01T00:01:00.000Z',
      updated_ts: '2025-02-01T00:01:00.000Z',
    })
    const updated = update(created.id, {
      name: 'Renamed',
      description: 'Description',
    })!
    expect(updated).toEqual({
      ...created,
      name: 'Renamed',
      description: 'Description',
      updated_ts: 1_735_779_720,
    })
    expect(remove(created.id)).toBe(true)
    expect(get(created.id)).toBeNull()
    expect(areas(created.id)).toBeNull()
    expect(list()).toEqual(untouched)
    expect(remove(created.id)).toBe(false)
    expect(create(input()).id).toBe('mock-created-layer-2')
  })

  it('edits string area properties including empty values while protecting identity, geometry and timestamps', () => {
    const before = get(layerId)!
    const editable = {
      name: 'Edited',
      description: '',
      municipality: 'Helsinki',
      region: 'Edited region',
      date: '',
      pictures: '[]',
    }
    const result = editArea({
      layerId,
      featureId,
      properties: {
        ...editable,
        id: 'wrong',
        created_ts: 'wrong',
        updated_ts: 'wrong',
        layer_id: 'wrong',
        area_ha: '999',
        geometry: 'wrong',
      },
    })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('Expected area result')
    const expected = {
      ...before.areas.features[0],
      properties: {
        ...before.areas.features[0].properties,
        ...editable,
        updated_ts: '2025-02-01T00:01:00.000Z',
      },
    }
    expect(result.feature).toEqual(expected)
    expect(areas(layerId)!.features).toEqual([
      expected,
      before.areas.features[1],
    ])
    expect(get(layerId)!.updated_ts).toBe(before.updated_ts)
    result.feature.properties.name = 'result mutation'
    polygonCoordinates(result.feature.geometry)[0][0][0] = 0
    expect(areas(layerId)!.features[0]).toEqual(expected)
  })

  it('appends ordered picture metadata for repeated targets and clones attachment results', () => {
    const before = get(layerId)!
    const attachments = [
      { areaId: featureId, fileName: 'ridge new.jpg' },
      { areaId: featureId, fileName: 'ä & #.jpg' },
    ]
    const result = attach({ layerId, attachments })
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('Expected picture result')
    expect(
      JSON.parse(result.layer.areas.features[0].properties.pictures!)
    ).toEqual([
      ...JSON.parse(before.areas.features[0].properties.pictures!),
      `https://example.org/mock/uploads/${layerId}/${featureId}/1-ridge%20new.jpg`,
      `https://example.org/mock/uploads/${layerId}/${featureId}/2-%C3%A4%20%26%20%23.jpg`,
    ])
    expect(result.layer.areas.features[0].properties.updated_ts).toBe(
      '2025-02-01T00:01:00.000Z'
    )
    expect(result.layer.areas.features[1]).toEqual(before.areas.features[1])
    expect(result.layer.updated_ts).toBe(before.updated_ts)
    const committed = get(layerId)
    attachments[0].fileName = 'caller mutation'
    result.layer.col_options.nameCol = 'result mutation'
    result.layer.areas.features[0].properties.pictures = '[]'
    polygonCoordinates(result.layer.areas.features[0].geometry)[0][0][0] = 0
    expect(get(layerId)).toEqual(committed)
  })

  it.each(['broken json', '{}', 'null', '123', '[7,null,"keep.jpg"]'])(
    'recovers invalid/non-array picture JSON or filters non-string entries: %s',
    (pictures) => {
      editArea({ layerId, featureId, properties: { pictures } })
      attach({
        layerId,
        attachments: [{ areaId: featureId, fileName: 'new.jpg' }],
      })
      const result = JSON.parse(
        areas(layerId)!.features[0].properties.pictures!
      )
      expect(result).toEqual([
        ...(pictures.startsWith('[') ? ['keep.jpg'] : []),
        `https://example.org/mock/uploads/${layerId}/${featureId}/1-new.jpg`,
      ])
    }
  )

  it.each([
    'update layer',
    'delete layer',
    'edit missing layer',
    'edit missing area',
    'attach missing layer',
    'mixed picture targets',
  ])(
    'leaves all state and future ID/timestamp sequences unchanged after failed %s',
    (operation) => {
      expectUnchangedAfter(() => {
        switch (operation) {
          case 'update layer':
            expect(update('missing', { name: 'bad' })).toBeNull()
            break
          case 'delete layer':
            expect(remove('missing')).toBe(false)
            break
          case 'edit missing layer':
            expect(
              editArea({
                layerId: 'missing',
                featureId,
                properties: { name: 'bad' },
              })
            ).toEqual({ status: 'layer-not-found' })
            break
          case 'edit missing area':
            expect(
              editArea({
                layerId,
                featureId: 'missing',
                properties: { name: 'bad' },
              })
            ).toEqual({ status: 'area-not-found' })
            break
          case 'attach missing layer':
            expect(
              attach({
                layerId: 'missing',
                attachments: [{ areaId: featureId, fileName: 'bad.jpg' }],
              })
            ).toEqual({ status: 'layer-not-found' })
            break
          case 'mixed picture targets':
            expect(
              attach({
                layerId,
                attachments: [
                  { areaId: featureId, fileName: 'valid.jpg' },
                  { areaId: 'missing', fileName: 'bad.jpg' },
                ],
              })
            ).toEqual({ status: 'area-not-found', areaId: 'missing' })
            break
        }
      })
    }
  )

  it('replays a mixed lifecycle after reset, restoring deleted seed data and both counters', () => {
    const original = list()
    const replay = () => {
      const created = create(input())
      const updated = update(layerId, {
        name: 'Edited seed',
        col_options: columns(),
      })
      const edited = editArea({
        layerId,
        featureId,
        properties: { name: 'Edited area' },
      })
      const attached = attach({
        layerId,
        attachments: [{ areaId: featureId, fileName: 'picture.jpg' }],
      })
      remove('mock-hidden-layer')
      remove(created.id)
      return {
        created,
        updated,
        edited,
        attached,
        next: create(input()),
        state: list(),
      }
    }
    const first = replay()
    reset()
    expect(list()).toEqual(original)
    expect(replay()).toEqual(first)
  })

  it('refuses the test reset helper in production without resetting data or counters', () => {
    const first = create(input())
    const before = list()
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
    })
    expect(() => reset()).toThrow(
      'Mock API test reset is unavailable in production'
    )
    expect(list()).toEqual(before)
    jest.restoreAllMocks()
    const afterRefusal = nextSuccess()
    reset()
    expect(create(input())).toEqual(first)
    expect(nextSuccess()).toEqual(afterRefusal)
  })
})
