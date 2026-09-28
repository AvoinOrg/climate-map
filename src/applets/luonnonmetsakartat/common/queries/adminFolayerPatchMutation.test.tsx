import {
  adminConf,
  areaConf,
  httpError,
  httpResponse,
  mockNotify,
  mockTranslate,
  mockUseAuthSession,
  readBytes,
  serverLayer,
  setupClientTests,
} from './testSupport'
import { act, renderHook } from '@testing-library/react'
import { QueryObserver, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { ColOptions, FolayerConfState } from '../types'
import { useAdminFolayerPatchMutationOptions } from './adminFolayerPatchMutation'
import { folayersQuery } from './folayersQuery'

const createClient = setupClientTests()
const zipBytes = () => new Uint8Array([80, 75, 255, 0, 42]).buffer
const pictures = () => [
  new File([new Uint8Array([1, 2, 255])], 'second.jpg', { type: 'image/jpeg' }),
  new File([new Uint8Array([8, 9])], 'first.png', { type: 'image/png' }),
]
const useSave = () =>
  useMutation({ ...useAdminFolayerPatchMutationOptions(), retry: false })
const sentForm = () => jest.mocked(axios.patch).mock.calls[0][1] as FormData

it.each([false, true])(
  'saves settings, inverts visibility %p, and normalizes the server response',
  async (visible) => {
    const { wrapper } = createClient()
    const other = adminConf({ id: 'other' })
    useAppletStore.getState().setAdminFolayerConfs([adminConf(), other])
    jest
      .mocked(axios.patch)
      .mockResolvedValueOnce(
        httpResponse(
          { ...serverLayer(), is_hidden: !visible },
          visible ? 201 : 200
        )
      )
    const { result } = renderHook(useSave, { wrapper })
    await act(async () => {
      await expect(
        result.current.mutateAsync(
          adminConf({ isVisible: visible, unsyncedChanges: true })
        )
      ).resolves.toEqual({ status: visible ? 201 : 200, id: 'layer-a' })
    })
    expect(axios.patch).toHaveBeenCalledWith(
      '/api/luonnonmetsakartat/layer/layer-a',
      expect.any(FormData),
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: 'Bearer opaque-token',
        },
      }
    )
    expect(Array.from(sentForm().entries())).toEqual([
      ['is_hidden', visible ? 'false' : 'true'],
      ['name', 'Local forest'],
      ['color_code', '#112233'],
    ])
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({
      other,
      'layer-a': {
        id: 'layer-a',
        name: 'Server forest',
        colorCode: '#abcdef',
        isVisible: visible,
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
      },
    })
    expect(mockNotify.mock.calls).toEqual([
      [{ message: 'notifications.folayer_update_success', variant: 'success' }],
    ])
    expect(mockTranslate).toHaveBeenCalledWith(
      'notifications.folayer_update_success',
      { name: 'Local forest' }
    )
  }
)

it.each([
  ['id', true, 'true'],
  ['id', false, 'false'],
  ['id', undefined, null],
  ['name_municipality', true, 'true'],
  ['name_municipality', false, 'false'],
  ['name_municipality', undefined, null],
] as const)(
  'serializes %s replacement with delete flag %p',
  async (strategy, flag, serialized) => {
    const { wrapper } = createClient()
    jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(serverLayer()))
    const { result } = renderHook(useSave, { wrapper })
    const colOptions: ColOptions = {
      indexingStrategy: strategy,
      nameCol: 'nimi',
      municipalityCol: 'kunta',
      ...(strategy === 'id'
        ? {
            idCol: 'tunnus',
            regionCol: 'maakunta',
            descriptionCol: 'kuvaus',
            areaCol: 'pinta_ala',
          }
        : {}),
    }
    await act(async () => {
      await result.current.mutateAsync({
        ...adminConf({ colOptions }),
        rawShapefile: zipBytes(),
        deleteAreasNotUpdated: flag,
      })
    })
    const form = sentForm()
    expect(form.get('delete_areas_not_updated')).toBe(serialized)
    expect(form.has('delete_areas_not_updated')).toBe(flag !== undefined)
    const zip = form.get('zip_file') as File
    expect([zip.name, zip.type, zip.size]).toEqual([
      'shapefile.zip',
      'application/zip',
      5,
    ])
    expect(await readBytes(zip)).toEqual([80, 75, 255, 0, 42])
    expect(
      Object.fromEntries(
        Array.from(form.entries()).filter(
          ([key]) => !['zip_file', 'delete_areas_not_updated'].includes(key)
        )
      )
    ).toEqual({
      is_hidden: 'false',
      name: 'Local forest',
      color_code: '#112233',
      indexing_strategy: strategy,
      name_col: 'nimi',
      municipality_col: 'kunta',
      ...(strategy === 'id'
        ? {
            id_col: 'tunnus',
            region_col: 'maakunta',
            description_col: 'kuvaus',
            area_col: 'pinta_ala',
          }
        : {}),
    })
  }
)

it('omits absent optional settings and replacement fields', async () => {
  const { wrapper } = createClient()
  jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(serverLayer()))
  const { result } = renderHook(useSave, { wrapper })
  await act(async () => {
    await result.current.mutateAsync(adminConf({ name: '', colorCode: '' }))
  })
  expect(Array.from(sentForm().entries())).toEqual([['is_hidden', 'false']])
  expect(mockTranslate).toHaveBeenCalledWith(
    'notifications.folayer_update_success',
    { name: 'layer-a' }
  )
})

it('keeps repeated image and area-ID fields aligned, including several pictures for one area', async () => {
  const { wrapper } = createClient()
  jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(serverLayer()))
  const { result } = renderHook(useSave, { wrapper })
  const files = pictures()
  await act(async () => {
    await result.current.mutateAsync({
      ...adminConf(),
      bulkImages: [files[0], files[1], files[0]],
      bulkAreaIds: ['area-b', 'area-a', 'area-b'],
    })
  })
  const form = sentForm()
  expect(form.getAll('bulk_area_ids')).toEqual(['area-b', 'area-a', 'area-b'])
  const uploaded = form.getAll('bulk_images') as File[]
  expect(uploaded.map((file) => [file.name, file.type, file.size])).toEqual([
    ['second.jpg', 'image/jpeg', 3],
    ['first.png', 'image/png', 2],
    ['second.jpg', 'image/jpeg', 3],
  ])
  expect(await Promise.all(uploaded.map(readBytes))).toEqual([
    [1, 2, 255],
    [8, 9],
    [1, 2, 255],
  ])
  expect(mockNotify.mock.calls).toEqual([
    [{ message: 'notifications.folayer_pictures_success', variant: 'success' }],
  ])
})

it.each([
  {},
  { bulkImages: [], bulkAreaIds: [] },
  { bulkImages: [] },
  { bulkAreaIds: [] },
])(
  'allows empty/absent picture arrays for settings-only saves: %p',
  async (arrays) => {
    const { client, wrapper } = createClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(serverLayer()))
    const { result } = renderHook(useSave, { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ ...adminConf(), ...arrays })
    })
    expect(sentForm().has('bulk_images')).toBe(false)
    expect(sentForm().has('bulk_area_ids')).toBe(false)
    expect(invalidate.mock.calls).toEqual([[{ queryKey: ['folayers'] }]])
    expect(mockNotify).toHaveBeenCalledWith({
      message: 'notifications.folayer_update_success',
      variant: 'success',
    })
  }
)

it.each([
  'images-only',
  'ids-only',
  'short-ids',
  'empty-images',
  'empty-ids',
] as const)(
  'rejects nonempty invalid pairs (%s) before HTTP or success effects',
  async (kind) => {
    const { client, wrapper } = createClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const refetch = jest.spyOn(client, 'refetchQueries')
    const previous = adminConf()
    useAppletStore.getState().setAdminFolayerConfs([previous])
    jest.mocked(axios.patch).mockResolvedValueOnce(httpResponse(serverLayer()))
    const { result } = renderHook(useSave, { wrapper })
    const arrays = {
      'images-only': { bulkImages: pictures() },
      'ids-only': { bulkAreaIds: ['area-a'] },
      'short-ids': { bulkImages: pictures(), bulkAreaIds: ['area-a'] },
      'empty-images': { bulkImages: [], bulkAreaIds: ['area-a'] },
      'empty-ids': { bulkImages: pictures(), bulkAreaIds: [] },
    }[kind]
    await act(async () => {
      await expect(
        result.current.mutateAsync({ ...previous, ...arrays })
      ).rejects.toThrow('aligned')
    })
    expect(axios.patch).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    expect(refetch).not.toHaveBeenCalled()
    expect(useAppletStore.getState().adminFolayerConfs['layer-a']).toEqual(
      previous
    )
    expect(mockNotify.mock.calls).toEqual([
      [
        {
          message: 'notifications.folayer_creation_error',
          variant: 'error',
          persist: true,
        },
      ],
    ])
  }
)

it.each([400, 422, 401, 403, 404, 503, undefined])(
  'does not overwrite state, invalidate or notify success after rejected %p',
  async (status) => {
    const { client, wrapper } = createClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const refetch = jest.spyOn(client, 'refetchQueries')
    const previous = adminConf()
    useAppletStore.getState().setAdminFolayerConfs([previous])
    client.setQueryData(['folayers'], [previous])
    const error = httpError(status)
    jest.mocked(axios.patch).mockRejectedValueOnce(error)
    const { result } = renderHook(useSave, { wrapper })
    await act(async () => {
      await expect(
        result.current.mutateAsync({ ...previous, rawShapefile: zipBytes() })
      ).rejects.toBe(error)
    })
    expect(useAppletStore.getState().adminFolayerConfs['layer-a']).toEqual(
      previous
    )
    expect(client.getQueryData(['folayers'])).toEqual([previous])
    expect(invalidate).not.toHaveBeenCalled()
    expect(refetch).not.toHaveBeenCalled()
    expect(mockNotify.mock.calls).toEqual([
      [
        {
          message: 'notifications.folayer_creation_error',
          variant: 'error',
          persist: true,
        },
      ],
    ])
  }
)

it.each([undefined, ''])(
  'makes no layer update request for token %p',
  async (accessToken) => {
    const { client, wrapper } = createClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    mockUseAuthSession.mockReturnValue({ data: { accessToken } })
    const { result } = renderHook(useSave, { wrapper })
    await act(async () => {
      await expect(result.current.mutateAsync(adminConf())).rejects.toThrow(
        'Missing access token'
      )
    })
    expect(axios.patch).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
  }
)

it('rejects unexpected resolved status without success effects', async () => {
  const { client, wrapper } = createClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  jest
    .mocked(axios.patch)
    .mockResolvedValueOnce(httpResponse(serverLayer(), 202))
  const { result } = renderHook(useSave, { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(adminConf())).rejects.toThrow(
      'Failed to save'
    )
  })
  expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
  expect(invalidate).not.toHaveBeenCalled()
  expect(mockNotify).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'error' })
  )
})

describe.each(['settings', 'zip', 'pictures'] as const)(
  '%s cache effects',
  (change) => {
    it.each(['neither', 'public-conf', 'public-areas'] as const)(
      'refreshes only affected active data when store has %s',
      async (presence) => {
        const { client, wrapper } = createClient()
        const invalidate = jest.spyOn(client, 'invalidateQueries')
        const refetch = jest.spyOn(client, 'refetchQueries')
        const oldAreas = areaConf()
        const newAreas = {
          ...areaConf(),
          data: { type: 'FeatureCollection' as const, features: [] },
        }
        if (presence === 'public-conf')
          useAppletStore.getState().setFolayerConfs([adminConf()])
        if (presence === 'public-areas')
          useAppletStore.getState().addFolayerAreaConf('layer-a', oldAreas)
        client.setQueryData(['folayers'], [adminConf()])
        const publicList = new QueryObserver(client, {
          ...folayersQuery(),
          retry: false,
          staleTime: Infinity,
        })
        const stopList = publicList.subscribe(() => undefined)
        const areaEntries = [
          ['adminFolayerAreas', 'layer-a'],
          ['folayerAreas', 'layer-a'],
          ['adminFolayerAreas', 'other'],
          ['folayerAreas', 'other'],
          ['unrelated', 'layer-a'],
        ].map((queryKey) => {
          client.setQueryData(queryKey, oldAreas)
          const queryFn = jest.fn(async () => newAreas)
          const observer = new QueryObserver(client, {
            queryKey,
            queryFn,
            staleTime: Infinity,
          })
          return {
            queryKey,
            queryFn,
            observer,
            stop: observer.subscribe(() => undefined),
          }
        })
        jest
          .mocked(axios.patch)
          .mockResolvedValueOnce(httpResponse(serverLayer()))
        jest
          .mocked(axios.get)
          .mockResolvedValue(
            httpResponse([
              {
                id: 'layer-a',
                name: 'Readback forest',
                color_code: '#aabbcc',
                created_ts: 1,
                updated_ts: 9,
              },
            ])
          )
        try {
          const { result } = renderHook(useSave, { wrapper })
          await act(async () => {
            await result.current.mutateAsync({
              ...adminConf(),
              ...(change === 'zip' ? { rawShapefile: zipBytes() } : {}),
              ...(change === 'pictures'
                ? { bulkImages: pictures(), bulkAreaIds: ['area-b', 'area-a'] }
                : {}),
            })
          })
          expect(axios.get).toHaveBeenCalledWith(
            '/api/luonnonmetsakartat/layers'
          )
          expect(publicList.getCurrentResult().data).toEqual([
            {
              id: 'layer-a',
              name: 'Readback forest',
              description: '',
              colorCode: '#aabbcc',
              createdTs: 1000,
              updatedTs: 9000,
            },
          ])
          for (const entry of areaEntries) {
            const shouldRefresh =
              change !== 'settings' &&
              entry.queryKey[1] === 'layer-a' &&
              (entry.queryKey[0] === 'adminFolayerAreas' ||
                (entry.queryKey[0] === 'folayerAreas' &&
                  presence !== 'neither'))
            expect(entry.observer.getCurrentResult().data).toEqual(
              shouldRefresh ? newAreas : oldAreas
            )
            if (shouldRefresh) {
              expect(entry.queryFn).toHaveBeenCalled()
              expect(invalidate).toHaveBeenCalledWith({
                queryKey: entry.queryKey,
                exact: true,
              })
              expect(refetch).toHaveBeenCalledWith({
                queryKey: entry.queryKey,
                type: 'active',
              })
            } else {
              expect(entry.queryFn).not.toHaveBeenCalled()
              expect(client.getQueryState(entry.queryKey)?.isInvalidated).toBe(
                false
              )
            }
          }
          expect(invalidate).toHaveBeenCalledWith({ queryKey: ['folayers'] })
          expect(refetch).toHaveBeenCalledWith({
            queryKey: ['folayers'],
            type: 'active',
          })
        } finally {
          stopList()
          areaEntries.forEach((entry) => entry.stop())
        }
      }
    )
  }
)
