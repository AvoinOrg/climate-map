import {
  auth,
  deferred,
  flush,
  httpError,
  mockNavigation,
  mockRouter,
  loading,
  loggedOut,
  response,
  setupPages,
} from '../pageTestSupport'
import React, { useLayoutEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAdminVerificationQueryOptions } from '../../common/queries/adminVerificationQuery'
import { useAuthSession } from '#/common/auth'
import { act, screen, waitFor } from '@testing-library/react'
import LuonnonmetsakartatAdminGate from './LuonnonmetsakartatAdminGate'
import LuonnonmetsakartatAdminPage from './LuonnonmetsakartatAdminPage'
import { useUIStore } from '#/common/store/uiStore'
import { useAppletStore } from '../../state/appletStore'
import { AdminVerificationStatus as Status } from '../../common/types'

const pages = setupPages()
const protectedRender = jest.fn()
const ProtectedPage = () => {
  useAuthSession()
  useLayoutEffect(() => {
    protectedRender()
  })
  return <LuonnonmetsakartatAdminPage />
}
const gate = (
  <LuonnonmetsakartatAdminGate>
    <ProtectedPage />
  </LuonnonmetsakartatAdminGate>
)
const noEditor = () =>
  expect(
    screen.queryByRole('link', { name: 'sidebar.admin.upload' })
  ).not.toBeInTheDocument()

beforeEach(() => protectedRender.mockClear())
it.each([
  { name: 'logged out', session: loggedOut },
  { name: 'loading', session: loading },
  { name: 'empty token', session: auth({ token: '' }) },
])('closes incomplete auth $name without HTTP', async ({ session }) => {
  pages.render(gate, { initialAuth: session })
  noEditor()
  expect(protectedRender).not.toHaveBeenCalled()
  if (session.status === 'loading')
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  else
    expect(
      screen.getByText(
        session.status === 'unauthenticated'
          ? 'sidebar.admin.log_in_hint'
          : 'sidebar.admin.verification_errored'
      )
    ).toBeInTheDocument()
})
it('waits for verification and mounts the actual upload page once allowed', async () => {
  const pending = deferred<ReturnType<typeof response>>()
  let validations = 0
  pages.http((url) =>
    url.endsWith('/validate') ? (validations++, pending.promise) : response([])
  )
  const transitions: Status[] = []
  const unsubscribe = useAppletStore.subscribe(
    (state) => state.adminVerificationStatus,
    (status) => transitions.push(status)
  )
  const view = pages.render(gate)
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
  noEditor()
  await act(async () => pending.resolve(response({ is_editor: true })))
  expect(
    await screen.findByRole('link', { name: 'sidebar.admin.upload' })
  ).toBeInTheDocument()
  expect(useAppletStore.getState().adminVerificationStatus).toBe(
    Status.Verified
  )
  view.session(auth())
  await flush()
  expect(validations).toBe(1)
  expect(transitions).toEqual([Status.Pending, Status.Verified])
  unsubscribe()
})
it.each([
  ['logout', loggedOut],
  ['loading', loading],
  ['token loss', auth({ token: '' })],
  ['different user', auth({ userId: 'editor-b' })],
  ['new session', auth({ sessionId: 'session-b' })],
  ['new token', auth({ token: 'synthetic-b' })],
] as const)(
  'never renders a previously verified child during %s',
  async (_name, next) => {
    let validations = 0
    pages.http((url) => {
      if (!url.endsWith('/validate')) return response([])
      if (++validations === 1) return response({ is_admin: true })
      throw httpError(403)
    })
    const view = pages.render(gate)
    await screen.findByRole('link', { name: 'sidebar.admin.upload' })
    protectedRender.mockClear()
    view.session(next)
    noEditor()
    expect(protectedRender).not.toHaveBeenCalled()
    await flush()
    noEditor()
  }
)
it('ignores an obsolete success after logout', async () => {
  const pending = deferred<ReturnType<typeof response>>()
  pages.http(() => pending.promise)
  const view = pages.render(gate)
  await waitFor(() =>
    expect(useAppletStore.getState().adminVerificationStatus).toBe(
      Status.Pending
    )
  )
  view.session(loggedOut)
  await act(async () => pending.resolve(response({ is_admin: true })))
  noEditor()
  expect(useAppletStore.getState().adminVerificationStatus).toBe(Status.NoUser)
})

it.each([403, 401, 503, 200])(
  'settles denial/error %s across rerenders, remount and recovery',
  async (code) => {
    jest.useFakeTimers()
    let calls = 0
    let allowed = false
    pages.http((url) => {
      if (!url.endsWith('/validate')) return response([])
      calls++
      if (allowed) return response({ is_editor: true })
      if (code === 200) return response({ is_admin: false })
      throw httpError(code)
    })
    const view = pages.render(gate)
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000)
    })
    const status =
      code === 403 || code === 200 ? Status.Rejected : Status.Errored
    const message =
      status === Status.Rejected
        ? 'sidebar.admin.verification_rejected'
        : 'sidebar.admin.verification_errored'
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(useAppletStore.getState().adminVerificationStatus).toBe(status)
    expect(
      view.client.getQueryState(['adminVerificationQuery', 'editor-a'])
    ).toMatchObject({ fetchStatus: 'idle' })
    expect(calls).toBe(1)
    for (let i = 0; i < 3; i++) view.session(auth())
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000)
    })
    expect(calls).toBe(1)
    noEditor()
    view.unmount()
    const remounted = pages.render(gate, { client: view.client })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000)
    })
    expect(calls).toBe(2) // One deliberate validation per mount; never a terminal-state loop.
    expect(screen.getByText(message)).toBeInTheDocument()
    allowed = true
    remounted.session(auth({ token: 'synthetic-recovery' }))
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000)
    })
    expect(
      screen.getByRole('link', { name: 'sidebar.admin.upload' })
    ).toBeInTheDocument()
    expect(calls).toBe(3)
    expect(
      JSON.stringify(
        view.client
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey)
      )
    ).not.toContain('synthetic')
  }
)
it.each([true, false])(
  'ignores obsolete validation success=%s after the next session finishes',
  async (success) => {
    const old = deferred<ReturnType<typeof response>>()
    let calls = 0
    pages.http((url) => {
      if (!url.endsWith('/validate')) return response([])
      return ++calls === 1
        ? old.promise
        : response(success ? {} : { is_editor: true })
    })
    const view = pages.render(gate)
    await waitFor(() => expect(calls).toBe(1))
    view.session(auth({ token: 'synthetic-b' }))
    if (success) await screen.findByText('sidebar.admin.verification_rejected')
    else await screen.findByRole('link', { name: 'sidebar.admin.upload' })
    await act(async () => {
      if (success) old.resolve(response({ is_admin: true }))
      else old.reject(httpError(503))
    })
    expect(useAppletStore.getState().adminVerificationStatus).toBe(
      success ? Status.Rejected : Status.Verified
    )
    if (success) noEditor()
    else
      expect(
        screen.getByRole('link', { name: 'sidebar.admin.upload' })
      ).toBeInTheDocument()
    expect(calls).toBe(2)
  }
)
it('keeps token resolution and malformed identities closed even after verification', async () => {
  let calls = 0
  pages.http((url) => {
    if (url.endsWith('/validate')) {
      calls++
      return response({ is_editor: true })
    }
    return response([])
  })
  const view = pages.render(gate)
  await screen.findByRole('link', { name: 'sidebar.admin.upload' })
  view.session({ ...auth({ token: '' }), isAccessTokenLoading: true })
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
  noEditor()
  view.session(auth({ userId: '' }))
  expect(
    screen.getByText('sidebar.admin.verification_errored')
  ).toBeInTheDocument()
  noEditor()
  expect(calls).toBe(1)
})
it('bounds StrictMode verification and revalidates on a fresh-client remount', async () => {
  let calls = 0
  pages.http((url) => {
    if (url.endsWith('/validate')) {
      calls++
      return response({ is_admin: true })
    }
    return response([])
  })
  const view = pages.render(<React.StrictMode>{gate}</React.StrictMode>)
  await screen.findByRole('link', { name: 'sidebar.admin.upload' })
  await flush()
  expect(calls).toBeLessThanOrEqual(2)
  view.unmount()
  const pending = deferred<ReturnType<typeof response>>()
  pages.http(() => pending.promise)
  expect(useAppletStore.getState().adminVerificationStatus).toBe(Status.NoUser)
  const next = pages.render(gate)
  noEditor()
  await act(async () => pending.resolve(response({})))
  expect(
    await screen.findByText('sidebar.admin.verification_rejected')
  ).toBeInTheDocument()
  expect(next.client).not.toBe(view.client)
})
it('redirects a rejected nested page to the canonical admin root only once and restores navbar ownership', async () => {
  mockNavigation.setState({
    pathname: '/fi/luonnonmetsakartat/admin/layer/layer-a/settings',
  })
  useUIStore.getState().setIsNavbarHidden(true)
  pages.http(() => response({}))
  const view = pages.render(gate)
  expect(useUIStore.getState().isNavbarHidden).toBe(false)
  await screen.findByText('sidebar.admin.verification_rejected')
  expect(mockRouter.replace).toHaveBeenCalledTimes(1)
  expect(mockRouter.replace).toHaveBeenCalledWith(
    '/fi/luonnonmetsakartat/admin',
    { locale: false }
  )
  view.session(auth())
  act(() => useUIStore.getState().setIsNavbarHidden(false))
  await flush()
  expect(mockRouter.replace).toHaveBeenCalledTimes(1)
  expect(protectedRender).not.toHaveBeenCalled()
  view.unmount()
  expect(useUIStore.getState().isNavbarHidden).toBe(true)
})
it('closes verified editing on infrastructure failure for a replacement token', async () => {
  let calls = 0
  const pending = deferred<ReturnType<typeof response>>()
  pages.http((url) =>
    url.endsWith('/validate')
      ? ++calls === 1
        ? response({ is_editor: true })
        : pending.promise
      : response([])
  )
  const view = pages.render(gate)
  await screen.findByRole('link', { name: 'sidebar.admin.upload' })
  protectedRender.mockClear()
  view.session(auth({ token: 'synthetic-replacement' }))
  noEditor()
  expect(protectedRender).not.toHaveBeenCalled()
  await act(async () => pending.reject(httpError(503)))
  expect(
    await screen.findByText('sidebar.admin.verification_errored')
  ).toBeInTheDocument()
  noEditor()
  expect(calls).toBe(2)
})
it('rejects an absent user identity without reusing a verified session', async () => {
  pages.http((url) =>
    response(url.endsWith('/validate') ? { is_admin: true } : [])
  )
  const view = pages.render(gate)
  await screen.findByRole('link', { name: 'sidebar.admin.upload' })
  const malformed = auth()
  delete (malformed.data as Partial<NonNullable<typeof malformed.data>>).user
  protectedRender.mockClear()
  view.session(malformed)
  expect(
    screen.getByText('sidebar.admin.verification_errored')
  ).toBeInTheDocument()
  noEditor()
  expect(protectedRender).not.toHaveBeenCalled()
})
it('waits for token resolution, verifies once ready, and rejects a missing token', async () => {
  let validations = 0
  pages.http((url) => {
    if (url.endsWith('/validate')) {
      validations++
      return response({ is_editor: true })
    }
    return response([])
  })
  const resolving = { ...auth({ token: '' }), isAccessTokenLoading: true }
  const view = pages.render(gate, { initialAuth: resolving })
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
  expect(validations).toBe(0)
  noEditor()
  view.session(auth())
  await screen.findByRole('link', { name: 'sidebar.admin.upload' })
  const missing = auth()
  delete missing.data!.accessToken
  view.session(missing)
  expect(
    screen.getByText('sidebar.admin.verification_errored')
  ).toBeInTheDocument()
  noEditor()
  expect(validations).toBe(1)
})
it('does not trust stale store verification when mounting with a fresh QueryClient', async () => {
  const VerifyOnly = () => {
    useQuery(useAdminVerificationQueryOptions())
    return null
  }
  pages.http(() => response({ is_admin: true }))
  const previous = pages.render(<VerifyOnly />)
  await waitFor(() =>
    expect(useAppletStore.getState().adminVerificationStatus).toBe(
      Status.Verified
    )
  )
  previous.unmount()
  expect(useAppletStore.getState().adminVerificationStatus).toBe(
    Status.Verified
  )
  const pending = deferred<ReturnType<typeof response>>()
  pages.http(() => pending.promise)
  const view = pages.render(gate)
  expect(view.client).not.toBe(previous.client)
  noEditor()
  expect(protectedRender).not.toHaveBeenCalled()
  await act(async () => pending.resolve(response({})))
  await screen.findByText('sidebar.admin.verification_rejected')
  noEditor()
})
