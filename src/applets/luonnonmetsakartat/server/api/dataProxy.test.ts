import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { Blob as NodeBlob, File as NodeFile } from 'buffer'
import { ReadableStream } from 'stream/web'
import { TextDecoder, TextEncoder } from 'util'
import { MessageChannel, MessagePort } from 'worker_threads'
import type { FeatureCollection, Point } from 'geojson'
import type * as UndiciModule from 'undici'

import {
  MOCK_AUTH_ACCESS_TOKEN,
  MOCK_AUTH_REJECTED_ACCESS_TOKEN,
} from '#/common/auth/mock'
import { handleLuonnonmetsakartatDataProxyRequest } from './dataProxy'
import {
  getLuonnonmetsakartatMockLayerAreas,
  getLuonnonmetsakartatMockLayers,
  resetLuonnonmetsakartatMockApiForTests,
} from './mockDataStore'
import type { FolayerFeature } from '../../common/types'

const mockEnv = {
  LUONNONMETSAKARTAT_MOCK_API_ENABLED: '1',
  NODE_ENV: 'test',
}

const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
})

type MockLayerApiItem = {
  id: string
  name?: string
  description?: string
  color_code?: string
  created_ts: number
  updated_ts: number
  is_hidden?: boolean
  col_options?: {
    areaCol?: string
    descriptionCol?: string
    idCol?: string
    indexingStrategy?: string
    municipalityCol?: string
    nameCol?: string
    regionCol?: string
  }
}

type MockWfsFeatureCollection = FeatureCollection<
  Point,
  FolayerFeature['properties']
>

const readJson = async <T = unknown>(response: Response) =>
  (await response.json()) as T

const appendMockZipFile = (formData: FormData) => {
  formData.append(
    'zip_file',
    new Blob(['mock zip contents'], { type: 'application/zip' }),
    'shapefile.zip'
  )
}

const createLayerFormData = (
  overrides: {
    areaCol?: string
    colorCode?: string
    descriptionCol?: string
    idCol?: string
    indexingStrategy?: string
    isHidden?: boolean
    municipalityCol?: string
    name?: string
    nameCol?: string
    regionCol?: string
  } = {}
) => {
  const formData = new FormData()

  appendMockZipFile(formData)
  formData.append('name', overrides.name ?? 'Imported mock layer')
  formData.append('is_hidden', String(overrides.isHidden ?? false))
  formData.append('color_code', overrides.colorCode ?? '#123abc')
  formData.append(
    'indexing_strategy',
    overrides.indexingStrategy ?? 'name_municipality'
  )
  formData.append('name_col', overrides.nameCol ?? 'forest_name')
  formData.append(
    'municipality_col',
    overrides.municipalityCol ?? 'municipality_name'
  )
  formData.append('region_col', overrides.regionCol ?? 'region_name')
  formData.append(
    'description_col',
    overrides.descriptionCol ?? 'forest_description'
  )
  formData.append('area_col', overrides.areaCol ?? 'area_hectares')
  formData.append('id_col', overrides.idCol ?? 'external_id')

  return formData
}

const createPatchFormData = ({
  bulkAreaIds,
  bulkImageNames,
}: {
  bulkAreaIds: string[]
  bulkImageNames: string[]
}) => {
  const formData = new FormData()
  bulkImageNames.forEach((fileName) => {
    formData.append(
      'bulk_images',
      new Blob([`contents:${fileName}`], { type: 'image/jpeg' }),
      fileName
    )
  })
  bulkAreaIds.forEach((areaId) => formData.append('bulk_area_ids', areaId))
  return formData
}

const createAreaPatchFormData = (properties: Record<string, string>) => {
  const formData = new FormData()

  Object.entries(properties).forEach(([key, value]) => {
    formData.append(key, value)
  })

  return formData
}

const createMockApiRequest = ({
  body,
  method = 'GET',
  path,
  token = MOCK_AUTH_ACCESS_TOKEN,
}: {
  body?: BodyInit
  method?: string
  path: string
  token?: string | null
}) =>
  new Request(`https://map.example.org/api/luonnonmetsakartat${path}`, {
    body,
    headers: token ? createAuthHeaders(token) : undefined,
    method,
  })

const getLayerIdWithoutHyphens = (layerId: string) => layerId.replace(/-/g, '')

const createMockWfsPath = ({
  includeTypeName = true,
  layerId = 'mock-visible-layer',
  requestName = 'request',
  requestValue = 'GetFeature',
  typeName,
  typeNameParamName = 'typeName',
  workspace = 'mock',
}: {
  includeTypeName?: boolean
  layerId?: string
  requestName?: string
  requestValue?: string
  typeName?: string
  typeNameParamName?: string
  workspace?: string
} = {}) => {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '1.0.0',
    [requestName]: requestValue,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
  })

  if (includeTypeName) {
    params.set(
      typeNameParamName,
      typeName ??
        `${workspace}:forest_areas_${getLayerIdWithoutHyphens(
          layerId
        )}_centroid`
    )
  }

  return `/geoserver/${workspace}/ows?${params.toString()}`
}

const createMockTmsPath = ({
  layerId = 'mock-visible-layer',
  workspace = 'mock',
  z = 9,
  x = 278,
  y = 154,
}: {
  layerId?: string
  workspace?: string
  z?: number
  x?: number
  y?: number
} = {}) =>
  `/geoserver/gwc/service/tms/1.0.0/${workspace}:forest_areas_${getLayerIdWithoutHyphens(
    layerId
  )}@EPSG:900913@pbf/${z}/${x}/${y}.pbf`

describe('handleLuonnonmetsakartatDataProxyRequest', () => {
  beforeAll(() => {
    globalThis.ReadableStream =
      ReadableStream as unknown as typeof globalThis.ReadableStream
    globalThis.TextDecoder =
      TextDecoder as unknown as typeof globalThis.TextDecoder
    globalThis.TextEncoder =
      TextEncoder as unknown as typeof globalThis.TextEncoder
    globalThis.MessageChannel =
      MessageChannel as unknown as typeof globalThis.MessageChannel
    globalThis.MessagePort =
      MessagePort as unknown as typeof globalThis.MessagePort

    globalThis.Blob = NodeBlob as unknown as typeof Blob
    globalThis.File = NodeFile as unknown as typeof File

    const undici = jest.requireActual<typeof UndiciModule>('undici')

    globalThis.FormData = undici.FormData as unknown as typeof FormData
    globalThis.Headers = undici.Headers as unknown as typeof Headers
    globalThis.Request = undici.Request as unknown as typeof Request
    globalThis.Response = undici.Response as unknown as typeof Response
  })

  beforeEach(() => {
    resetLuonnonmetsakartatMockApiForTests()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    resetLuonnonmetsakartatMockApiForTests()
  })

  it('returns 500 without calling upstream when LUONNONMETSAKARTAT_API_URL is missing', async () => {
    const fetchFn = jest.fn<typeof fetch>()

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: new Request(
        'https://map.example.org/api/luonnonmetsakartat/layers'
      ),
      deps: {
        env: {},
        fetchFn,
      },
    })

    expect(response.status).toBe(500)
    expect(await response.text()).toBe(
      'LUONNONMETSAKARTAT_API_URL is not configured'
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('proxies GET requests to the matching upstream path and query', async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify([{ id: 'layer-1' }]), { status: 200 })
    )

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: new Request(
        'https://map.example.org/api/luonnonmetsakartat/layer/layer-1?include=stats',
        {
          headers: {
            Authorization: 'Bearer token-1',
          },
        }
      ),
      deps: {
        env: {
          LUONNONMETSAKARTAT_API_URL: 'https://forests.example.org/api/',
        },
        fetchFn,
      },
    })
    const init = fetchFn.mock.calls[0]?.[1]
    const headers = init?.headers as Headers

    expect(new URL(String(fetchFn.mock.calls[0]?.[0])).toString()).toBe(
      'https://forests.example.org/api/layer/layer-1?include=stats'
    )
    expect(init?.method).toBe('GET')
    expect(headers.get('authorization')).toBe('Bearer token-1')
    expect(response.status).toBe(200)
  })

  it('proxies request bodies and allowlisted headers when mock mode is disabled', async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ status: 'queued' }), { status: 202 })
    )

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: new Request(
        'https://map.example.org/api/luonnonmetsakartat/layer/layer-1',
        {
          body: JSON.stringify({ is_hidden: true }),
          headers: {
            Authorization: 'Bearer token-1',
            'Content-Type': 'application/json',
            Cookie: 'do-not-forward=true',
            'X-User-Agent': 'browser-agent',
          },
          method: 'PATCH',
        }
      ),
      deps: {
        env: {
          LUONNONMETSAKARTAT_API_URL: 'https://forests.example.org/api/',
        },
        fetchFn,
      },
    })
    const init = fetchFn.mock.calls[0]?.[1]
    const headers = init?.headers as Headers

    expect(new URL(String(fetchFn.mock.calls[0]?.[0])).toString()).toBe(
      'https://forests.example.org/api/layer/layer-1'
    )
    expect(init?.method).toBe('PATCH')
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(
      '{"is_hidden":true}'
    )
    expect(headers.get('authorization')).toBe('Bearer token-1')
    expect(headers.get('content-type')).toBe('application/json')
    expect(headers.get('x-user-agent')).toBe('browser-agent')
    expect(headers.has('cookie')).toBe(false)
    expect(response.status).toBe(202)
  })

  it('proxies GeoServer paths through the upstream API when mock mode is disabled', async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ proxied: true }), { status: 200 })
    )

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: {
          LUONNONMETSAKARTAT_API_URL: 'https://forests.example.org/api/',
        },
        fetchFn,
      },
    })
    const upstreamUrl = new URL(String(fetchFn.mock.calls[0]?.[0]))

    expect(upstreamUrl.origin + upstreamUrl.pathname).toBe(
      'https://forests.example.org/api/geoserver/mock/ows'
    )
    expect(upstreamUrl.searchParams.get('request')).toBe('GetFeature')
    expect(upstreamUrl.searchParams.get('typeName')).toBe(
      'mock:forest_areas_mockvisiblelayer_centroid'
    )
    expect(response.status).toBe(200)
  })

  it.each(['1', 'true', 'yes', 'on', ' TrUe '])(
    'refuses production mock API %s before protected mutation or proxy access',
    async (flag) => {
      const fetchFn = jest.fn<typeof fetch>(async () => {
        throw new Error('Unexpected upstream access')
      })
      const before = getLuonnonmetsakartatMockLayers()
      await expect(
        handleLuonnonmetsakartatDataProxyRequest({
          request: createMockApiRequest({
            path: '/layer',
            method: 'POST',
            body: createLayerFormData(),
          }),
          deps: {
            env: {
              LUONNONMETSAKARTAT_MOCK_API_ENABLED: flag,
              LUONNONMETSAKARTAT_API_URL: 'https://forests.example.org/api',
              NODE_ENV: 'production',
            },
            fetchFn,
          },
        })
      ).rejects.toThrow(
        'Luonnonmetsakartat mock API cannot be enabled when NODE_ENV=production'
      )
      expect(getLuonnonmetsakartatMockLayers()).toEqual(before)
      const createNext = async () => {
        const response = await handleLuonnonmetsakartatDataProxyRequest({
          request: createMockApiRequest({
            path: '/layer',
            method: 'POST',
            body: createLayerFormData(),
          }),
          deps: { env: mockEnv, fetchFn },
        })
        expect(response.status).toBe(201)
        return {
          dto: await readJson(response),
          state: getLuonnonmetsakartatMockLayers(),
        }
      }
      const afterRefusal = await createNext()
      resetLuonnonmetsakartatMockApiForTests()
      expect(await createNext()).toEqual(afterRefusal)
      expect(fetchFn).not.toHaveBeenCalled()
    }
  )

  it('guards the default production process environment before mock or live dispatch', async () => {
    const fetchFn = jest.fn<typeof fetch>(async () => {
      throw new Error('Unexpected upstream access')
    })
    const before = getLuonnonmetsakartatMockLayers()
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
      LUONNONMETSAKARTAT_MOCK_API_ENABLED: ' ON ',
    })
    await expect(
      handleLuonnonmetsakartatDataProxyRequest({
        request: createMockApiRequest({ path: '/layers', token: null }),
        deps: { fetchFn },
      })
    ).rejects.toThrow(
      'Luonnonmetsakartat mock API cannot be enabled when NODE_ENV=production'
    )
    expect(getLuonnonmetsakartatMockLayers()).toEqual(before)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it.each([undefined, '', '0', 'false', 'off', 'no', 'unknown'])(
    'uses the live proxy boundary in production when mock flag is %s',
    async (flag) => {
      const fetchFn = jest.fn<typeof fetch>(async () => {
        throw new Error('Unexpected upstream access')
      })
      const response = await handleLuonnonmetsakartatDataProxyRequest({
        request: createMockApiRequest({ path: '/layers', token: null }),
        deps: {
          env: {
            NODE_ENV: 'production',
            LUONNONMETSAKARTAT_MOCK_API_ENABLED: flag,
          },
          fetchFn,
        },
      })
      expect(response.status).toBe(500)
      expect(await response.text()).toBe(
        'LUONNONMETSAKARTAT_API_URL is not configured'
      )
      expect(fetchFn).not.toHaveBeenCalled()
    }
  )

  it('serves public mock layers without upstream config or auth', async () => {
    const fetchFn = jest.fn<typeof fetch>()

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: new Request(
        'https://map.example.org/api/luonnonmetsakartat/layers'
      ),
      deps: {
        env: mockEnv,
        fetchFn,
      },
    })
    const data = await readJson<MockLayerApiItem[]>(response)

    expect(response.status).toBe(200)
    expect(data.map((layer) => layer.id)).toEqual([
      'mock-visible-layer',
      'mock-empty-layer',
    ])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('serves visible mock WFS centroid features without auth', async () => {
    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const data = await readJson<MockWfsFeatureCollection>(response)
    const withPictures = data.features.find(
      (feature) => feature.properties.id === 'mock-visible-area-picture'
    )
    const withoutPictures = data.features.find(
      (feature) => feature.properties.id === 'mock-visible-area-no-picture'
    )
    const storedAreas =
      getLuonnonmetsakartatMockLayerAreas('mock-visible-layer')

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(data.type).toBe('FeatureCollection')
    expect(data.features.map((feature) => feature.id)).toEqual([
      'mock-visible-area-picture',
      'mock-visible-area-no-picture',
    ])
    expect(withPictures?.properties).toEqual(
      expect.objectContaining({
        id: 'mock-visible-area-picture',
        name: 'Mock Ridge Forest',
        municipality: 'Espoo',
        region: 'Uusimaa',
        description: 'Old spruce stand with a small wetland edge.',
        date: '2025-05-10',
        area_ha: 12.34,
        created_ts: '2025-01-01T00:00:00.000Z',
        updated_ts: '2025-01-02T00:00:00.000Z',
        layer_id: 'mock-visible-layer',
      })
    )
    expect(withPictures?.geometry.type).toBe('Point')
    expect(withPictures?.geometry.coordinates[0]).toBeCloseTo(24.853, 6)
    expect(withPictures?.geometry.coordinates[1]).toBeCloseTo(60.2225, 6)
    expect(JSON.parse(withPictures?.properties.pictures ?? '[]')).toEqual([
      'https://example.org/mock/forest-ridge-1.jpg',
      'https://example.org/mock/forest-ridge-2.jpg',
    ])
    expect(withoutPictures?.properties).toEqual(
      expect.objectContaining({
        id: 'mock-visible-area-no-picture',
        municipality: 'Lohja',
        region: 'Uusimaa',
        date: '2024-09-18',
        area_ha: 7.89,
      })
    )
    expect(withoutPictures?.properties.pictures).toBeUndefined()
    expect(storedAreas?.features[0].geometry.type).toBe('Polygon')
  })

  it('serves empty mock WFS layers as empty FeatureCollections', async () => {
    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-empty-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const data = await readJson<MockWfsFeatureCollection>(response)

    expect(response.status).toBe(200)
    expect(data).toEqual({
      type: 'FeatureCollection',
      features: [],
    })
  })

  it('resolves mock WFS typeName tokens for newly created layers', async () => {
    await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        body: createLayerFormData({
          isHidden: false,
          name: 'WFS uploaded forests',
        }),
        method: 'POST',
        path: '/layer',
      }),
      deps: {
        env: mockEnv,
      },
    })

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({
          layerId: 'mock-created-layer-1',
          requestName: 'REQUEST',
          requestValue: 'getfeature',
          typeNameParamName: 'typename',
        }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const data = await readJson<MockWfsFeatureCollection>(response)

    expect(response.status).toBe(200)
    expect(data.features.map((feature) => feature.properties.id)).toEqual([
      'mock-created-layer-1-area-1',
      'mock-created-layer-1-area-2',
    ])
    expect(data.features[0].properties).toEqual(
      expect.objectContaining({
        layer_id: 'mock-created-layer-1',
        name: 'WFS uploaded forests mock area 1',
      })
    )
  })

  it('reflects mock picture attachments and area patches through WFS', async () => {
    await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        body: createPatchFormData({
          bulkAreaIds: ['mock-visible-area-no-picture'],
          bulkImageNames: ['wfs upload.jpg'],
        }),
        method: 'PATCH',
        path: '/layer/mock-visible-layer',
      }),
      deps: {
        env: mockEnv,
      },
    })
    await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        body: createAreaPatchFormData({
          description: 'WFS-visible edited description',
          municipality: 'Kauniainen',
          name: 'WFS Edited Ridge Forest',
        }),
        method: 'PATCH',
        path: '/layer/mock-visible-layer/area/mock-visible-area-picture',
      }),
      deps: {
        env: mockEnv,
      },
    })

    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const data = await readJson<MockWfsFeatureCollection>(response)
    const patchedArea = data.features.find(
      (feature) => feature.properties.id === 'mock-visible-area-picture'
    )
    const areaWithUploadedPicture = data.features.find(
      (feature) => feature.properties.id === 'mock-visible-area-no-picture'
    )

    expect(response.status).toBe(200)
    expect(patchedArea?.properties).toEqual(
      expect.objectContaining({
        description: 'WFS-visible edited description',
        municipality: 'Kauniainen',
        name: 'WFS Edited Ridge Forest',
        updated_ts: '2025-02-01T00:03:00.000Z',
      })
    )
    expect(
      JSON.parse(areaWithUploadedPicture?.properties.pictures ?? '[]')
    ).toEqual([
      'https://example.org/mock/uploads/mock-visible-layer/mock-visible-area-no-picture/1-wfs%20upload.jpg',
    ])
    const removePictures = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: '/layer/mock-visible-layer/area/mock-visible-area-no-picture',
        method: 'PATCH',
        body: createAreaPatchFormData({ pictures: '[]' }),
      }),
      deps: { env: mockEnv },
    })
    expect(removePictures.status).toBe(200)
    const afterRemoval = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath(),
        token: null,
      }),
      deps: { env: mockEnv },
    })
    expect(afterRemoval.status).toBe(200)
    const removed = await readJson<MockWfsFeatureCollection>(afterRemoval)
    expect(
      removed.features.find(
        (feature) => feature.properties.id === 'mock-visible-area-no-picture'
      )?.properties.pictures
    ).toBe('[]')

  })

  it('applies mock WFS visibility and auth rules', async () => {
    const publicHiddenResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-hidden-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const adminHiddenResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-hidden-layer' }),
      }),
      deps: {
        env: mockEnv,
      },
    })
    const rejectedResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-visible-layer' }),
        token: MOCK_AUTH_REJECTED_ACCESS_TOKEN,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const unknownResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockWfsPath({ layerId: 'mock-visible-layer' }),
        token: 'unknown-token',
      }),
      deps: {
        env: mockEnv,
      },
    })
    const adminHiddenData = await readJson<MockWfsFeatureCollection>(
      adminHiddenResponse
    )

    expect(publicHiddenResponse.status).toBe(404)
    expect(await readJson(publicHiddenResponse)).toEqual({
      error: 'Mock WFS layer not found',
    })
    expect(adminHiddenResponse.status).toBe(200)
    expect(adminHiddenData.features.map((feature) => feature.id)).toEqual([
      'mock-hidden-area',
    ])
    expect(rejectedResponse.status).toBe(403)
    expect(await readJson(rejectedResponse)).toEqual({
      error: 'Mock admin access rejected',
      is_editor: false,
      is_admin: false,
    })
    expect(unknownResponse.status).toBe(401)
    expect(await readJson(unknownResponse)).toEqual({
      error: 'Mock admin authorization required',
      is_editor: false,
      is_admin: false,
    })
  })

  it('returns deterministic mock WFS errors for invalid requests', async () => {
    const missingTypeNameResponse =
      await handleLuonnonmetsakartatDataProxyRequest({
        request: createMockApiRequest({
          path: createMockWfsPath({ includeTypeName: false }),
          token: null,
        }),
        deps: {
          env: mockEnv,
        },
      })
    const unknownTypeNameResponse =
      await handleLuonnonmetsakartatDataProxyRequest({
        request: createMockApiRequest({
          path: createMockWfsPath({
            typeName: 'mock:forest_areas_unknownlayer_centroid',
          }),
          token: null,
        }),
        deps: {
          env: mockEnv,
        },
      })
    const unsupportedRequestResponse =
      await handleLuonnonmetsakartatDataProxyRequest({
        request: createMockApiRequest({
          path: createMockWfsPath({ requestValue: 'DescribeFeatureType' }),
          token: null,
        }),
        deps: {
          env: mockEnv,
        },
      })
    const methodResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        method: 'POST',
        path: createMockWfsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })

    expect(missingTypeNameResponse.status).toBe(400)
    expect(await readJson(missingTypeNameResponse)).toEqual({
      error: 'Missing mock WFS typeName',
    })
    expect(unknownTypeNameResponse.status).toBe(404)
    expect(await readJson(unknownTypeNameResponse)).toEqual({
      error: 'Mock WFS layer not found',
    })
    expect(unsupportedRequestResponse.status).toBe(400)
    expect(await readJson(unsupportedRequestResponse)).toEqual({
      error: 'Unsupported mock WFS request',
    })
    expect(methodResponse.status).toBe(405)
    expect(await readJson(methodResponse)).toEqual({
      error: 'Method not allowed',
    })
  })

  it('serves empty mock vector tiles for GWC TMS PBF requests', async () => {
    const getResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        path: createMockTmsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const headResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        method: 'HEAD',
        path: createMockTmsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })
    const methodResponse = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({
        method: 'PUT',
        path: createMockTmsPath({ layerId: 'mock-visible-layer' }),
        token: null,
      }),
      deps: {
        env: mockEnv,
      },
    })

    expect(getResponse.status).toBe(200)
    expect(getResponse.headers.get('content-type')).toBe(
      'application/vnd.mapbox-vector-tile'
    )
    expect((await getResponse.arrayBuffer()).byteLength).toBe(0)
    expect(headResponse.status).toBe(200)
    expect(headResponse.headers.get('content-type')).toBe(
      'application/vnd.mapbox-vector-tile'
    )
    expect((await headResponse.arrayBuffer()).byteLength).toBe(0)
    expect(methodResponse.status).toBe(405)
    expect(await readJson(methodResponse)).toEqual({
      error: 'Method not allowed',
    })
  })

  it('dispatches verified mock requests without upstream access', async () => {
    const fetchFn = jest.fn<typeof fetch>(async () => {
      throw new Error('Unexpected upstream access')
    })
    const response = await handleLuonnonmetsakartatDataProxyRequest({
      request: createMockApiRequest({ path: '/layers' }),
      deps: { env: mockEnv, fetchFn },
    })
    expect(response.status).toBe(200)
    expect(
      (await readJson<MockLayerApiItem[]>(response)).map((layer) => layer.id)
    ).toEqual(['mock-visible-layer', 'mock-hidden-layer', 'mock-empty-layer'])
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
