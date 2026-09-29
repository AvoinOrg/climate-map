import {
  adminConf,
  deferred,
  httpError,
  httpResponse,
  mockUseAuthSession,
  serverLayer,
  setupClientTests,
} from './testSupport'
import { renderHook } from '@testing-library/react'
import type { UseQueryOptions } from '@tanstack/react-query'
import axios from 'axios'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { AdminFolayerConf, FolayerConfState } from '../types'
import { folayersQuery } from './folayersQuery'
import { useAdminFolayersQueryOptions } from './adminFolayersQuery'
import { useAdminFolayerQueryOptions } from './adminFolayerQuery'

const createClient = setupClientTests()
const expectedAdmin = {
  id: 'layer-a',
  name: 'Server forest',
  description: 'Server description',
  colorCode: '#abcdef',
  isVisible: false,
  createdTs: 123,
  updatedTs: 456,
  state: FolayerConfState.Idle,
  unsyncedChanges: false,
  colOptions: {
    indexingStrategy: 'id',
    idCol: 'server_id',
    nameCol: 'server_name',
    municipalityCol: 'server_municipality',
  },
}

describe('public layer list', () => {
  it('uses anonymous transport and replaces obsolete public records without admin fields or cache leakage', async () => {
    const { client } = createClient()
    const hidden = adminConf({ id: 'hidden', name: 'Editor only' })
    useAppletStore.getState().setAdminFolayerConfs([hidden])
    useAppletStore.getState().setFolayerConfs([adminConf({ id: 'obsolete' })])
    client.setQueryData(['adminFolayers'], [hidden])
    client.setQueryData(['folayers'], ['old public cache'])
    jest
      .mocked(axios.get)
      .mockResolvedValueOnce(
        httpResponse([
          serverLayer(),
          { id: 'layer-b', name: 'Bare forest', created_ts: 5, updated_ts: 9 },
        ])
      )
    const options = folayersQuery()
    expect(options.queryKey).toEqual(['folayers'])
    const data = await client.fetchQuery({
      ...options,
      retry: false,
      staleTime: 0,
    })
    expect(axios.get).toHaveBeenCalledWith('/api/luonnonmetsakartat/layers')
    expect(data).toEqual([
      {
        id: 'layer-a',
        name: 'Server forest',
        description: 'Server description',
        colorCode: '#abcdef',
        createdTs: 123000,
        updatedTs: 456000,
      },
      {
        id: 'layer-b',
        name: 'Bare forest',
        description: '',
        colorCode: '#000000',
        createdTs: 5000,
        updatedTs: 9000,
      },
    ])
    expect(useAppletStore.getState().folayerConfs).toEqual({
      'layer-a': data?.[0],
      'layer-b': data?.[1],
    })
    expect(client.getQueryData(['adminFolayers'])).toEqual([hidden])
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({ hidden })
    jest.mocked(axios.get).mockResolvedValueOnce(httpResponse([]))
    expect(
      await client.fetchQuery({ ...options, retry: false, staleTime: 0 })
    ).toEqual([])
    expect(useAppletStore.getState().folayerConfs).toEqual({})
  })

  it.each([401, 403, 503, undefined])(
    'retains the public list on rejected %p without admin fallback',
    async (status) => {
      const { client } = createClient()
      const previous = adminConf()
      useAppletStore.getState().setFolayerConfs([previous])
      client.setQueryData(['adminFolayers'], [adminConf({ id: 'hidden' })])
      const error = httpError(status)
      jest.mocked(axios.get).mockRejectedValueOnce(error)
      await expect(
        client.fetchQuery({ ...folayersQuery(), retry: false })
      ).rejects.toBe(error)
      expect(useAppletStore.getState().folayerConfs).toEqual({
        'layer-a': previous,
      })
      expect(axios.get).toHaveBeenCalledTimes(1)
    }
  )
})

describe.each(['list', 'detail'] as const)('admin %s', (kind) => {
  const useOptions = () => {
    const list = useAdminFolayersQueryOptions()
    const detail = useAdminFolayerQueryOptions('layer-a')
    // Widen only the result type for this common list/detail contract matrix.
    return (kind === 'list' ? list : detail) as UseQueryOptions<
      AdminFolayerConf[] | AdminFolayerConf | null
    >
  }
  const payload = () => (kind === 'list' ? [serverLayer()] : serverLayer())

  it.each([false, true])(
    'normalizes server fields and inserts/updates (existing=%p)',
    async (existing) => {
      const { client } = createClient()
      const other = adminConf({ id: 'other' })
      useAppletStore
        .getState()
        .setAdminFolayerConfs([
          other,
          ...(existing ? [adminConf({ unsyncedChanges: true })] : []),
        ])
      const response = deferred<ReturnType<typeof httpResponse>>()
      jest.mocked(axios.get).mockReturnValueOnce(response.promise)
      const { result } = renderHook(useOptions)
      expect(result.current.queryKey).toEqual(
        kind === 'list' ? ['adminFolayers'] : ['adminFolayer', 'layer-a']
      )
      const pending = client.fetchQuery({ ...result.current, retry: false })
      if (existing)
        expect(
          useAppletStore.getState().adminFolayerConfs['layer-a'].state
        ).toBe(FolayerConfState.Fetching)
      response.resolve(httpResponse(payload()))
      expect(await pending).toEqual(
        kind === 'list' ? [expectedAdmin] : expectedAdmin
      )
      expect(axios.get).toHaveBeenCalledWith(
        kind === 'list'
          ? '/api/luonnonmetsakartat/layers'
          : '/api/luonnonmetsakartat/layer/layer-a',
        {
          headers: { Authorization: 'Bearer opaque-token' },
          ...(kind === 'detail' ? { signal: expect.any(AbortSignal) } : {}),
        }
      )
      expect(useAppletStore.getState().adminFolayerConfs).toEqual({
        'layer-a': expectedAdmin,
        other,
      })
    }
  )

  it('defaults optional fields and treats a visible response as clean', async () => {
    const { client } = createClient()
    const bare = {
      id: 'layer-b',
      name: 'Bare',
      is_hidden: false,
      created_ts: 1,
      updated_ts: 2,
    }
    jest
      .mocked(axios.get)
      .mockResolvedValueOnce(httpResponse(kind === 'list' ? [bare] : bare))
    const { result } = renderHook(useOptions)
    await client.fetchQuery({ ...result.current, retry: false })
    expect(useAppletStore.getState().adminFolayerConfs['layer-b']).toEqual({
      id: 'layer-b',
      name: 'Bare',
      description: '',
      colorCode: '',
      isVisible: true,
      createdTs: 1,
      updatedTs: 2,
      colOptions: undefined,
      state: FolayerConfState.Idle,
      unsyncedChanges: false,
    })
  })

  it.each([undefined, ''])(
    'fails closed for token %p without changing prior state',
    async (accessToken) => {
      const { client } = createClient()
      const previous = adminConf()
      useAppletStore.getState().setAdminFolayerConfs([previous])
      mockUseAuthSession.mockReturnValue({ data: { accessToken } })
      const { result } = renderHook(useOptions)
      await expect(
        client.fetchQuery({ ...result.current, retry: false })
      ).rejects.toThrow('Missing access token')
      expect(axios.get).not.toHaveBeenCalled()
      expect(useAppletStore.getState().adminFolayerConfs).toEqual({
        'layer-a': previous,
      })
    }
  )

  it.each([401, 403, 404, 503, undefined])(
    'retains data and recovers after rejected %p',
    async (status) => {
      const { client } = createClient()
      const previous = adminConf({ unsyncedChanges: true })
      useAppletStore.getState().setAdminFolayerConfs([previous])
      const error = httpError(status)
      jest
        .mocked(axios.get)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(httpResponse(payload()))
      const { result } = renderHook(useOptions)
      await expect(
        client.fetchQuery({ ...result.current, retry: false })
      ).rejects.toBe(error)
      expect(useAppletStore.getState().adminFolayerConfs).toEqual({
        'layer-a': previous,
      })
      expect(
        await client.fetchQuery({
          ...result.current,
          retry: false,
          staleTime: 0,
        })
      ).toEqual(kind === 'list' ? [expectedAdmin] : expectedAdmin)
      expect(axios.get).toHaveBeenCalledTimes(2)
    }
  )
})

it.each([
  FolayerConfState.Fetching,
  FolayerConfState.Saving,
  FolayerConfState.Deleting,
])('suppresses detail while %s', async (state) => {
  const { client } = createClient()
  const previous = adminConf({ state })
  useAppletStore.getState().setAdminFolayerConfs([previous])
  const { result } = renderHook(() => useAdminFolayerQueryOptions('layer-a'))
  expect(
    await client.fetchQuery({ ...result.current, retry: false })
  ).toBeNull()
  expect(axios.get).not.toHaveBeenCalled()
  expect(useAppletStore.getState().adminFolayerConfs['layer-a']).toEqual(
    previous
  )
})
