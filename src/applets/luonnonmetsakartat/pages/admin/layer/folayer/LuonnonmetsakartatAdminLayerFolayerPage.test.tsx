import {
  areas,
  auth,
  flush,
  deferred,
  layer,
  httpError,
  mockNavigation,
  mockRouter,
  response,
  setupPages,
} from 'applets/luonnonmetsakartat/pages/pageTestSupport'
import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import LuonnonmetsakartatAdminGate from 'applets/luonnonmetsakartat/pages/admin/LuonnonmetsakartatAdminGate'
import Runtime from './LuonnonmetsakartatAdminLayerFolayerRuntime'
import List from 'applets/luonnonmetsakartat/pages/admin/LuonnonmetsakartatAdminPage'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { FolayerConfState } from 'applets/luonnonmetsakartat/common/types'
import Page from './LuonnonmetsakartatAdminLayerFolayerPage'
import { useMapStore } from '#/common/store/mapStore'
import { getFolayerGroupId } from 'applets/luonnonmetsakartat/common/utils'

const pages = setupPages()
const page = (
  <LuonnonmetsakartatAdminGate>
    <Runtime>
      <Page />
    </Runtime>
  </LuonnonmetsakartatAdminGate>
)
const ListDetailRoutes = () => {
  const pathname = mockNavigation((state) => state.pathname)
  return (
    <LuonnonmetsakartatAdminGate>
      {pathname.includes('/layer/') ? (
        <Runtime>
          <Page />
        </Runtime>
      ) : (
        <List />
      )}
    </LuonnonmetsakartatAdminGate>
  )
}
it.each([true, false])(
  'loads the actual detail, named areas (%s) and parameterized editing links',
  async (withAreas) => {
    const pending = deferred<ReturnType<typeof response>>()
    pages.http((url) => {
      if (url.endsWith('/validate')) return response({ is_admin: true })
      if (url.includes('/layer/')) return pending.promise
      if (url.includes('/ows?'))
        return response(withAreas ? areas('Protected area') : { features: [] })
      throw new Error(`Unhandled ${url}`)
    })
    const view = pages.render(page)
    await waitFor(() =>
      expect(
        view.client.getQueryState(['adminFolayer', 'layer-a'])?.fetchStatus
      ).toBe('fetching')
    )
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: 'sidebar.admin.folayer.open_settings',
      })
    ).not.toBeInTheDocument()
    await act(async () => pending.resolve(response(layer())))
    expect(
      await screen.findByRole('heading', { name: 'Public forest' })
    ).toBeInTheDocument()
    expect(document.title).toBe('Luonnonmetsakartat / Admin - Public forest')
    expect(
      screen.getByRole('link', { name: 'sidebar.admin.folayer.open_settings' })
    ).toHaveAttribute(
      'href',
      '/fi/luonnonmetsakartat/admin/layer/layer-a/settings'
    )
    const pictures = screen.getByRole('link', {
      name: 'sidebar.admin.folayer.open_pictures',
    })
    expect(pictures).toHaveAttribute(
      'href',
      '/fi/luonnonmetsakartat/admin/layer/layer-a/pictures'
    )
    await waitFor(() =>
      expect(
        useMapStore.getState()._layerGroups[getFolayerGroupId('layer-a', true)]
          ?.isHidden
      ).toBe(false)
    )
    if (withAreas)
      expect(
        await screen.findByRole('button', { name: 'Protected area' })
      ).toBeInTheDocument()
    else expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(pictures)
    expect(mockRouter.push).toHaveBeenCalledWith(
      '/fi/luonnonmetsakartat/admin/layer/layer-a/pictures'
    )
  }
)
it('loads the new route ID without stale heading, areas, links or layer configuration', async () => {
  const second = deferred<ReturnType<typeof response>>()
  pages.http((url) => {
    if (url.endsWith('/validate')) return response({ is_editor: true })
    if (url.endsWith('/layer/layer-a')) return response(layer())
    if (url.endsWith('/layer/layer-b')) return second.promise
    if (url.includes('/ows?'))
      return response(
        areas(url.includes('layerb') ? 'Second area' : 'First area')
      )
    throw new Error(`Unhandled ${url}`)
  })
  const previousTitle = document.title
  const view = pages.render(page)
  await screen.findByRole('heading', { name: 'Public forest' })
  await screen.findByRole('button', { name: 'First area' })
  act(() => mockNavigation.setState({ params: { folayerIdSlug: 'layer-b' } }))
  expect(screen.queryByText('Public forest')).not.toBeInTheDocument()
  expect(screen.queryByText('First area')).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
  await waitFor(() =>
    expect(
      view.client.getQueryState(['adminFolayer', 'layer-b'])?.fetchStatus
    ).toBe('fetching')
  )
  await act(async () =>
    second.resolve(response(layer({ id: 'layer-b', name: 'Second forest' })))
  )
  expect(
    await screen.findByRole('heading', { name: 'Second forest' })
  ).toBeInTheDocument()
  expect(
    await screen.findByRole('button', { name: 'Second area' })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'sidebar.admin.folayer.open_settings' })
  ).toHaveAttribute(
    'href',
    '/fi/luonnonmetsakartat/admin/layer/layer-b/settings'
  )
  const group = getFolayerGroupId('layer-b', true)
  await waitFor(() =>
    expect(useMapStore.getState()._layerGroups[group]?.isHidden).toBe(false)
  )
  expect(useMapStore.getState().addLayerGroup).toHaveBeenCalledWith(
    group,
    expect.objectContaining({
      layerConf: expect.objectContaining({ id: group }),
    })
  )
  view.unmount()
  expect(document.title).toBe(previousTitle)
})
it('settles map initialization through a StrictMode mount cycle', async () => {
  pages.http((url) => {
    if (url.endsWith('/validate')) return response({ is_editor: true })
    if (url.includes('/layer/')) return response(layer())
    if (url.includes('/ows?')) return response(areas())
    throw new Error(`Unhandled ${url}`)
  })
  pages.render(<React.StrictMode>{page}</React.StrictMode>)
  await screen.findByRole('heading', { name: 'Public forest' })
  await waitFor(() =>
    expect(
      useMapStore.getState()._layerGroups[getFolayerGroupId('layer-a', true)]
        ?.isHidden
    ).toBe(false)
  )
})
it('shows a bounded area-dependency error while retaining loaded detail navigation', async () => {
  jest.useFakeTimers()
  let areaCalls = 0
  const firstArea = deferred<ReturnType<typeof response>>()
  pages.http((url) => {
    if (url.endsWith('/validate')) return response({ is_editor: true })
    if (url.includes('/layer/')) return response(layer())
    if (url.includes('/ows?')) {
      areaCalls++
      if (areaCalls === 1) return firstArea.promise
      throw httpError(503)
    }
    throw new Error(`Unhandled ${url}`)
  })
  pages.render(page)
  await screen.findByRole('heading', { name: 'Public forest' })
  await waitFor(() => expect(areaCalls).toBe(1))
  await act(async () => {
    firstArea.reject(httpError(503))
    await jest.advanceTimersByTimeAsync(5000)
  })
  expect(areaCalls).toBe(4)
  expect(
    screen.getByRole('heading', { name: 'Public forest' })
  ).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'sidebar.admin.folayer.error_fetching'
  )
  expect(
    screen.getByRole('link', { name: 'sidebar.admin.folayer.open_settings' })
  ).toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
})

it('finishes list area preload across actual detail navigation without restarting or stranding the read', async () => {
  const pending = deferred<ReturnType<typeof response>>()
  let areaCalls = 0
  pages.http((url) => {
    if (url.endsWith('/validate')) return response({ is_editor: true })
    if (url.endsWith('/layers')) return response([layer()])
    if (url.includes('/layer/')) return response(layer())
    if (url.includes('/ows?')) {
      areaCalls++
      return pending.promise
    }
    throw new Error(`Unhandled ${url}`)
  })
  const view = pages.render(<ListDetailRoutes />)
  const open = await screen.findByRole('link', { name: 'Open Public forest' })
  await waitFor(() => expect(areaCalls).toBe(1))
  expect(useAppletStore.getState().folayerAreaConfs['layer-a'].state).toBe(
    FolayerConfState.Fetching
  )
  fireEvent.click(open)
  await screen.findByRole('heading', { name: 'Public forest' })
  expect(
    screen.queryByRole('button', { name: 'Expected forest area' })
  ).not.toBeInTheDocument()
  await act(async () =>
    pending.resolve(response(areas('Expected forest area')))
  )
  expect(
    await screen.findByRole('button', { name: 'Expected forest area' })
  ).toBeInTheDocument()
  await waitFor(() =>
    expect(
      view.client.getQueryState(['adminFolayerAreas', 'layer-a'])?.fetchStatus
    ).toBe('idle')
  )
  expect(useAppletStore.getState().folayerAreaConfs['layer-a'].state).toBe(
    FolayerConfState.Idle
  )
  view.session(auth(), <ListDetailRoutes />)
  await flush()
  expect(areaCalls).toBe(1)
  expect(
    screen.getByRole('link', { name: 'sidebar.admin.folayer.open_settings' })
  ).toHaveAttribute(
    'href',
    '/fi/luonnonmetsakartat/admin/layer/layer-a/settings'
  )
})

it('settles a populated list refresh after list → detail → list → detail navigation under the same gate', async () => {
  const refresh = deferred<ReturnType<typeof response>>()
  let listCalls = 0
  let validationCalls = 0
  pages.http((url) => {
    if (url.endsWith('/validate')) {
      validationCalls++
      return response({ is_editor: true })
    }
    if (url.endsWith('/layers')) {
      return ++listCalls === 1 ? response([layer()]) : refresh.promise
    }
    if (url.includes('/ows?')) return response(areas())
    throw new Error(`Unhandled ${url}`)
  })
  const view = pages.render(<ListDetailRoutes />)
  fireEvent.click(
    await screen.findByRole('link', { name: 'Open Public forest' })
  )
  await screen.findByRole('heading', { name: 'Public forest' })
  await screen.findByRole('button', { name: 'Public area' })
  const generation = useAppletStore.getState().adminAccessGeneration

  act(() => mockRouter.push('/fi/luonnonmetsakartat/admin'))
  await waitFor(() => expect(listCalls).toBe(2))
  expect(view.client.getQueryState(['adminFolayers'])?.fetchStatus).toBe(
    'fetching'
  )
  expect(useAppletStore.getState().adminFolayerConfs['layer-a'].state).toBe(
    FolayerConfState.Fetching
  )
  fireEvent.click(screen.getByRole('link', { name: 'Open Public forest' }))
  await act(async () => refresh.resolve(response([layer()])))
  await flush()

  expect(useAppletStore.getState().adminFolayerConfs['layer-a'].state).toBe(
    FolayerConfState.Idle
  )
  expect(view.client.getQueryState(['adminFolayers'])).toMatchObject({
    fetchStatus: 'idle',
    status: 'success',
  })
  expect(
    screen.getByRole('heading', { name: 'Public forest' })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Public area' })
  ).toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  for (const [key, destination] of [
    ['open_settings', 'settings'],
    ['open_pictures', 'pictures'],
  ]) {
    expect(
      screen.getByRole('link', { name: `sidebar.admin.folayer.${key}` })
    ).toHaveAttribute(
      'href',
      `/fi/luonnonmetsakartat/admin/layer/layer-a/${destination}`
    )
  }
  view.session(auth(), <ListDetailRoutes />)
  await flush()
  expect(listCalls).toBe(2)
  expect(validationCalls).toBe(1)
  expect(useAppletStore.getState().adminAccessGeneration).toBe(generation)
})
