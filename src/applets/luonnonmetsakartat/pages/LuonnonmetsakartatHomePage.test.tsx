import {
  areas,
  deferred,
  flush,
  httpError,
  layer,
  loggedOut,
  response,
  setupPages,
} from './pageTestSupport'
import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import LuonnonmetsakartatHomePage from './LuonnonmetsakartatHomePage'
import { useMapStore } from '#/common/store/mapStore'
import { useAppletStore } from '../state/appletStore'
import { getFolayerGroupId } from '../common/utils'

const pages = setupPages()
it('loads anonymous rows, toggles the real public groups in both directions and excludes admin records', async () => {
  const pending = deferred<ReturnType<typeof response>>()
  pages.http((url, config) => {
    expect(config?.headers?.Authorization).toBeUndefined()
    if (url.endsWith('/layers')) return pending.promise
    if (url.includes('/ows?')) return response(areas())
    throw new Error(`Unhandled ${url}`)
  })
  useAppletStore.setState({
    adminFolayerConfs: {
      private: {
        ...layer({ id: 'private', name: 'Private forest' }),
        colorCode: '#123456',
        isVisible: false,
      } as never,
    },
  })
  pages.render(<LuonnonmetsakartatHomePage />, { initialAuth: loggedOut })
  expect(await screen.findByRole('progressbar')).toBeInTheDocument()
  await act(async () =>
    pending.resolve(
      response([layer(), layer({ id: 'layer-b', name: 'Second forest' })])
    )
  )
  const toggle = await screen.findByRole('button', {
    name: 'Toggle Public forest',
  })
  expect(
    screen.getByRole('button', { name: 'Toggle Second forest' })
  ).toBeInTheDocument()
  expect(screen.queryByText('Private forest')).not.toBeInTheDocument()
  const id = getFolayerGroupId('layer-a', false)
  await waitFor(() =>
    expect(useMapStore.getState()._layerGroups[id]).toBeDefined()
  )
  fireEvent.click(toggle)
  await waitFor(() =>
    expect(useMapStore.getState()._layerGroups[id].isHidden).toBe(false)
  )
  fireEvent.click(toggle)
  await waitFor(() =>
    expect(useMapStore.getState()._layerGroups[id].isHidden).toBe(true)
  )
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})
it('shows an empty success and replaces a previously populated public list', async () => {
  pages.http(() => response([]))
  useAppletStore.getState().setFolayerConfs([
    {
      id: 'old',
      name: 'Old forest',
      colorCode: '#123456',
      createdTs: 1,
      updatedTs: 1,
    },
  ])
  pages.render(<LuonnonmetsakartatHomePage />, { initialAuth: loggedOut })
  expect(await screen.findByText('sidebar.main.no_data')).toBeInTheDocument()
  expect(screen.queryByText('Old forest')).not.toBeInTheDocument()
  expect(useAppletStore.getState().folayerConfs).toEqual({})
})
it('renders failed list feedback after bounded retries and recovers on remount', async () => {
  jest.useFakeTimers()
  let calls = 0
  pages.http(() => {
    calls++
    throw httpError(503)
  })
  const view = pages.render(<LuonnonmetsakartatHomePage />, {
    initialAuth: loggedOut,
  })
  await act(async () => {
    await jest.advanceTimersByTimeAsync(5000)
  })
  expect(calls).toBe(4)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'sidebar.admin.folayer.error_fetching'
  )
  expect(screen.queryByText('sidebar.main.no_data')).not.toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  view.unmount()
  pages.http(() => response([]))
  pages.render(<LuonnonmetsakartatHomePage />, {
    initialAuth: loggedOut,
    client: view.client,
  })
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10)
  })
  expect(screen.getByText('sidebar.main.no_data')).toBeInTheDocument()
})
it('renders area dependency failure rather than hanging or reporting an empty list', async () => {
  jest.useFakeTimers()
  let areaCalls = 0
  pages.http((url) => {
    if (url.endsWith('/layers')) return response([layer()])
    areaCalls++
    throw httpError(503)
  })
  pages.render(<LuonnonmetsakartatHomePage />, { initialAuth: loggedOut })
  await act(async () => {
    await jest.advanceTimersByTimeAsync(5000)
  })
  expect(areaCalls).toBe(4)
  expect(screen.getByRole('alert')).toHaveTextContent(
    'sidebar.admin.folayer.error_fetching'
  )
  expect(
    screen.getByRole('button', { name: 'Toggle Public forest' })
  ).toBeInTheDocument()
  expect(screen.queryByText('sidebar.main.no_data')).not.toBeInTheDocument()
})
it('keeps a usable row with missing GeoServer config without making malformed requests', async () => {
  delete process.env.PUBLIC_GEOSERVER_URL
  let calls = 0
  pages.http((url) => {
    expect(url).toBe('/api/luonnonmetsakartat/layers')
    calls++
    return response([layer()])
  })
  pages.render(<LuonnonmetsakartatHomePage />, { initialAuth: loggedOut })
  expect(
    await screen.findByRole('button', { name: 'Toggle Public forest' })
  ).toBeInTheDocument()
  await flush()
  expect(calls).toBe(1)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
it('retains public rows on failed refresh while showing failure feedback', async () => {
  jest.useFakeTimers()
  let failing = false
  pages.http((url) => {
    if (url.endsWith('/layers')) {
      if (failing) throw httpError(503)
      return response([layer()])
    }
    return response(areas())
  })
  const view = pages.render(<LuonnonmetsakartatHomePage />, {
    initialAuth: loggedOut,
  })
  await act(async () => {
    await jest.advanceTimersByTimeAsync(20)
  })
  expect(
    screen.getByRole('button', { name: 'Toggle Public forest' })
  ).toBeInTheDocument()
  failing = true
  // Disabled queries intentionally refetch through mount, as in the production page.
  view.unmount()
  pages.render(<LuonnonmetsakartatHomePage />, {
    initialAuth: loggedOut,
    client: view.client,
  })
  await act(async () => {
    await jest.advanceTimersByTimeAsync(5000)
  })
  expect(
    screen.getByRole('button', { name: 'Toggle Public forest' })
  ).toBeInTheDocument()
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.queryByText('sidebar.main.no_data')).not.toBeInTheDocument()
})
