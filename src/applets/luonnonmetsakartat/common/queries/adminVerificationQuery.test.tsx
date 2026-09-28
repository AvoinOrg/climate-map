import {
  deferred,
  httpError,
  httpResponse,
  mockUseAuthSession,
  setupClientTests,
} from './testSupport'
import { renderHook } from '@testing-library/react'
import axios from 'axios'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { AdminVerificationStatus as Status } from '../types'
import { useAdminVerificationQueryOptions } from './adminVerificationQuery'

const createClient = setupClientTests()

it.each([
  [null, Status.NoUser, false],
  [{ accessToken: 'token-without-user' }, Status.NoUser, false],
  [{ user: {} }, Status.NoUser, false],
  [{ user: { id: 'editor-a' } }, Status.Errored, null],
  [{ user: { id: 'editor-a' }, accessToken: '' }, Status.Errored, null],
])('settles without HTTP for session %p', async (session, terminal, value) => {
  const { client } = createClient()
  useAppletStore.getState().setAdminVerificationStatus(Status.Verified)
  mockUseAuthSession.mockReturnValue({ data: session })
  const transitions: Status[] = []
  const unsubscribe = useAppletStore.subscribe(
    (state) => state.adminVerificationStatus,
    (state) => transitions.push(state)
  )
  try {
    const { result } = renderHook(useAdminVerificationQueryOptions)
    expect(await client.fetchQuery(result.current)).toBe(value)
    expect(transitions).toEqual([Status.Pending, terminal])
    expect(axios.get).not.toHaveBeenCalled()
    expect(client.getQueryState(result.current.queryKey)?.status).toBe(
      'success'
    )
  } finally {
    unsubscribe()
  }
})

it.each([
  [{ is_editor: true }, true, Status.Verified],
  [{ is_admin: true }, true, Status.Verified],
  [{ is_editor: false, is_admin: false }, false, Status.Rejected],
  [{ is_editor: 'true', is_admin: 1 }, false, Status.Rejected],
  [{}, false, Status.Rejected],
  [null, false, Status.Rejected],
])(
  'validates strict server roles %p while exposing Pending',
  async (roles, value, terminal) => {
    const { client } = createClient()
    const pending = deferred<ReturnType<typeof httpResponse>>()
    jest.mocked(axios.get).mockReturnValueOnce(pending.promise)
    const transitions: Status[] = []
    const unsubscribe = useAppletStore.subscribe(
      (state) => state.adminVerificationStatus,
      (state) => transitions.push(state)
    )
    try {
      const { result } = renderHook(useAdminVerificationQueryOptions)
      const request = client.fetchQuery(result.current)
      expect(useAppletStore.getState().adminVerificationStatus).toBe(
        Status.Pending
      )
      expect(axios.get).toHaveBeenCalledWith(
        '/api/luonnonmetsakartat/admin/validate',
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: 'Bearer opaque-token',
          },
        }
      )
      pending.resolve(httpResponse(roles))
      expect(await request).toBe(value)
      expect(transitions).toEqual([Status.Pending, terminal])
    } finally {
      unsubscribe()
    }
  }
)

it.each([401, 403, 404, 500, 503, undefined])(
  'replaces stale verification after rejected %p and settles once',
  async (status) => {
    const { client } = createClient()
    useAppletStore.getState().setAdminVerificationStatus(Status.Verified)
    const transitions: Status[] = []
    const unsubscribe = useAppletStore.subscribe(
      (state) => state.adminVerificationStatus,
      (state) => transitions.push(state)
    )
    try {
      jest.mocked(axios.get).mockRejectedValueOnce(httpError(status))
      const { result } = renderHook(useAdminVerificationQueryOptions)
      expect(await client.fetchQuery(result.current)).toBe(
        status === 403 ? false : null
      )
      expect(transitions).toEqual([
        Status.Pending,
        status === 403 ? Status.Rejected : Status.Errored,
      ])
      expect(client.getQueryState(result.current.queryKey)).toMatchObject({
        status: 'success',
        fetchStatus: 'idle',
        fetchFailureCount: 0,
      })
      expect(axios.get).toHaveBeenCalledTimes(1)
    } finally {
      unsubscribe()
    }
  }
)

it('treats non-Axios errors and unexpected resolved status as infrastructure failures', async () => {
  const { client } = createClient()
  jest
    .mocked(axios.get)
    .mockRejectedValueOnce(new Error('Unexpected transport failure'))
    .mockResolvedValueOnce(httpResponse({ is_admin: true }, 204))
  const { result } = renderHook(useAdminVerificationQueryOptions)
  expect(await client.fetchQuery(result.current)).toBeNull()
  expect(useAppletStore.getState().adminVerificationStatus).toBe(Status.Errored)
  useAppletStore.getState().setAdminVerificationStatus(Status.Verified)
  expect(await client.fetchQuery(result.current)).toBeNull()
  expect(useAppletStore.getState().adminVerificationStatus).toBe(Status.Errored)
  expect(axios.get).toHaveBeenCalledTimes(2)
})

it('separates users in cache keys without storing their access tokens', () => {
  const { result, rerender } = renderHook(useAdminVerificationQueryOptions)
  expect(result.current.queryKey).toEqual([
    'adminVerificationQuery',
    'editor-a',
  ])
  mockUseAuthSession.mockReturnValue({
    data: { user: { id: 'editor-b' }, accessToken: 'different-secret' },
  })
  rerender()
  expect(result.current.queryKey).toEqual([
    'adminVerificationQuery',
    'editor-b',
  ])
})
