import {
  adminPath,
  areas,
  auth,
  deferred,
  flush,
  httpError,
  layer,
  loggedOut,
  mockNavigation,
  response,
  setupPages,
} from '../pageTestSupport'
import React from 'react'
import { act, screen, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'
import Gate from './LuonnonmetsakartatAdminGate'
import List from './LuonnonmetsakartatAdminPage'
import Runtime from './layer/folayer/LuonnonmetsakartatAdminLayerFolayerRuntime'
import Detail from './layer/folayer/LuonnonmetsakartatAdminLayerFolayerPage'
import Home from '../LuonnonmetsakartatHomePage'
import { useAppletStore } from '../../state/appletStore'
import { useMapStore } from '#/common/store/mapStore'
import { MapPopupHandler } from '#/components/Map/MapPopupHandler'
import {
  getFolayerGroupId,
  getFolayerCentroidSourceId,
} from '../../common/utils'
import AreaModalAdmin from '../../components/AreaModalAdmin'
import * as mapUtils from '#/common/utils/map'

const pages = setupPages()
const list = (
  <Gate>
    <List />
  </Gate>
)
const detail = (
  <Gate>
    <Runtime>
      <Detail />
    </Runtime>
  </Gate>
)
it('revokes private rows, areas, selection and external popup before entering the public page', async () => {
  let anonymousAreas = 0
  pages.http((url, config) => {
    if (url.endsWith('/validate')) return response({ is_admin: true })
    const admin = !!config?.headers?.Authorization
    if (url.endsWith('/layers'))
      return response(
        admin
          ? [
              layer(),
              layer({ id: 'hidden', name: 'Hidden forest', hidden: true }),
            ]
          : [layer()]
      )
    if (url.includes('/ows?')) {
      if (!admin) anonymousAreas++
      return response(areas(admin ? 'Private area' : 'Anonymous area'))
    }
    throw new Error(`Unhandled ${url}`)
  })
  const client = new QueryClient()
  client.setQueryData(['unrelated'], 'keep-query')
  client.setQueryData(['folayers'], ['keep-public-cache'])
  await useMapStore.getState().addLayerGroup('other-applet', {
    layerConf: {
      id: 'other-applet',
      style: {
        version: 8,
        sources: {
          unrelated: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
        },
        layers: [],
      },
    },
  })
  const view = pages.render(
    <>
      {list}
      <MapPopupHandler />
    </>,
    { client }
  )
  await screen.findByRole('link', { name: 'Open Hidden forest' })
  await waitFor(() =>
    expect(
      useAppletStore.getState().folayerAreaConfs['layer-a']?.data.features[0]
        ?.properties.name
    ).toBe('Private area')
  )
  const source = getFolayerCentroidSourceId('layer-a', true)
  const feature = { ...areas('Private area').features[0], source } as never
  const unrelated = {
    ...areas('Other applet').features[0],
    id: 'other',
    source: 'unrelated',
  } as never
  act(() => {
    useMapStore.getState().setSelectedFeatures([feature, unrelated])
    useMapStore.setState({
      activePopupData: [
        {
          type: 'modal',
          component: AreaModalAdmin,
          features: [feature],
        } as never,
      ],
    })
    useAppletStore.getState().setFolayerConfs([
      {
        id: 'layer-a',
        name: 'Public forest',
        colorCode: '#123456',
        createdTs: 1,
        updatedTs: 2,
      },
    ])
  })
  expect(
    await screen.findByRole('button', { name: 'Editor popup' })
  ).toBeInTheDocument()
  view.session(loggedOut)
  expect(
    screen.queryByRole('button', { name: 'Editor popup' })
  ).not.toBeInTheDocument()
  expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
  expect(useAppletStore.getState().folayerAreaConfs).toEqual({})
  expect(useAppletStore.getState().folayerConfs['layer-a'].name).toBe(
    'Public forest'
  )
  expect(useMapStore.getState().selectedFeatures).toEqual([unrelated])
  expect(client.getQueryData(['unrelated'])).toBe('keep-query')
  expect(client.getQueryData(['folayers'])).toEqual(['keep-public-cache'])
  view.session(
    loggedOut,
    <>
      <Home />
      <MapPopupHandler />
    </>
  )
  expect(
    await screen.findByRole('button', { name: 'Toggle Public forest' })
  ).toBeInTheDocument()
  await waitFor(() => expect(anonymousAreas).toBe(1))
  await waitFor(() =>
    expect(
      useAppletStore.getState().folayerAreaConfs['layer-a']?.data.features[0]
        ?.properties.name
    ).toBe('Anonymous area')
  )
  expect(screen.queryByText('Hidden forest')).not.toBeInTheDocument()
  expect(
    useMapStore.getState()._layerGroups[getFolayerGroupId('layer-a', true)]
  ).toBeUndefined()
  expect(client.getQueryData(['adminFolayers'])).toBeUndefined()
  expect(useMapStore.getState()._layerGroups['other-applet']).toBeDefined()
  view.unmount()
  await flush()
  expect(useMapStore.getState()._layerGroups['other-applet'].isHidden).toBe(
    false
  )
  expect(
    useMapStore.getState()._layerGroups[getFolayerGroupId('layer-a', true)]
  ).toBeUndefined()
})
it.each(['list', 'detail', 'areas'] as const)(
  'does not restore privileged data or map groups from late %s reads',
  async (kind) => {
    const old = deferred<ReturnType<typeof response>>()
    let pendingCalls = 0
    pages.http((url) => {
      if (url.endsWith('/validate')) return response({ is_editor: true })
      if (url.endsWith('/layers')) {
        if (kind === 'list') {
          pendingCalls++
          return old.promise
        }
        return response([layer()])
      }
      if (url.includes('/layer/')) {
        if (kind === 'detail') {
          pendingCalls++
          return old.promise
        }
        return response(layer())
      }
      if (url.includes('/ows?')) {
        if (kind === 'areas') {
          pendingCalls++
          return old.promise
        }
        return response(areas('Private area'))
      }
      throw new Error(`Unhandled ${url}`)
    })
    if (kind !== 'list') {
      mockNavigation.setState({ pathname: `${adminPath}/layer/layer-a` })
    }
    const view = pages.render(kind === 'list' ? list : detail)
    await waitFor(() => expect(pendingCalls).toBe(1))
    view.session(loggedOut)
    await act(async () =>
      old.resolve(
        response(
          kind === 'list'
            ? [layer({ id: 'hidden', name: 'Hidden forest', hidden: true })]
            : kind === 'detail'
              ? layer()
              : areas('Private area')
        )
      )
    )
    await flush()
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
    expect(useAppletStore.getState().folayerAreaConfs).toEqual({})
    expect(Object.keys(useMapStore.getState()._layerGroups)).toEqual([])
    expect(
      screen.queryByRole('link', {
        name: 'sidebar.admin.folayer.open_settings',
      })
    ).not.toBeInTheDocument()
  }
)
it.each(['logout', 'missing-token', 'rejected', 'error'])(
  'closes actual detail settings/pictures links after %s',
  async (transition) => {
    let validations = 0
    pages.http((url) => {
      if (url.endsWith('/validate')) {
        if (++validations === 1) return response({ is_admin: true })
        if (transition === 'error') return Promise.reject(httpError(503))
        return response({})
      }
      if (url.includes('/layer/')) return response(layer())
      if (url.includes('/ows?')) return response(areas())
      throw new Error(`Unhandled ${url}`)
    })
    mockNavigation.setState({ pathname: `${adminPath}/layer/layer-a` })
    const view = pages.render(detail)
    await screen.findByRole('link', {
      name: 'sidebar.admin.folayer.open_settings',
    })
    expect(
      screen.getByRole('link', { name: 'sidebar.admin.folayer.open_pictures' })
    ).toBeInTheDocument()
    view.session(
      transition === 'logout'
        ? loggedOut
        : auth({ token: transition === 'missing-token' ? '' : 'synthetic-b' })
    )
    expect(
      screen.queryByRole('link', {
        name: 'sidebar.admin.folayer.open_settings',
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: 'sidebar.admin.folayer.open_pictures',
      })
    ).not.toBeInTheDocument()
    await flush()
    expect(useAppletStore.getState().adminFolayerConfs).toEqual({})
  }
)

// Keep the production queue, style installation and popup ownership. The map
// instance is null here; the live counterpart also checks real WebGL sources.
it.each(['list preload', 'detail enable'])(
  'discards queued %s after revocation and public navigation',
  async (surface) => {
    pages.http((url, config) => {
      if (url.endsWith('/validate')) return response({ is_editor: true })
      if (url.endsWith('/layers')) return response([layer()])
      if (url.includes('/layer/')) return response(layer())
      if (url.includes('/ows?'))
        return response(
          areas(
            config?.headers?.Authorization ? 'Private area' : 'Anonymous area'
          )
        )
      throw new Error(`Unhandled ${url}`)
    })
    const original = useMapStore.getInitialState()
    useMapStore.setState({
      isLoaded: false,
      addLayerGroup: original.addLayerGroup,
      _addStyle: original._addStyle,
    })
    if (surface === 'detail enable') {
      mockNavigation.setState({ pathname: `${adminPath}/layer/layer-a` })
    }
    const view = pages.render(
      <>
        {surface === 'list preload' ? list : detail}
        <MapPopupHandler />
      </>
    )
    const id = getFolayerGroupId('layer-a', true)
    await waitFor(() =>
      expect(
        useMapStore
          .getState()
          ._functionQueue.some((item) => item.args[0] === id)
      ).toBe(true)
    )
    expect(useMapStore.getState()._layerGroups[id]).toBeUndefined()
    // Unrelated queued work must still execute after the map becomes ready.
    const other = useMapStore.getState().addLayerGroup('other-applet', {
      layerConf: {
        id: 'other-applet',
        style: { version: 8, sources: {}, layers: [] },
      },
    })
    const installations: string[] = []
    const unsubscribe = useMapStore.subscribe((state) => {
      if (state._layerGroups[id]) installations.push(id)
    })
    try {
      view.session(loggedOut)
      view.session(
        loggedOut,
        <>
          <Home />
          <MapPopupHandler />
        </>
      )
      await screen.findByRole('button', { name: 'Toggle Public forest' })
      await act(async () => {
        useMapStore.setState({ isLoaded: true })
        await useMapStore.getState()._executeFunctionQueue()
        await other
      })
      await flush()
    } finally {
      unsubscribe()
    }
    expect(installations).toEqual([])
    expect(useMapStore.getState()._functionQueue).toEqual([])
    expect(useMapStore.getState()._isFunctionQueueExecuting).toBe(false)
    expect(useMapStore.getState()._layerGroups[id]).toBeUndefined()
    expect(useMapStore.getState()._dataSyncSubscriptions[id]).toBeUndefined()
    expect(useMapStore.getState().searchableDatas[id]).toBeUndefined()
    expect(useMapStore.getState()._layerGroups['other-applet']).toBeDefined()
    expect(
      screen.queryByRole('button', { name: 'Editor popup' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', {
        name: 'sidebar.admin.folayer.open_settings',
      })
    ).not.toBeInTheDocument()
    await waitFor(() =>
      expect(
        useAppletStore.getState().folayerAreaConfs['layer-a']?.data.features[0]
          ?.properties.name
      ).toBe('Anonymous area')
    )
    await waitFor(() =>
      expect(
        useMapStore.getState()._layerGroups[getFolayerGroupId('layer-a', false)]
      ).toBeDefined()
    )
  }
)

it('discards an admin installation already resolving its style when access is revoked', async () => {
  pages.http((url) => {
    if (url.endsWith('/validate')) return response({ is_editor: true })
    if (url.includes('/layer/')) return response(layer())
    if (url.includes('/ows?')) return response(areas('Private area'))
    throw new Error(`Unhandled ${url}`)
  })
  const pending = deferred<void>()
  const resolveStyle = mapUtils.resolveMbStyle
  const resolving = jest
    .spyOn(mapUtils, 'resolveMbStyle')
    .mockImplementation(async (style) => {
      await pending.promise
      return resolveStyle(style)
    })
  const original = useMapStore.getInitialState()
  useMapStore.setState({
    isLoaded: true,
    addLayerGroup: original.addLayerGroup,
    _addStyle: original._addStyle,
  })
  mockNavigation.setState({ pathname: `${adminPath}/layer/layer-a` })
  const view = pages.render(
    <>
      {detail}
      <MapPopupHandler />
    </>
  )
  await waitFor(() => expect(resolving).toHaveBeenCalledTimes(1))
  view.session(loggedOut)
  await act(async () => pending.resolve())
  await flush()
  const id = getFolayerGroupId('layer-a', true)
  expect(useMapStore.getState()._layerGroups[id]).toBeUndefined()
  expect(useMapStore.getState()._layerGroupIdsBeingProcessed.size).toBe(0)
  expect(useMapStore.getState()._dataSyncSubscriptions).toEqual({})
  expect(useMapStore.getState().searchableDatas).toEqual({})
  expect(
    screen.queryByRole('button', { name: 'Editor popup' })
  ).not.toBeInTheDocument()
})
