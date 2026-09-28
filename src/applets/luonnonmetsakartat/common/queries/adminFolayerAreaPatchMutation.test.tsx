import {
  areaConf,
  feature,
  httpError,
  httpResponse,
  mockNotify,
  mockTranslate,
  mockUseAuthSession,
  setupClientTests,
} from './testSupport'
import { act, renderHook } from '@testing-library/react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useAdminFolayerAreaPatchMutationOptions } from './adminFolayerAreaPatchMutation'

const createClient = setupClientTests()
const input = () => ({
  layerId: 'layer-a',
  featureId: 'area-a',
  properties: { name: 'Client edit' },
})
beforeEach(() => {
  useAppletStore.getState().addFolayerAreaConf('layer-a', areaConf())
  useAppletStore.getState().addFolayerAreaConf('other', areaConf('other'))
})

it('serializes own non-null properties and merges the server result into only the addressed area', async () => {
  const { wrapper } = createClient()
  const previous = useAppletStore.getState().folayerAreaConfs
  const server = {
    ...feature(),
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {
      ...feature().properties,
      name: 'Server area',
      description: 'Saved',
      updated_ts: '999',
      pictures: '["saved.jpg"]',
    },
  }
  jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(server))
  const { result } = renderHook(
    () =>
      useMutation({
        ...useAdminFolayerAreaPatchMutationOptions(),
        retry: false,
      }),
    { wrapper }
  )
  // Null/undefined can arrive at this serialization boundary despite optional TS strings.
  const properties = Object.assign(
    Object.create({ owner: 'inherited, omit' }),
    {
      name: 'Client edit',
      description: '',
      municipality: 'Lohja',
      region: 'Uusimaa',
      pictures: '["first.jpg","second.jpg"]',
      date: undefined,
      person_responsible: null,
    }
  )
  await act(async () => {
    await expect(
      result.current.mutateAsync({ ...input(), properties })
    ).resolves.toEqual(server)
  })
  expect(axios.patch).toHaveBeenCalledWith(
    '/api/luonnonmetsakartat/layer/layer-a/area/area-a',
    expect.any(FormData),
    {
      headers: { Authorization: 'Bearer opaque-token' },
    }
  )
  const form = jest.mocked(axios.patch).mock.calls[0][1] as FormData
  expect(Array.from(form.entries())).toEqual([
    ['name', 'Client edit'],
    ['description', ''],
    ['municipality', 'Lohja'],
    ['region', 'Uusimaa'],
    ['pictures', '["first.jpg","second.jpg"]'],
  ])
  const state = useAppletStore.getState().folayerAreaConfs
  expect(state['layer-a'].data.features[0]).toEqual({
    ...previous['layer-a'].data.features[0],
    properties: server.properties,
  })
  expect(state['layer-a'].data.features[1]).toEqual(
    previous['layer-a'].data.features[1]
  )
  expect(state.other).toBe(previous.other)
  expect(mockNotify.mock.calls).toEqual([
    [
      {
        message: 'notifications.folayer_area_update_success',
        variant: 'success',
      },
    ],
  ])
  expect(mockTranslate).toHaveBeenCalledWith(
    'notifications.folayer_area_update_success',
    { name: 'Server area' }
  )
})

it('sends empty picture metadata to remove pictures and uses feature ID for unnamed response', async () => {
  const { wrapper } = createClient()
  const server = feature()
  server.properties.name = ''
  server.properties.pictures = '[]'
  jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(server))
  const { result } = renderHook(
    () =>
      useMutation({
        ...useAdminFolayerAreaPatchMutationOptions(),
        retry: false,
      }),
    { wrapper }
  )
  await act(async () => {
    await result.current.mutateAsync({
      ...input(),
      properties: { pictures: '[]' },
    })
  })
  expect(
    (jest.mocked(axios.patch).mock.calls[0][1] as FormData).get('pictures')
  ).toBe('[]')
  expect(
    useAppletStore.getState().getFolayerAreaById('layer-a', 'area-a')
      ?.properties.pictures
  ).toBe('[]')
  expect(mockTranslate).toHaveBeenCalledWith(
    'notifications.folayer_area_update_success',
    { name: 'area-a' }
  )
})

it.each([400, 422, 401, 403, 404, 503, undefined])(
  'preserves stored areas on rejected %p',
  async (status) => {
    const { wrapper } = createClient()
    const previous = useAppletStore.getState().folayerAreaConfs
    const error = httpError(status)
    jest.mocked(axios.patch).mockRejectedValueOnce(error)
    const { result } = renderHook(
      () =>
        useMutation({
          ...useAdminFolayerAreaPatchMutationOptions(),
          retry: false,
        }),
      { wrapper }
    )
    await act(async () => {
      await expect(result.current.mutateAsync(input())).rejects.toBe(error)
    })
    expect(useAppletStore.getState().folayerAreaConfs).toBe(previous)
    expect(mockNotify.mock.calls).toEqual([
      [
        {
          message: 'notifications.folayer_area_update_error',
          variant: 'error',
        },
      ],
    ])
    expect(mockTranslate).toHaveBeenCalledWith(
      'notifications.folayer_area_update_error',
      { featureId: 'area-a', error: error.message }
    )
  }
)

it.each([undefined, ''])(
  'makes no area update request for token %p',
  async (accessToken) => {
    const { wrapper } = createClient()
    const previous = useAppletStore.getState().folayerAreaConfs
    mockUseAuthSession.mockReturnValue({ data: { accessToken } })
    const { result } = renderHook(
      () =>
        useMutation({
          ...useAdminFolayerAreaPatchMutationOptions(),
          retry: false,
        }),
      { wrapper }
    )
    await act(async () => {
      await expect(result.current.mutateAsync(input())).rejects.toThrow(
        'Missing access token'
      )
    })
    expect(axios.patch).not.toHaveBeenCalled()
    expect(useAppletStore.getState().folayerAreaConfs).toBe(previous)
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' })
    )
  }
)

it('rejects unexpected resolved non-200 status', async () => {
  const { wrapper } = createClient()
  const previous = useAppletStore.getState().folayerAreaConfs
  jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(feature(), 201))
  const { result } = renderHook(
    () =>
      useMutation({
        ...useAdminFolayerAreaPatchMutationOptions(),
        retry: false,
      }),
    { wrapper }
  )
  await act(async () => {
    await expect(result.current.mutateAsync(input())).rejects.toThrow(
      'Status: 201'
    )
  })
  expect(useAppletStore.getState().folayerAreaConfs).toBe(previous)
  expect(mockNotify).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'error' })
  )
})
