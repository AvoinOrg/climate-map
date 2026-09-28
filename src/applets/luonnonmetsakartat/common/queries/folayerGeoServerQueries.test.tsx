import {
  areaConf,
  deferred,
  feature,
  httpError,
  httpResponse,
  mockUseAuthSession,
  setupClientTests,
} from './testSupport'
import axios from 'axios'
import { renderHook } from '@testing-library/react'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { FolayerConfState } from '../types'
import { useAdminFolayerAreaQueryOptions } from './adminFolayerAreaQuery'
import { folayerAreaQuery } from './folayerAreaQuery'

jest.mock('../utils', () => ({
  getFolayerCentroidSourceLayer: (id: string) =>
    `forest_areas_${id.replace(/-/g, '')}_centroid`,
}))

const createClient = setupClientTests()
const url =
  'https://gis.example.test/root/geoserver/forests/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=forests:forest_areas_layerid_centroid&outputFormat=application/json&srsName=EPSG:4326'
const envKeys = [
  'PUBLIC_GEOSERVER_URL',
  'PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE',
  'PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED',
] as const
const originalEnv = envKeys.map((key) => process.env[key])
beforeEach(() => {
  process.env.PUBLIC_GEOSERVER_URL =
    ' https://gis.example.test/root/geoserver/// '
  process.env.PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE = ' forests '
  process.env.PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED = '0'
})
afterEach(() =>
  envKeys.forEach((key, index) => {
    if (originalEnv[index] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[index]
  })
)

describe.each(['public', 'admin'] as const)('%s WFS', (kind) => {
  const useOptions = () => {
    const admin = useAdminFolayerAreaQueryOptions('layer-id')
    return kind === 'admin' ? admin : folayerAreaQuery('layer-id')
  }

  it('uses the normalized URL, distinct key and correct authorization; transitions Fetching to Idle', async () => {
    const { client } = createClient()
    const response = deferred<ReturnType<typeof httpResponse>>()
    jest.mocked(axios.get).mockReturnValueOnce(response.promise)
    const { result } = renderHook(useOptions)
    expect(result.current.queryKey).toEqual([
      kind === 'admin' ? 'adminFolayerAreas' : 'folayerAreas',
      'layer-id',
    ])
    const pending = client.fetchQuery({ ...result.current, retry: false })
    expect(useAppletStore.getState().folayerAreaConfs['layer-id']).toEqual({
      id: 'layer-id',
      state: FolayerConfState.Fetching,
      data: { type: 'FeatureCollection', features: [] },
    })
    if (kind === 'admin')
      expect(axios.get).toHaveBeenCalledWith(url, {
        headers: { Authorization: 'Bearer opaque-token' },
      })
    else expect(axios.get).toHaveBeenCalledWith(url)
    response.resolve(httpResponse({ type: 'FeatureCollection', features: [] }))
    expect(await pending).toEqual({
      id: 'layer-id',
      state: FolayerConfState.Idle,
      data: { type: 'FeatureCollection', features: [] },
    })
    expect(useAppletStore.getState().folayerAreaConfs['layer-id'].state).toBe(
      FolayerConfState.Idle
    )
  })

  it.each(['base', 'workspace'])(
    'skips all state and HTTP work when %s is missing',
    async (missing) => {
      const { client } = createClient()
      delete process.env[missing === 'base' ? envKeys[0] : envKeys[1]]
      const before = useAppletStore.getState()
      const { result } = renderHook(useOptions)
      expect(
        await client.fetchQuery({ ...result.current, retry: false })
      ).toBeNull()
      expect(axios.get).not.toHaveBeenCalled()
      expect(useAppletStore.getState()).toBe(before)
    }
  )

  it('normalizes IDs and picture arrays while retaining invalid/non-array JSON and unrelated collections', async () => {
    const { client } = createClient()
    const other = areaConf('other')
    useAppletStore.getState().addFolayerAreaConf('other', other)
    const pictures = [
      '["one.jpg","two.jpg"]',
      ['already.jpg'],
      '{broken',
      '{"not":"array"}',
      'null',
      '"string"',
    ]
    const features = pictures.map((pictures, index) => ({
      ...feature(`wfs-${index}`),
      properties: {
        ...feature().properties,
        id: index === 0 ? 'domain-id' : '',
        pictures,
      },
    }))
    jest.mocked(axios.get).mockResolvedValueOnce(httpResponse({ features }))
    const { result } = renderHook(useOptions)
    const collection = await client.fetchQuery({
      ...result.current,
      retry: false,
    })
    expect(collection?.data.features.map((f) => f.id)).toEqual([
      'domain-id',
      'wfs-1',
      'wfs-2',
      'wfs-3',
      'wfs-4',
      'wfs-5',
    ])
    expect(collection?.data.features.map((f) => f.properties.pictures)).toEqual(
      [
        ['one.jpg', 'two.jpg'],
        ['already.jpg'],
        '{broken',
        '{"not":"array"}',
        'null',
        '"string"',
      ]
    )
    expect(useAppletStore.getState().folayerAreaConfs).toEqual({
      'layer-id': collection,
      other,
    })
  })

  it.each([{}, { features: [] }])(
    'replaces stale areas with empty collection for %p',
    async (payload) => {
      const { client } = createClient()
      useAppletStore
        .getState()
        .addFolayerAreaConf('layer-id', areaConf('layer-id'))
      jest.mocked(axios.get).mockResolvedValueOnce(httpResponse(payload))
      const { result } = renderHook(useOptions)
      const value = await client.fetchQuery({ ...result.current, retry: false })
      expect(value?.data.features).toEqual([])
      expect(useAppletStore.getState().folayerAreaConfs['layer-id']).toEqual(
        value
      )
    }
  )

  it.each([FolayerConfState.Fetching, FolayerConfState.Saving])(
    'suppresses duplicate work while %s',
    async (state) => {
      const { client } = createClient()
      const previous = { ...areaConf('layer-id'), state }
      useAppletStore.getState().addFolayerAreaConf('layer-id', previous)
      const { result } = renderHook(useOptions)
      expect(
        await client.fetchQuery({ ...result.current, retry: false })
      ).toBeNull()
      expect(axios.get).not.toHaveBeenCalled()
      expect(useAppletStore.getState().folayerAreaConfs['layer-id']).toEqual(
        previous
      )
    }
  )

  it.each([403, 404, 503, undefined])(
    'preserves areas and permits explicit recovery after rejected %p',
    async (status) => {
      const { client } = createClient()
      const previous = areaConf('layer-id')
      useAppletStore.getState().addFolayerAreaConf('layer-id', previous)
      client.setQueryData(
        [kind === 'public' ? 'adminFolayerAreas' : 'folayerAreas', 'layer-id'],
        'other cache'
      )
      const error = httpError(status)
      jest
        .mocked(axios.get)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(
          httpResponse({ features: [feature('new-area')] })
        )
      const { result } = renderHook(useOptions)
      await expect(
        client.fetchQuery({ ...result.current, retry: false })
      ).rejects.toBe(error)
      expect(useAppletStore.getState().folayerAreaConfs['layer-id']).toEqual(
        previous
      )
      expect(client.getQueryData(result.current.queryKey)).toBeUndefined()
      const recovered = await client.fetchQuery({
        ...result.current,
        retry: false,
      })
      expect(recovered?.data.features.map((f) => f.id)).toEqual(['new-area'])
      expect(axios.get).toHaveBeenCalledTimes(2)
    }
  )

  it('recovers after a failed first load with no existing collection', async () => {
    const { client } = createClient()
    const error = httpError(503)
    jest
      .mocked(axios.get)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(httpResponse({ features: [] }))
    const { result } = renderHook(useOptions)
    await expect(
      client.fetchQuery({ ...result.current, retry: false })
    ).rejects.toBe(error)
    expect(
      (await client.fetchQuery({ ...result.current, retry: false }))?.state
    ).toBe(FolayerConfState.Idle)
    expect(axios.get).toHaveBeenCalledTimes(2)
  })
})

it.each([undefined, ''])(
  'admin areas fail closed for token %p without a Fetching placeholder',
  async (accessToken) => {
    const { client } = createClient()
    mockUseAuthSession.mockReturnValue({ data: { accessToken } })
    const { result } = renderHook(() =>
      useAdminFolayerAreaQueryOptions('layer-id')
    )
    await expect(
      client.fetchQuery({ ...result.current, retry: false })
    ).rejects.toThrow('Missing access token')
    expect(axios.get).not.toHaveBeenCalled()
    expect(useAppletStore.getState().folayerAreaConfs).toEqual({})
  }
)
