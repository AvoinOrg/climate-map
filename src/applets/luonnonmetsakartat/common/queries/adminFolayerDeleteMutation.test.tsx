import {
  adminConf,
  areaConf,
  deferred,
  httpError,
  httpResponse,
  mockNotify,
  mockUseAuthSession,
  setupClientTests,
} from './testSupport'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { FolayerConfState } from '../types'
import { useAdminFolayerDeleteMutationOptions } from './adminFolayerDeleteMutation'

const createClient = setupClientTests()
beforeEach(() => {
  useAppletStore
    .getState()
    .setAdminFolayerConfs([adminConf(), adminConf({ id: 'other' })])
  useAppletStore.getState().addFolayerAreaConf('layer-a', areaConf())
  useAppletStore.getState().addFolayerAreaConf('other', areaConf('other'))
})

it.each([200, 204])(
  'deletes with status %s only after awaiting the callback',
  async (status) => {
    const { wrapper } = createClient()
    const response = deferred<ReturnType<typeof httpResponse>>()
    const callbackDone = deferred<void>()
    jest.mocked(axios.delete).mockReturnValueOnce(response.promise)
    const callbackFn = jest.fn(() => callbackDone.promise)
    const { result } = renderHook(
      () =>
        useMutation({
          ...useAdminFolayerDeleteMutationOptions(),
          retry: false,
        }),
      { wrapper }
    )
    const previous = useAppletStore.getState()
    let mutation!: Promise<void>
    act(() => {
      mutation = result.current.mutateAsync({
        folayerConf: adminConf(),
        callbackFn,
      })
    })
    await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(1))
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/luonnonmetsakartat/layer/layer-a',
      { headers: { Authorization: 'Bearer opaque-token' } }
    )
    expect(useAppletStore.getState().adminFolayerConfs['layer-a'].state).toBe(
      FolayerConfState.Deleting
    )
    expect(callbackFn).not.toHaveBeenCalled()
    response.resolve(httpResponse(null, status))
    await waitFor(() => expect(callbackFn).toHaveBeenCalledTimes(1))
    expect(useAppletStore.getState().adminFolayerConfs['layer-a']).toBeDefined()
    expect(useAppletStore.getState().folayerAreaConfs['layer-a']).toBeDefined()
    await act(async () => {
      callbackDone.resolve()
      await mutation
    })
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({
      other: previous.adminFolayerConfs.other,
    })
    expect(useAppletStore.getState().folayerAreaConfs).toEqual({
      other: previous.folayerAreaConfs.other,
    })
    expect(mockNotify.mock.calls).toEqual([
      [{ message: 'notifications.folayer_delete_success', variant: 'success' }],
    ])
  }
)

it.each(['resolved 204', 'resolved 404', 'rejected 404'] as const)(
  'treats %s as deleted without a callback',
  async (outcome) => {
    const { wrapper } = createClient()
    if (outcome === 'rejected 404')
      jest.mocked(axios.delete).mockRejectedValueOnce(httpError(404))
    else
      jest
        .mocked(axios.delete)
        .mockResolvedValueOnce(
          httpResponse(null, outcome === 'resolved 404' ? 404 : 204)
        )
    const { result } = renderHook(
      () =>
        useMutation({
          ...useAdminFolayerDeleteMutationOptions(),
          retry: false,
        }),
      { wrapper }
    )
    await act(async () => {
      await expect(
        result.current.mutateAsync({ folayerConf: adminConf() })
      ).resolves.toBeUndefined()
    })
    expect(
      useAppletStore.getState().adminFolayerConfs['layer-a']
    ).toBeUndefined()
    expect(
      useAppletStore.getState().folayerAreaConfs['layer-a']
    ).toBeUndefined()
    expect(mockNotify.mock.calls).toEqual([
      [{ message: 'notifications.folayer_delete_success', variant: 'success' }],
    ])
  }
)

it.each([401, 403, 500, 503, undefined])(
  'rolls back and does not run callback on rejected %p',
  async (status) => {
    const { wrapper } = createClient()
    const previous = useAppletStore.getState()
    const error = httpError(status)
    jest.mocked(axios.delete).mockRejectedValueOnce(error)
    const callbackFn = jest.fn()
    const { result } = renderHook(
      () =>
        useMutation({
          ...useAdminFolayerDeleteMutationOptions(),
          retry: false,
        }),
      { wrapper }
    )
    await act(async () => {
      await expect(
        result.current.mutateAsync({ folayerConf: adminConf(), callbackFn })
      ).rejects.toBe(error)
    })
    expect(callbackFn).not.toHaveBeenCalled()
    expect(useAppletStore.getState().adminFolayerConfs).toEqual(
      previous.adminFolayerConfs
    )
    expect(useAppletStore.getState().folayerAreaConfs).toBe(
      previous.folayerAreaConfs
    )
    expect(mockNotify.mock.calls).toEqual([
      [{ message: 'notifications.folayer_delete_error', variant: 'error' }],
    ])
  }
)

it.each([undefined, ''])(
  'does not request or enter Deleting for token %p',
  async (accessToken) => {
    const { wrapper } = createClient()
    mockUseAuthSession.mockReturnValue({ data: { accessToken } })
    const callbackFn = jest.fn()
    const states: FolayerConfState[] = []
    const unsubscribe = useAppletStore.subscribe(
      (state) => state.adminFolayerConfs['layer-a']?.state,
      (state) => states.push(state)
    )
    try {
      const { result } = renderHook(
        () =>
          useMutation({
            ...useAdminFolayerDeleteMutationOptions(),
            retry: false,
          }),
        { wrapper }
      )
      await act(async () => {
        await expect(
          result.current.mutateAsync({ folayerConf: adminConf(), callbackFn })
        ).rejects.toThrow('Missing access token')
      })
      expect(axios.delete).not.toHaveBeenCalled()
      expect(states).toEqual([])
      expect(callbackFn).not.toHaveBeenCalled()
      expect(useAppletStore.getState().adminFolayerConfs['layer-a']).toEqual(
        adminConf()
      )
      expect(useAppletStore.getState().folayerAreaConfs['layer-a']).toEqual(
        areaConf()
      )
    } finally {
      unsubscribe()
    }
  }
)

it('rejects an unexpected resolved status', async () => {
  const { wrapper } = createClient()
  jest.mocked(axios.delete).mockResolvedValueOnce(httpResponse(null, 202))
  const { result } = renderHook(
    () =>
      useMutation({ ...useAdminFolayerDeleteMutationOptions(), retry: false }),
    { wrapper }
  )
  await act(async () => {
    await expect(
      result.current.mutateAsync({ folayerConf: adminConf() })
    ).rejects.toThrow('Failed to delete')
  })
  expect(useAppletStore.getState().adminFolayerConfs['layer-a'].state).toBe(
    FolayerConfState.Idle
  )
  expect(mockNotify).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'error' })
  )
})
