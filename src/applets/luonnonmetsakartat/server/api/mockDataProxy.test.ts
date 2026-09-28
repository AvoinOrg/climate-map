/** @jest-environment node */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import {
  MOCK_AUTH_ACCESS_TOKEN,
  MOCK_AUTH_REJECTED_ACCESS_TOKEN,
} from '#/common/auth/mock'
import type { FolayerFeature } from 'applets/luonnonmetsakartat/common/types'
import type { LuonnonmetsakartatMockLayerRecord } from 'applets/luonnonmetsakartat/common/mockDataSeed'
import {
  handleLuonnonmetsakartatMockApiRequest as handle,
  isLuonnonmetsakartatMockApiEnabled as enabled,
} from './mockDataProxy'
import {
  getLuonnonmetsakartatMockLayer as get,
  getLuonnonmetsakartatMockLayerAreas as areas,
  getLuonnonmetsakartatMockLayers as list,
  resetLuonnonmetsakartatMockApiForTests as reset,
} from './mockDataStore'

type LayerDto = Omit<LuonnonmetsakartatMockLayerRecord, 'areas'>
const layerId = 'mock-visible-layer'
const areaId = 'mock-visible-area-picture'
const layerPath = `/layer/${layerId}`
const areaPath = `${layerPath}/area/${areaId}`
const verified = `Bearer ${MOCK_AUTH_ACCESS_TOKEN}`
const rejected = `Bearer ${MOCK_AUTH_REJECTED_ACCESS_TOKEN}`
const form = (fields: Record<string, string | Blob> = {}) => {
  const data = new FormData()
  Object.entries(fields).forEach(([key, value]) => data.append(key, value))
  return data
}
const createForm = (): FormData =>
  form({
    name: ' Uploaded forests ',
    color_code: ' #abcdef ',
    is_hidden: 'true',
    indexing_strategy: 'name_municipality',
    name_col: ' forest_name ',
    municipality_col: 'municipality_name',
    region_col: 'region_name',
    description_col: 'forest_description',
    area_col: 'area_hectares',
    id_col: 'external_id',
  })
const pictureForm = () => {
  const data = form({ name: 'Metadata and pictures' })
  data.append('bulk_images', new Blob(['not decoded']), 'ridge new.jpg')
  data.append('bulk_area_ids', areaId)
  return data
}
const replacementForm = () =>
  form({
    zip_file: new Blob(['not a shapefile archive']),
    delete_areas_not_updated: 'true',
    name: 'Replacement',
  })
// Authorization is required at the call site; undefined explicitly means anonymous.
const request = ({
  path,
  authorization,
  method = 'GET',
  body,
}: {
  path: string
  authorization: string | undefined
  method?: string
  body?: BodyInit
}) =>
  handle({
    request: new Request(`https://example.org/api/luonnonmetsakartat${path}`, {
      method,
      body,
      headers: authorization === undefined ? undefined : { authorization },
    }),
  })
const json = async <T = unknown>(response: Response) =>
  (await response.json()) as T
const denial = (status: number) => ({
  error:
    status === 403
      ? 'Mock admin access rejected'
      : 'Mock admin authorization required',
  is_editor: false,
  is_admin: false,
})
const expectError = async (
  response: Response,
  expected: { status: number; error: string }
) => {
  expect(response.status).toBe(expected.status)
  expect(response.headers.get('content-type')).toBe('application/json')
  expect(await json(response)).toEqual({ error: expected.error })
}
const nextSuccess = async () => {
  const created = await request({
    path: '/layer',
    authorization: verified,
    method: 'POST',
    body: createForm(),
  })
  expect(created.status).toBe(201)
  const updated = await request({
    path: layerPath,
    authorization: verified,
    method: 'PATCH',
    body: form({ name: 'Next update' }),
  })
  expect(updated.status).toBe(200)
  return {
    created: await json(created),
    updated: await json(updated),
    state: list(),
  }
}
// Snapshot the whole store, then compare future successes with an equivalent clean replay.
const expectNoMutation = async (operation: () => Promise<void>) => {
  const before = list()
  await operation()
  expect(list()).toEqual(before)
  const afterFailure = await nextSuccess()
  reset()
  expect(await nextSuccess()).toEqual(afterFailure)
}

beforeEach(() => {
  reset()
  jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('Unexpected network request')
  })
})
afterEach(() => {
  try {
    expect(globalThis.fetch).not.toHaveBeenCalled()
  } finally {
    jest.restoreAllMocks()
    reset()
  }
})

describe('mock API authorization and projections', () => {
  it('projects anonymous visible layers and editor hidden/admin metadata, following visibility changes', async () => {
    const publicResponse = await request({
      path: '/layers',
      authorization: undefined,
    })
    expect(publicResponse.status).toBe(200)
    const publicLayers = await json<LayerDto[]>(publicResponse)
    expect(publicLayers.map((layer) => layer.id)).toEqual([
      layerId,
      'mock-empty-layer',
    ])
    expect(publicLayers[0]).toEqual({
      id: layerId,
      name: 'Mock visible forest layer',
      description: 'Deterministic visible luonnonmetsa mock layer.',
      color_code: '#2f855a',
      created_ts: 1_735_689_600,
      updated_ts: 1_735_776_000,
    })
    publicLayers.forEach((layer) => {
      expect(layer).not.toHaveProperty('is_hidden')
      expect(layer).not.toHaveProperty('col_options')
      expect(layer).not.toHaveProperty('areas')
    })
    const adminResponse = await request({
      path: '/layers',
      authorization: verified,
    })
    expect(adminResponse.status).toBe(200)
    const admin = await json<LayerDto[]>(adminResponse)
    expect(admin.map((layer) => layer.id)).toEqual([
      layerId,
      'mock-hidden-layer',
      'mock-empty-layer',
    ])
    expect(admin[1]).toMatchObject({
      is_hidden: true,
      col_options: {
        indexingStrategy: 'id',
        nameCol: 'name',
        municipalityCol: 'municipality',
      },
    })
    admin.forEach((layer) => {
      expect(layer.col_options).toBeDefined()
      expect(layer).not.toHaveProperty('areas')
    })
    expect(
      await json(await request({ path: layerPath, authorization: verified }))
    ).toEqual(admin[0])
    expect(
      (
        await request({
          path: layerPath,
          method: 'PATCH',
          authorization: verified,
          body: form({ is_hidden: 'true' }),
        })
      ).status
    ).toBe(200)
    expect(
      (
        await json<LayerDto[]>(
          await request({ path: '/layers', authorization: undefined })
        )
      ).map((layer) => layer.id)
    ).toEqual(['mock-empty-layer'])
    expect(
      (
        await request({
          path: '/layer/mock-hidden-layer',
          method: 'PATCH',
          authorization: verified,
          body: form({ is_hidden: 'false' }),
        })
      ).status
    ).toBe(200)
    expect(
      (
        await json<LayerDto[]>(
          await request({ path: '/layers', authorization: undefined })
        )
      ).map((layer) => layer.id)
    ).toEqual(['mock-hidden-layer', 'mock-empty-layer'])
  })

  it.each<[string, string | undefined, number]>([
    ['missing', undefined, 401],
    ['rejected', rejected, 403],
    ['unknown', 'Bearer unknown-token', 401],
    ['empty', '', 401],
    ['bare bearer', 'Bearer', 401],
    ['non-bearer', 'Basic abc', 401],
    ['extra token', `${verified} extra`, 401],
    ['verified', verified, 200],
    ['normalized', `  bEaReR   ${MOCK_AUTH_ACCESS_TOKEN}  `, 200],
  ])(
    'validates %s authorization and never downgrades an authenticated list request',
    async (_label, authorization, status) => {
      const validation = await request({
        path: '/admin/validate',
        authorization,
      })
      expect(validation.status).toBe(status)
      expect(await json(validation)).toEqual(
        status === 200 ? { is_editor: true, is_admin: true } : denial(status)
      )
      const detail = await request({ path: layerPath, authorization })
      expect(detail.status).toBe(status)
      if (status !== 200) expect(await json(detail)).toEqual(denial(status))
      const layers = await request({ path: '/layers', authorization })
      expect(layers.status).toBe(authorization === undefined ? 200 : status)
      if (authorization !== undefined && status !== 200)
        expect(await json(layers)).toEqual(denial(status))
    }
  )

  describe.each<[string, string, string, () => BodyInit | undefined]>([
    ['create', 'POST', '/layer', createForm],
    ['metadata', 'PATCH', layerPath, () => form({ name: 'Changed' })],
    ['replacement', 'PATCH', layerPath, replacementForm],
    ['pictures', 'PATCH', layerPath, pictureForm],
    ['area', 'PATCH', areaPath, () => form({ name: 'Changed' })],
    ['delete', 'DELETE', layerPath, () => undefined],
    ['unreadable body', 'POST', '/layer', () => '{ invalid multipart'],
    [
      'unknown layer',
      'PATCH',
      '/layer/missing',
      () => form({ name: 'Changed' }),
    ],
  ])('protected %s', (_label, method, path, body) => {
    it.each<[string | undefined, number]>([
      [undefined, 401],
      [rejected, 403],
      ['Bearer unknown', 401],
    ])(
      'denies %s before parsing or mutation with status %s and unchanged counters',
      async (authorization, status) => {
        await expectNoMutation(async () => {
          const response = await request({
            path,
            method,
            authorization,
            body: body(),
          })
          expect(response.status).toBe(status)
          expect(await json(response)).toEqual(denial(status))
        })
      }
    )
  })
})

describe('mock HTTP layer lifecycle and form parsing', () => {
  it.each(['id', 'name_municipality'])(
    'creates and reads %s columns with synthetic areas, without interpreting or requiring ZIP bytes',
    async (strategy) => {
      const data = createForm()
      data.set('indexing_strategy', strategy)
      const response = await request({
        path: '/layer',
        method: 'POST',
        authorization: verified,
        body: data,
      })
      expect(response.status).toBe(201)
      const created = await json<LayerDto>(response)
      expect(created).toEqual({
        id: 'mock-created-layer-1',
        name: 'Uploaded forests',
        description: '',
        color_code: '#abcdef',
        is_hidden: true,
        created_ts: 1_735_779_660,
        updated_ts: 1_735_779_660,
        col_options: {
          indexingStrategy: strategy,
          idCol: 'external_id',
          nameCol: 'forest_name',
          municipalityCol: 'municipality_name',
          regionCol: 'region_name',
          descriptionCol: 'forest_description',
          areaCol: 'area_hectares',
        },
      })
      expect(
        await json(
          await request({
            path: `/layer/${created.id}`,
            authorization: verified,
          })
        )
      ).toEqual(created)
      expect(
        await json(await request({ path: '/layers', authorization: verified }))
      ).toEqual(expect.arrayContaining([created]))
      expect(areas(created.id)!.features.map((feature) => feature.id)).toEqual([
        `${created.id}-area-1`,
        `${created.id}-area-2`,
      ])
      data.delete('id_col')
      data.set('description', ' Optional description ')
      data.set('zip_file', new Blob(['invalid archive']))
      const noIdColumn = await request({
        path: '/layer',
        method: 'POST',
        authorization: verified,
        body: data,
      })
      expect(noIdColumn.status).toBe(201)
      const next = await json<LayerDto>(noIdColumn)
      expect(next.description).toBe('Optional description')
      expect(next.col_options).not.toHaveProperty('idCol')
      expect(areas(next.id)!.features).toHaveLength(2)
    }
  )

  describe.each([
    'name',
    'color_code',
    'is_hidden',
    'indexing_strategy',
    'name_col',
    'municipality_col',
  ])('required %s', (field) => {
    it.each(['missing', 'blank', 'file'])(
      'rejects %s without state or counter changes',
      async (kind) => {
        const data = createForm()
        if (kind === 'missing') data.delete(field)
        else data.set(field, kind === 'blank' ? '  ' : new Blob(['file']))
        await expectNoMutation(async () =>
          expectError(
            await request({
              path: '/layer',
              authorization: verified,
              method: 'POST',
              body: data,
            }),
            {
              status: 400,
              error: `${kind === 'file' ? 'Expected string' : 'Missing required'} form field: ${field}`,
            }
          )
        )
      }
    )
  })

  it.each<[string, string | Blob, string]>([
    ['is_hidden', 'maybe', 'Invalid boolean form field: is_hidden'],
    ['indexing_strategy', 'unknown', 'Invalid indexing_strategy form field'],
    ...[
      'description',
      'region_col',
      'description_col',
      'area_col',
      'id_col',
    ].map<[string, Blob, string]>((key) => [
      key,
      new Blob(['file']),
      `Expected string form field: ${key}`,
    ]),
  ])('rejects invalid create %s', async (field, value, error) => {
    const data = createForm()
    data.set(field, value)
    await expectNoMutation(async () =>
      expectError(
        await request({
          path: '/layer',
          authorization: verified,
          method: 'POST',
          body: data,
        }),
        { status: 400, error }
      )
    )
  })

  it.each<[string, boolean]>([
    ['1', true],
    ['true', true],
    ['yes', true],
    ['on', true],
    [' TrUe ', true],
    ['0', false],
    ['false', false],
    ['no', false],
    ['off', false],
    [' OFF ', false],
  ])('accepts normalized boolean %s as %s', async (value, expected) => {
    const response = await request({
      path: layerPath,
      authorization: verified,
      method: 'PATCH',
      body: form({ is_hidden: value, delete_areas_not_updated: value }),
    })
    expect(response.status).toBe(200)
    expect((await json<LayerDto>(response)).is_hidden).toBe(expected)
    expect(get(layerId)!.is_hidden).toBe(expected)
  })

  it('preserves omitted metadata and columns, treats blank metadata as omitted, and clears explicit optional columns', async () => {
    const before = get(layerId)!
    const response = await request({
      path: layerPath,
      method: 'PATCH',
      authorization: verified,
      body: form({
        name: ' Renamed ',
        description: '  ',
        color_code: '',
        is_hidden: ' ',
        delete_areas_not_updated: '',
      }),
    })
    expect(response.status).toBe(200)
    expect(get(layerId)).toEqual({
      ...before,
      name: 'Renamed',
      updated_ts: 1_735_779_660,
    })
    const changed = await request({
      path: layerPath,
      method: 'PATCH',
      authorization: verified,
      body: form({
        name_col: ' new_name ',
        id_col: '',
        region_col: ' ',
        description_col: '',
        area_col: '',
        description: ' New description ',
      }),
    })
    expect(changed.status).toBe(200)
    expect(await json(changed)).toMatchObject({
      description: 'New description',
      created_ts: before.created_ts,
      col_options: {
        indexingStrategy: 'name_municipality',
        nameCol: 'new_name',
        municipalityCol: 'municipality',
      },
    })
    expect(get(layerId)!.col_options).toEqual({
      indexingStrategy: 'name_municipality',
      nameCol: 'new_name',
      municipalityCol: 'municipality',
    })
    expect(areas(layerId)).toEqual(before.areas)
  })

  it.each(['true', 'false', undefined])(
    'preserves seeded areas with an uninterpreted ZIP when delete_areas_not_updated is %s',
    async (flag) => {
      const before = get(layerId)!
      const data = form({
        zip_file: new Blob(['not an archive']),
        name: 'Patched forests',
        color_code: '#654321',
        is_hidden: 'true',
        indexing_strategy: 'id',
        id_col: 'patched_id',
        name_col: 'patched_name',
        municipality_col: 'patched_municipality',
        region_col: 'patched_region',
        description_col: 'patched_description',
        area_col: 'patched_area',
      })
      if (flag !== undefined) data.set('delete_areas_not_updated', flag)
      const response = await request({
        path: layerPath,
        method: 'PATCH',
        authorization: verified,
        body: data,
      })
      expect(response.status).toBe(200)
      expect(await json(response)).toEqual({
        id: layerId,
        name: 'Patched forests',
        color_code: '#654321',
        is_hidden: true,
        description: before.description,
        created_ts: 1_735_689_600,
        updated_ts: 1_735_779_660,
        col_options: {
          indexingStrategy: 'id',
          idCol: 'patched_id',
          nameCol: 'patched_name',
          municipalityCol: 'patched_municipality',
          regionCol: 'patched_region',
          descriptionCol: 'patched_description',
          areaCol: 'patched_area',
        },
      })
      expect(areas(layerId)).toEqual(before.areas)
    }
  )

  it.each<[string, string | Blob, string]>([
    [
      'delete_areas_not_updated',
      'invalid',
      'Invalid boolean form field: delete_areas_not_updated',
    ],
    [
      'delete_areas_not_updated',
      new Blob(['file']),
      'Expected string form field: delete_areas_not_updated',
    ],
    ['is_hidden', 'invalid', 'Invalid boolean form field: is_hidden'],
    ['name_col', '', 'Missing required form field: name_col'],
    ['municipality_col', '', 'Missing required form field: municipality_col'],
    ['indexing_strategy', '', 'Missing required form field: indexing_strategy'],
    ['indexing_strategy', 'unknown', 'Invalid indexing_strategy form field'],
    ...[
      'name',
      'description',
      'color_code',
      'is_hidden',
      'indexing_strategy',
      'name_col',
      'municipality_col',
      'region_col',
      'description_col',
      'area_col',
      'id_col',
    ].map<[string, Blob, string]>((key) => [
      key,
      new Blob(['file']),
      `Expected string form field: ${key}`,
    ]),
  ])(
    'rejects malformed PATCH %s atomically with otherwise valid metadata and pictures',
    async (field, value, error) => {
      const data = pictureForm()
      data.set(field, value)
      await expectNoMutation(async () =>
        expectError(
          await request({
            path: layerPath,
            method: 'PATCH',
            authorization: verified,
            body: data,
          }),
          { status: 400, error }
        )
      )
    }
  )

  describe.each([
    ['POST', '/layer'],
    ['PATCH', layerPath],
    ['PATCH', areaPath],
  ])('unreadable %s %s', (method, path) => {
    it.each(['application/json', 'multipart/form-data; boundary=missing'])(
      'rejects %s without mutations',
      async (contentType) => {
        await expectNoMutation(async () =>
          expectError(
            await handle({
              request: new Request(
                `https://example.org/api/luonnonmetsakartat${path}`,
                {
                  method,
                  headers: {
                    authorization: verified,
                    'content-type': contentType,
                  },
                  body: '{}',
                }
              ),
            }),
            { status: 400, error: 'Expected multipart form data' }
          )
        )
      }
    )
  })

  it('deletes layer and area data with deterministic repeated-delete and detail errors', async () => {
    const original = list()
    const created = await json<LayerDto>(
      await request({
        path: '/layer',
        method: 'POST',
        authorization: verified,
        body: createForm(),
      })
    )
    const path = `/layer/${created.id}`
    const response = await request({
      path,
      method: 'DELETE',
      authorization: verified,
    })
    expect(response.status).toBe(200)
    expect(await json(response)).toEqual({ id: created.id, deleted: true })
    expect(areas(created.id)).toBeNull()
    expect(get(created.id)).toBeNull()
    expect(list()).toEqual(original)
    expect(
      (
        await json<LayerDto[]>(
          await request({ path: '/layers', authorization: verified })
        )
      ).some((layer) => layer.id === created.id)
    ).toBe(false)
    for (const method of ['GET', 'DELETE'])
      await expectError(
        await request({ path, method, authorization: verified }),
        { status: 404, error: 'Mock layer not found' }
      )
  })
})

describe('area and picture metadata HTTP contracts', () => {
  it('patches editable area strings while preserving protected fields, geometry and neighbors', async () => {
    const before = areas(layerId)!
    const editable = {
      name: 'Edited Ridge Forest',
      description: '',
      municipality: 'Helsinki',
      region: 'Edited region',
      date: '',
      pictures: '[]',
    }
    const response = await request({
      path: areaPath,
      method: 'PATCH',
      authorization: verified,
      body: form({
        ...editable,
        id: 'bad',
        created_ts: 'bad',
        updated_ts: 'bad',
        layer_id: 'bad',
        area_ha: '999',
        geometry: 'bad',
      }),
    })
    expect(response.status).toBe(200)
    const feature = await json<FolayerFeature>(response)
    expect(feature).toEqual({
      ...before.features[0],
      properties: {
        ...before.features[0].properties,
        ...editable,
        updated_ts: '2025-02-01T00:01:00.000Z',
      },
    })
    expect(areas(layerId)!.features).toEqual([feature, before.features[1]])
  })

  it('rejects a file-valued area property without applying earlier valid fields', async () => {
    await expectNoMutation(async () =>
      expectError(
        await request({
          path: areaPath,
          method: 'PATCH',
          authorization: verified,
          body: form({ name: 'Would change', pictures: new Blob(['file']) }),
        }),
        { status: 400, error: 'Expected string area property field: pictures' }
      )
    )
  })

  it('attaches ordered filename URL metadata, then replaces and removes the picture list without storage operations', async () => {
    const before = areas(layerId)!
    const hidden = get('mock-hidden-layer')
    const data = pictureForm()
    data.append('bulk_images', new Blob(['bytes ignored']), 'ä & #.jpg')
    data.append('bulk_area_ids', ` ${areaId} `)
    data.append('bulk_images', new Blob(['bytes ignored']), 'other.jpg')
    data.append('bulk_area_ids', 'mock-visible-area-no-picture')
    const response = await request({
      path: layerPath,
      method: 'PATCH',
      authorization: verified,
      body: data,
    })
    expect(response.status).toBe(200)
    expect(await json(response)).toMatchObject({
      name: 'Metadata and pictures',
      updated_ts: 1_735_779_720,
    })
    const expectedPictures = [
      ...JSON.parse(before.features[0].properties.pictures!),
      `https://example.org/mock/uploads/${layerId}/${areaId}/1-ridge%20new.jpg`,
      `https://example.org/mock/uploads/${layerId}/${areaId}/2-%C3%A4%20%26%20%23.jpg`,
    ]
    expect(
      JSON.parse(areas(layerId)!.features[0].properties.pictures!)
    ).toEqual(expectedPictures)
    expect(
      JSON.parse(areas(layerId)!.features[1].properties.pictures!)
    ).toEqual([
      `https://example.org/mock/uploads/${layerId}/mock-visible-area-no-picture/3-other.jpg`,
    ])
    expect(
      areas(layerId)!.features.map((feature) => feature.properties.updated_ts)
    ).toEqual(['2025-02-01T00:01:00.000Z', '2025-02-01T00:01:00.000Z'])
    for (const pictures of [JSON.stringify([expectedPictures[0]]), '[]']) {
      const edited = await request({
        path: areaPath,
        method: 'PATCH',
        authorization: verified,
        body: form({ pictures }),
      })
      expect(edited.status).toBe(200)
      expect((await json<FolayerFeature>(edited)).properties.pictures).toBe(
        pictures
      )
      expect(areas(layerId)!.features[0].properties.pictures).toBe(pictures)
    }
    expect(get('mock-hidden-layer')).toEqual(hidden)
  })

  it.each([
    'images only',
    'IDs only',
    'unequal',
    'non-file image',
    'file ID',
    'blank ID',
    'unknown target',
    'mixed valid and unknown',
  ])(
    'rejects %s picture batch before metadata, pictures or counters change',
    async (kind) => {
      const data = pictureForm()
      if (kind === 'images only') data.delete('bulk_area_ids')
      if (kind === 'IDs only') data.delete('bulk_images')
      if (kind === 'unequal') data.append('bulk_area_ids', areaId)
      if (kind === 'non-file image') data.set('bulk_images', 'not a file')
      if (kind === 'file ID') data.set('bulk_area_ids', new Blob(['id']))
      if (kind === 'blank ID') data.set('bulk_area_ids', '  ')
      if (kind === 'unknown target') data.set('bulk_area_ids', 'missing')
      if (kind === 'mixed valid and unknown') {
        data.append('bulk_images', new Blob(['file']), 'missing.jpg')
        data.append('bulk_area_ids', 'missing')
      }
      const missing =
        kind === 'unknown target' || kind === 'mixed valid and unknown'
      const unaligned = ['images only', 'IDs only', 'unequal'].includes(kind)
      await expectNoMutation(async () =>
        expectError(
          await request({
            path: layerPath,
            method: 'PATCH',
            authorization: verified,
            body: data,
          }),
          {
            status: missing ? 404 : 400,
            error: missing
              ? 'Mock area not found'
              : unaligned
                ? 'bulk_images and bulk_area_ids must be aligned'
                : 'bulk_images must be files and bulk_area_ids must be strings',
          }
        )
      )
    }
  )
})

describe('mock routes, methods and encodings', () => {
  const wrongMethods = [
    ['/admin/validate', ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']],
    ['/layers', ['POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']],
    ['/layer', ['PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']],
    [layerPath, ['POST', 'PUT', 'HEAD', 'OPTIONS']],
    [areaPath, ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']],
  ] as const
  it.each(
    wrongMethods.flatMap(([path, methods]) =>
      methods.map((method) => ({ path, method }))
    )
  )(
    'returns 405 for $method $path before authorization',
    async ({ path, method }) => {
      await expectNoMutation(async () =>
        expectError(await request({ path, method, authorization: undefined }), {
          status: 405,
          error: 'Method not allowed',
        })
      )
    }
  )

  it.each<[string, string, number, string]>([
    ['GET', '/layer', 400, 'Missing required layer id'],
    ['GET', '/layer/', 400, 'Missing required layer id'],
    ['GET', '/layer/missing', 404, 'Mock layer not found'],
    ['PATCH', '/layer/missing', 404, 'Mock layer not found'],
    ['DELETE', '/layer/missing', 404, 'Mock layer not found'],
    ['PATCH', '/layer/missing/area/unknown', 404, 'Mock layer not found'],
    ['PATCH', `${layerPath}/area/missing`, 404, 'Mock area not found'],
  ])(
    'returns deterministic %s %s errors without mutation',
    async (method, path, status, error) => {
      await expectNoMutation(async () =>
        expectError(
          await request({
            path,
            method,
            authorization: verified,
            body: method === 'PATCH' ? form({ name: 'Edit' }) : undefined,
          }),
          { status, error }
        )
      )
    }
  )

  it.each([
    '/outside',
    '/api/luonnonmetsakartat-lookalike/layers',
    '/api/luonnonmetsakartat',
    '/api/luonnonmetsakartat/',
    '/api/luonnonmetsakartat/unknown',
    '/api/luonnonmetsakartat/layers/',
    '/api/luonnonmetsakartat/admin/validate/',
    `/api/luonnonmetsakartat${layerPath}/extra`,
    `/api/luonnonmetsakartat${areaPath}/extra`,
  ])('returns deterministic JSON for unsupported path %s', async (path) => {
    await expectNoMutation(async () =>
      expectError(
        await handle({ request: new Request(`https://example.org${path}`) }),
        {
          status: 404,
          error:
            path === '/outside' || path.includes('-lookalike')
              ? 'Mock proxy path is missing'
              : 'Unsupported Luonnonmetsakartat mock API endpoint',
        }
      )
    )
  })

  it.each([
    [
      '/geoserver/wms',
      'Unsupported Luonnonmetsakartat mock GeoServer endpoint',
    ],
    [
      '/geoserver/other/ows?request=GetFeature',
      'Unsupported mock GeoServer workspace',
    ],
    [
      '/geoserver/gwc/service/tms/bad',
      'Unsupported mock GeoServer TMS endpoint',
    ],
    [
      '/geoserver/gwc/service/tms/1.0.0/other:forest_areas_x@EPSG:900913@pbf/1/2/3.pbf',
      'Unsupported mock GeoServer TMS layer',
    ],
  ])('rejects unsupported GeoServer endpoint %s', async (path, error) => {
    await expectError(await request({ path, authorization: undefined }), {
      status: 404,
      error,
    })
  })

  it.each([
    ['GET', '/layer/%ZZ'],
    ['PATCH', '/layer/%ZZ/area/known'],
    ['PATCH', `${layerPath}/area/%E0%A4%A`],
    ['GET', '/geoserver/%ZZ/ows'],
    ['GET', '/geoserver/gwc/service/tms/1.0.0/%ZZ/1/2/3.pbf'],
  ])(
    'returns 400 for malformed percent encoding in %s %s without mutations',
    async (method, path) => {
      await expectNoMutation(async () =>
        expectError(
          await request({
            path,
            method,
            authorization: verified,
            body: method === 'PATCH' ? form({ name: 'Edit' }) : undefined,
          }),
          { status: 400, error: 'Malformed mock URL encoding' }
        )
      )
    }
  )

  it('decodes valid identifiers once and preserves supported trailing slashes', async () => {
    const detail = await request({
      path: '/layer/%6Dock-visible-layer/',
      authorization: verified,
    })
    expect(detail.status).toBe(200)
    expect((await json<LayerDto>(detail)).id).toBe(layerId)
    const edit = await request({
      path: '/layer/%6Dock-visible-layer/area/%6Dock-visible-area-picture/',
      authorization: verified,
      method: 'PATCH',
      body: form({ name: 'Encoded area' }),
    })
    expect(edit.status).toBe(200)
    expect(areas(layerId)!.features[0].properties.name).toBe('Encoded area')
    const wfs = await request({
      path: '/geoserver/%6Dock/ows/?request=GetFeature&typeNames=mock%3Aforest_areas_mockvisiblelayer_centroid',
      authorization: undefined,
    })
    expect(wfs.status).toBe(200)
    const tile = await request({
      path: '/geoserver/gwc/service/tms/1.0.0/mock%3Aforest_areas_mockvisiblelayer%40EPSG%3A900913%40pbf/1/2/3.pbf',
      authorization: undefined,
    })
    expect(tile.status).toBe(200)
    const created = await request({
      path: '/layer/',
      authorization: verified,
      method: 'POST',
      body: createForm(),
    })
    expect(created.status).toBe(201)
    await expectError(
      await request({
        path: '/layer/%256Dock-visible-layer',
        authorization: verified,
      }),
      { status: 404, error: 'Mock layer not found' }
    )
  })
})

describe('runtime mock API enablement', () => {
  it.each(['1', 'true', 'yes', 'on', ' TrUe '])(
    'enables %s only outside production',
    (flag) => {
      expect(
        enabled({ LUONNONMETSAKARTAT_MOCK_API_ENABLED: flag, NODE_ENV: 'test' })
      ).toBe(true)
      expect(() =>
        enabled({
          LUONNONMETSAKARTAT_MOCK_API_ENABLED: flag,
          NODE_ENV: 'production',
        })
      ).toThrow('mock API cannot be enabled when NODE_ENV=production')
    }
  )
  it.each([undefined, '', '0', 'false', 'no', 'off', 'unknown'])(
    'disables %s including production',
    (flag) => {
      expect(
        enabled({
          LUONNONMETSAKARTAT_MOCK_API_ENABLED: flag,
          NODE_ENV: 'production',
        })
      ).toBe(false)
    }
  )
  it('guards the default process environment', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
      LUONNONMETSAKARTAT_MOCK_API_ENABLED: ' ON ',
    })
    expect(() => enabled()).toThrow(
      'mock API cannot be enabled when NODE_ENV=production'
    )
    process.env.LUONNONMETSAKARTAT_MOCK_API_ENABLED = '0'
    expect(enabled()).toBe(false)
  })
})
