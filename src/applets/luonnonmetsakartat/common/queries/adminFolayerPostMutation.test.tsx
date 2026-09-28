import {
  adminConf,
  httpError,
  httpResponse,
  mockNotify,
  mockUseAuthSession,
  readBytes,
  serverLayer,
  setupClientTests,
} from './testSupport'
import { act, renderHook } from '@testing-library/react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { ColOptions, FolayerConfState } from '../types'
import { useAdminFolayerPostMutationOptions } from './adminFolayerPostMutation'

const createClient = setupClientTests()
const input = () => ({
  name: 'Uploaded forest',
  colorCode: '#123456',
  isHidden: false,
  rawShapefile: new Uint8Array([80, 75, 3, 4, 0, 255]).buffer,
  colOptions: {
    indexingStrategy: 'id',
    idCol: 'tunnus',
    nameCol: 'nimi',
    municipalityCol: 'kunta',
  } as ColOptions,
})

it.each([
  ['id', true, 200, true],
  ['id', false, 201, false],
  ['name_municipality', false, 200, true],
  ['name_municipality', true, 201, false],
] as const)(
  'creates via %s indexing (optional=%p, status=%p, hidden=%p)',
  async (strategy, optional, status, hidden) => {
    const { client, wrapper } = createClient()
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const other = adminConf({ id: 'other' })
    useAppletStore.getState().setAdminFolayerConfs([other])
    jest
      .mocked(axios.post)
      .mockResolvedValueOnce(httpResponse(serverLayer(), status))
    const { result } = renderHook(
      () =>
        useMutation({ ...useAdminFolayerPostMutationOptions(), retry: false }),
      { wrapper }
    )
    const variables = input()
    variables.isHidden = hidden
    variables.colOptions = {
      indexingStrategy: strategy,
      nameCol: 'nimi',
      municipalityCol: 'kunta',
      ...(strategy === 'id' ? { idCol: 'tunnus' } : {}),
      ...(optional
        ? {
            regionCol: 'maakunta',
            descriptionCol: 'kuvaus',
            areaCol: 'pinta_ala',
          }
        : {}),
    }
    await act(async () => {
      await expect(result.current.mutateAsync(variables)).resolves.toEqual({
        status,
        id: 'layer-a',
      })
    })
    expect(axios.post).toHaveBeenCalledWith(
      '/api/luonnonmetsakartat/layer',
      expect.any(FormData),
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: 'Bearer opaque-token',
        },
      }
    )
    const form = jest.mocked(axios.post).mock.calls[0][1] as FormData
    expect(
      Object.fromEntries(
        Array.from(form.entries()).filter(([key]) => key !== 'zip_file')
      )
    ).toEqual({
      name: 'Uploaded forest',
      color_code: '#123456',
      is_hidden: hidden ? 'true' : 'false',
      indexing_strategy: strategy,
      name_col: 'nimi',
      municipality_col: 'kunta',
      ...(strategy === 'id' ? { id_col: 'tunnus' } : {}),
      ...(optional
        ? {
            region_col: 'maakunta',
            description_col: 'kuvaus',
            area_col: 'pinta_ala',
          }
        : {}),
    })
    const zip = form.get('zip_file') as File
    expect(zip).toBeInstanceOf(File)
    expect([zip.name, zip.type, zip.size]).toEqual([
      'shapefile.zip',
      'application/zip',
      6,
    ])
    expect(await readBytes(zip)).toEqual([80, 75, 3, 4, 0, 255])
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({
      other,
      'layer-a': {
        id: 'layer-a',
        name: 'Server forest',
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
      },
    })
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(mockNotify).toHaveBeenCalledWith({
      message: 'notifications.folayer_create_success',
      variant: 'success',
    })
    expect(invalidate).not.toHaveBeenCalled()
  }
)

it.each([400, 422, 401, 403, 503, undefined])(
  'does not insert or signal success after rejected %p',
  async (status) => {
    const { wrapper } = createClient()
    const previous = adminConf({ id: 'other' })
    useAppletStore.getState().setAdminFolayerConfs([previous])
    const error = httpError(status)
    jest.mocked(axios.post).mockRejectedValueOnce(error)
    const { result } = renderHook(
      () =>
        useMutation({ ...useAdminFolayerPostMutationOptions(), retry: false }),
      { wrapper }
    )
    await act(async () => {
      await expect(result.current.mutateAsync(input())).rejects.toBe(error)
    })
    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({
      other: previous,
    })
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
  'makes no create request for token %p',
  async (accessToken) => {
    const { wrapper } = createClient()
    mockUseAuthSession.mockReturnValue({ data: { accessToken } })
    const { result } = renderHook(
      () =>
        useMutation({ ...useAdminFolayerPostMutationOptions(), retry: false }),
      { wrapper }
    )
    await act(async () => {
      await expect(result.current.mutateAsync(input())).rejects.toThrow(
        'Missing access token'
      )
    })
    expect(axios.post).not.toHaveBeenCalled()
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' })
    )
  }
)

it('rejects unexpected resolved status without storing server data', async () => {
  const { wrapper } = createClient()
  jest
    .mocked(axios.post)
    .mockResolvedValueOnce(httpResponse(serverLayer(), 202))
  const { result } = renderHook(
    () =>
      useMutation({ ...useAdminFolayerPostMutationOptions(), retry: false }),
    { wrapper }
  )
  await act(async () => {
    await expect(result.current.mutateAsync(input())).rejects.toThrow(
      'Failed to save'
    )
  })
  expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
  expect(mockNotify).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'error' })
  )
})
