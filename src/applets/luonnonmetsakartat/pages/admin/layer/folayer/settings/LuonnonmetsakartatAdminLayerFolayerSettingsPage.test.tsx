import React from 'react'
import {
  adminPath,
  deferred,
  httpError,
  mockNavigation,
  mockRouter,
  response,
  setupPages,
} from 'applets/luonnonmetsakartat/pages/pageTestSupport'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import axios from 'axios'
import type { QueryClient } from '@tanstack/react-query'
import SettingsPage from './LuonnonmetsakartatAdminLayerFolayerSettingsPage'
import ConfirmationDialog from '#/components/Notification/ConfirmationDialog'
import NotificationProvider from '#/components/Notification/NotificationProvider'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import {
  FolayerConfState,
  type AdminFolayerConf,
  type FolayerAreaConf,
} from 'applets/luonnonmetsakartat/common/types'
import { expectedColumns } from 'applets/luonnonmetsakartat/common/shapefileTestData'
import { getFolayerGroupId } from 'applets/luonnonmetsakartat/common/utils'
import { useUIStore } from '#/common/store/uiStore'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { LayerOrderLevel } from '#/common/types/map'

// Disable retries only: exercise the real request, normalization and callbacks.
jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerPatchMutation',
  () => {
    const actual = jest.requireActual(
      'applets/luonnonmetsakartat/common/queries/adminFolayerPatchMutation'
    )
    return {
      useAdminFolayerPatchMutationOptions: () => ({
        ...actual.useAdminFolayerPatchMutationOptions(),
        retry: false,
      }),
    }
  }
)
jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerDeleteMutation',
  () => {
    const actual = jest.requireActual(
      'applets/luonnonmetsakartat/common/queries/adminFolayerDeleteMutation'
    )
    return {
      useAdminFolayerDeleteMutationOptions: () => ({
        ...actual.useAdminFolayerDeleteMutationOptions(),
        retry: false,
      }),
    }
  }
)

const ownedResponses: Array<() => void> = []
let client: QueryClient | undefined
let fakeTimers = false
let originalMap: ReturnType<typeof useMapInstanceStore.getState>
// Settle owned work even when an assertion fails, before the shared teardown.
afterEach(async () => {
  await act(async () => {
    ownedResponses.splice(0).forEach((finish) => finish())
    if (fakeTimers) await jest.advanceTimersByTimeAsync(0)
  })
  await waitFor(() => expect(client?.isMutating() ?? 0).toBe(0))
  useMapInstanceStore.setState(originalMap, true)
  client = undefined
  fakeTimers = false
})
const pages = setupPages()
beforeEach(() => {
  originalMap = useMapInstanceStore.getState()
  useMapInstanceStore.setState({ _map: null })
})
const controlled = <T,>(fallback: T) => {
  const request = deferred<T>()
  ownedResponses.push(() => request.resolve(fallback))
  return request
}
const clock = () => {
  jest.useFakeTimers()
  fakeTimers = true
}
const advanceName = async () => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(300)
  })
}
const label = (field: string) => `sidebar.admin.folayer.settings.${field}`
const button = (field: string) =>
  screen.getByRole('button', { name: label(field) })
const nameInput = () =>
  screen.getByRole('textbox', { name: label('name.header') })
const visibility = () =>
  screen.getByRole('switch', { name: label('is_visible') })
const save = async () => {
  await act(async () => {
    fireEvent.click(button('save'))
  })
}
const editName = (value: string) =>
  fireEvent.change(nameInput(), { target: { value } })
const selected = (id = 'layer-a') =>
  useAppletStore.getState().adminFolayerConfs[id]
const adminLayer = (id: string): AdminFolayerConf => ({
  id,
  name: `Forest ${id}`,
  colorCode: '#ff0000',
  createdTs: 1,
  updatedTs: 2,
  isVisible: true,
  state: FolayerConfState.Idle,
  unsyncedChanges: false,
  colOptions: expectedColumns,
})
const areaData = (id: string): FolayerAreaConf => ({
  id,
  state: FolayerConfState.Idle,
  data: { type: 'FeatureCollection', features: [] },
})
const savedLayer = (id = 'layer-a') => ({
  id,
  name: 'Completed server name',
  color_code: '#008866',
  is_hidden: false,
  created_ts: 1,
  updated_ts: 99,
  col_options: expectedColumns,
})
const setup = ({
  id = 'layer-a',
  state = FolayerConfState.Idle,
  dirty = false,
} = {}) => {
  const first = adminLayer('layer-a')
  const second = adminLayer('layer-b')
  useAppletStore.setState({
    adminFolayerConfs: {
      [first.id]: first,
      [second.id]: second,
      [id]: { ...adminLayer(id), state, unsyncedChanges: dirty },
    },
    folayerAreaConfs: {
      'layer-a': areaData('layer-a'),
      'layer-b': areaData('layer-b'),
    },
  })
  mockNavigation.setState({
    pathname: `${adminPath}/layer/${id}/settings`,
    params: { folayerIdSlug: id },
  })
  const view = pages.render(
    <NotificationProvider>
      <SettingsPage />
      <ConfirmationDialog />
    </NotificationProvider>
  )
  client = view.client
  return view
}
const expectSettled = async () => {
  await waitFor(() => expect(client!.isMutating()).toBe(0))
  await waitFor(() =>
    expect(useUIStore.getState().isSidebarLoading).toBe(false)
  )
  expect(useUIStore.getState()._activeSidebarLoaders.size).toBe(0)
}
const expectSaved = async (id = 'layer-a') => {
  await expectSettled()
  expect(nameInput()).toHaveValue('Completed server name')
  expect(visibility()).toBeChecked()
  expect(button('color').firstChild).toHaveStyle({ backgroundColor: '#008866' })
  expect(
    screen.queryByRole('button', { name: label('save') })
  ).not.toBeInTheDocument()
  expect(selected(id)).toMatchObject({
    name: 'Completed server name',
    colorCode: '#008866',
    unsyncedChanges: false,
    updatedTs: 99,
  })
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'notifications.folayer_update_success'
  )
}
const openDelete = async () => {
  fireEvent.keyDown(button('delete'), { key: 'Enter' })
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent(label('delete_confirmation_message'))
  expect(
    within(dialog).getByRole('button', {
      name: 'components.confirmation_dialog.cancel',
    })
  ).toBeEnabled()
  return dialog
}
const respond = async (action: 'confirm' | 'cancel') => {
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: `components.confirmation_dialog.${action}`,
      })
    )
  })
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
}
const consumeExpectedError = (error: Error) => {
  // The real onError logs once. Consume only that asserted call, keeping the
  // shared harness's strict guard for every other error intact.
  const spy = jest.mocked(console.error)
  expect(spy.mock.calls).toEqual([[error]])
  spy.mockClear()
}
const seedGroups = () => {
  const ids = ['layer-a', 'layer-b'].map((id) => getFolayerGroupId(id, true))
  const stops = [jest.fn(), jest.fn()]
  act(() =>
    useMapStore.setState({
      _layerGroups: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            id,
            isHidden: false,
            isProcessing: false,
            mapContext: 'main',
            persist: false,
            eventHandlers: [],
            orderLevel: LayerOrderLevel.LAYER,
            layers: {},
            sources: {
              [id]: {
                id,
                popupOpts: null,
                layerIds: [],
                type: 'geojson' as const,
                data: { type: 'FeatureCollection' as const, features: [] },
              },
            },
          },
        ])
      ),
      _dataSyncSubscriptions: Object.fromEntries(
        ids.map((id, i) => [id, { source: stops[i] }])
      ),
      _joinedSelectionSourceMap: ids.map((id) => [{ source: id }]),
    })
  )
  // Call through to real bookkeeping without a WebGL instance.
  const remove = jest.fn(useMapStore.getInitialState().removeLayerGroup)
  act(() => useMapStore.setState({ removeLayerGroup: remove }))
  return { ids, stops, remove }
}

describe('settings saves', () => {
  it('shows clean controls without requests; opening and closing color unchanged stays clean', async () => {
    setup()
    expect(nameInput()).toHaveValue('Forest layer-a')
    expect(visibility()).toBeChecked()
    expect(button('color').firstChild).toHaveStyle({
      backgroundColor: '#ff0000',
    })
    fireEvent.click(button('color'))
    const hue = await screen.findByRole('slider', { name: 'Hue' })
    expect(hue).toHaveAttribute('aria-valuenow', '0')
    fireEvent.keyDown(hue, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    )
    expect(selected().unsyncedChanges).toBe(false)
    expect(
      screen.queryByRole('button', { name: label('save') })
    ).not.toBeInTheDocument()
    expect(axios.patch).not.toHaveBeenCalled()
    expect(axios.delete).not.toHaveBeenCalled()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('debounces rapid name edits into only the selected layer and saves the final value', async () => {
    clock()
    setup()
    editName('First draft')
    editName('Final draft')
    expect(nameInput()).toHaveValue('Final draft')
    expect(selected().name).toBe('Forest layer-a')
    await advanceName()
    expect(selected()).toMatchObject({
      name: 'Final draft',
      unsyncedChanges: true,
    })
    expect(selected('layer-b')).toEqual(adminLayer('layer-b'))
    jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
    await save()
    await expectSaved()
    expect(
      (jest.mocked(axios.patch).mock.calls[0][1] as FormData).get('name')
    ).toBe('Final draft')
  })

  it.each(['unmount', 'layer change'] as const)(
    'cancels deferred name edits on %s',
    async (transition) => {
      clock()
      const view = setup()
      editName('Abandoned draft')
      if (transition === 'unmount') view.unmount()
      else
        act(() =>
          mockNavigation.setState({ params: { folayerIdSlug: 'layer-b' } })
        )
      await advanceName()
      expect(selected()).toEqual(adminLayer('layer-a'))
      expect(selected('layer-b')).toEqual(adminLayer('layer-b'))
      if (transition === 'layer change')
        expect(nameInput()).toHaveValue('Forest layer-b')
    }
  )

  it('commits a real keyboard color edit and both visibility directions to ordinary metadata saves', async () => {
    setup()
    fireEvent.click(button('color'))
    const hue = await screen.findByRole('slider', { name: 'Hue' })
    fireEvent.keyDown(hue, { key: 'ArrowRight', keyCode: 39, which: 39 })
    expect(hue).toHaveAttribute('aria-valuenow', '18')
    expect(selected().colorCode).toBe('#ff0000')
    fireEvent.keyDown(hue, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    )
    expect(selected()).toMatchObject({
      colorCode: '#ff4d00',
      unsyncedChanges: true,
    })
    expect(button('color').firstChild).toHaveStyle({
      backgroundColor: '#ff4d00',
    })
    fireEvent.click(visibility())
    expect(visibility()).not.toBeChecked()
    const request = controlled(response(savedLayer()))
    jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
    await save()
    await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1))
    expect(client!.getMutationCache().getAll()[0].state.variables).toEqual({
      ...adminLayer('layer-a'),
      colorCode: '#ff4d00',
      isVisible: false,
      unsyncedChanges: true,
    })
    expect(axios.patch).toHaveBeenCalledWith(
      '/api/luonnonmetsakartat/layer/layer-a',
      expect.any(FormData),
      expect.any(Object)
    )
    const form = jest.mocked(axios.patch).mock.calls[0][1] as FormData
    expect(form.get('is_hidden')).toBe('true')
    expect(form.has('zip_file')).toBe(false)
    expect(form.has('delete_areas_not_updated')).toBe(false)
    await act(async () =>
      request.resolve(response({ ...savedLayer(), is_hidden: true }))
    )
    await expectSettled()
    expect(visibility()).not.toBeChecked()
    fireEvent.click(visibility())
    expect(visibility()).toBeChecked()
    jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
    await save()
    await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(2))
    expect(
      (jest.mocked(axios.patch).mock.calls[1][1] as FormData).get('is_hidden')
    ).toBe('false')
    await expectSettled()
    expect(selected('layer-b')).toEqual(adminLayer('layer-b'))
  })

  it('saves an immediate name draft and cannot dirty the server result with its old timer', async () => {
    clock()
    setup()
    fireEvent.click(visibility())
    editName('Immediate draft')
    jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
    await save()
    await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1))
    expect(
      (jest.mocked(axios.patch).mock.calls[0][1] as FormData).get('name')
    ).toBe('Immediate draft')
    await expectSaved()
    await advanceName()
    expect(nameInput()).toHaveValue('Completed server name')
    expect(selected().unsyncedChanges).toBe(false)
  })

  it('disables repeated save and editing while the real request is pending; renders the server result', async () => {
    const view = setup()
    fireEvent.click(visibility())
    const request = controlled(response(savedLayer()))
    jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
    await save()
    await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(button('save')).toBeDisabled())
    expect(selected().state).toBe(FolayerConfState.Idle)
    await waitFor(() =>
      expect(useUIStore.getState().isSidebarLoading).toBe(true)
    )
    await save()
    expect(axios.patch).toHaveBeenCalledTimes(1)
    expect(nameInput()).toBeDisabled()
    expect(visibility()).toBeDisabled()
    expect(button('color')).toBeDisabled()
    expect(button('delete')).toHaveAttribute('aria-disabled', 'true')
    expect(view.container.querySelector('input[type="file"]')).toBeDisabled()
    fireEvent.keyDown(button('delete'), { key: 'Enter' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => request.resolve(response(savedLayer())))
    await expectSaved()
    expect(nameInput()).toBeEnabled()
    expect(selected('layer-b')).toEqual(adminLayer('layer-b'))
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('retains dirty name/color/visibility after save failure, settles loading, and permits retry', async () => {
    clock()
    setup()
    editName('Retry draft')
    await advanceName()
    fireEvent.click(button('color'))
    const hue = await screen.findByRole('slider', { name: 'Hue' })
    fireEvent.keyDown(hue, { key: 'ArrowRight', keyCode: 39, which: 39 })
    fireEvent.keyDown(hue, { key: 'Escape' })
    await waitFor(() =>
      expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    )
    fireEvent.click(visibility())
    const error = httpError(503)
    const request = controlled(response(savedLayer()))
    jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
    await save()
    await waitFor(() => expect(button('save')).toBeDisabled())
    await act(async () => {
      request.reject(error)
      await jest.advanceTimersByTimeAsync(0)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'notifications.folayer_creation_error'
    )
    consumeExpectedError(error)
    await expectSettled()
    expect(nameInput()).toHaveValue('Retry draft')
    expect(visibility()).not.toBeChecked()
    expect(button('color').firstChild).toHaveStyle({
      backgroundColor: '#ff4d00',
    })
    expect(selected()).toMatchObject({
      name: 'Retry draft',
      colorCode: '#ff4d00',
      isVisible: false,
      unsyncedChanges: true,
    })
    expect(button('save')).toBeEnabled()
    expect(nameInput()).toBeEnabled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(
      screen.queryByText('notifications.folayer_update_success')
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close notification' }))
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
    jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
    await save()
    await expectSaved()
    expect(axios.patch).toHaveBeenCalledTimes(2)
    expect(
      (jest.mocked(axios.patch).mock.calls[1][1] as FormData).get('name')
    ).toBe('Retry draft')
  })

  it('releases its loader on unmount while its owned request later settles', async () => {
    const view = setup()
    fireEvent.click(visibility())
    const request = controlled(response(savedLayer()))
    jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
    await save()
    await waitFor(() =>
      expect(useUIStore.getState().isSidebarLoading).toBe(true)
    )
    view.unmount()
    expect(useUIStore.getState().isSidebarLoading).toBe(false)
    expect(useUIStore.getState()._activeSidebarLoaders.size).toBe(0)
    await act(async () => request.resolve(response(savedLayer())))
    await expectSettled()
    expect(selected().unsyncedChanges).toBe(false)
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('keeps the seeded Saving scenario busy without issuing a request', () => {
    setup({ state: FolayerConfState.Saving, dirty: true })
    expect(button('save')).toBeDisabled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(axios.patch).not.toHaveBeenCalled()
  })
})

describe('layer deletion', () => {
  it('cancels the real confirmation, reopens, and waits for successful deletion and real map cleanup before navigating', async () => {
    const view = setup({ id: 'layer-b', dirty: true })
    const { ids, stops, remove } = seedGroups()
    const cleanupGate = controlled<void>(undefined)
    const realRemove = useMapStore.getInitialState().removeLayerGroup
    remove.mockImplementation(async (id) => {
      await cleanupGate.promise
      await realRemove(id)
    })
    const request = controlled(response({}, 204))
    jest.mocked(axios.delete).mockReturnValueOnce(request.promise)
    await openDelete()
    expect(axios.delete).not.toHaveBeenCalled()
    await respond('cancel')
    expect(nameInput()).toBeEnabled()
    expect(button('save')).toBeEnabled()
    expect(axios.delete).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(selected('layer-b')).toEqual({
      ...adminLayer('layer-b'),
      unsyncedChanges: true,
    })
    expect(useAppletStore.getState().folayerAreaConfs['layer-b']).toEqual(
      areaData('layer-b')
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'components.confirmation_dialog.confirm',
      })
    ).not.toBeInTheDocument()
    await openDelete()
    await respond('confirm')
    await waitFor(() => expect(axios.delete).toHaveBeenCalledTimes(1))
    expect(axios.delete).toHaveBeenCalledWith(
      '/api/luonnonmetsakartat/layer/layer-b',
      expect.any(Object)
    )
    expect(
      client!.getMutationCache().getAll()[0].state.variables
    ).toMatchObject({
      folayerConf: { ...adminLayer('layer-b'), unsyncedChanges: true },
    })
    expect(selected('layer-b').state).toBe(FolayerConfState.Deleting)
    await waitFor(() =>
      expect(useUIStore.getState().isSidebarLoading).toBe(true)
    )
    expect(button('save')).toBeDisabled()
    await save()
    expect(axios.patch).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(useMapStore.getState()._layerGroups[ids[1]]).toBeDefined()
    await act(async () => request.resolve(response({}, 204)))
    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith('layerb_luonnonmetsakartat_admin')
    )
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(stops[1]).not.toHaveBeenCalled()
    expect(selected('layer-b')).toBeDefined()
    await act(async () => cleanupGate.resolve())
    await expectSettled()
    expect(mockRouter.push).toHaveBeenCalledTimes(1)
    expect(mockRouter.push).toHaveBeenCalledWith(adminPath, { locale: false })
    expect(selected('layer-b')).toBeUndefined()
    expect(
      useAppletStore.getState().folayerAreaConfs['layer-b']
    ).toBeUndefined()
    expect(useMapStore.getState()._layerGroups[ids[1]]).toBeUndefined()
    expect(
      useMapStore.getState()._dataSyncSubscriptions[ids[1]]
    ).toBeUndefined()
    expect(useMapStore.getState()._joinedSelectionSourceMap).toEqual([
      [{ source: ids[0] }],
    ])
    expect(stops[1]).toHaveBeenCalledTimes(1)
    expect(stops[0]).not.toHaveBeenCalled()
    expect(selected()).toEqual(adminLayer('layer-a'))
    expect(useAppletStore.getState().folayerAreaConfs['layer-a']).toEqual(
      areaData('layer-a')
    )
    expect(useMapStore.getState()._layerGroups[ids[0]]).toBeDefined()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'notifications.folayer_delete_success'
    )
    view.unmount()
    expect(useUIStore.getState()._activeSidebarLoaders.size).toBe(0)
  })

  it('restores usable dirty settings after delete failure without cleanup or navigation, then retries successfully', async () => {
    clock()
    setup()
    fireEvent.click(visibility())
    editName('Delete retry draft')
    const { ids, stops, remove } = seedGroups()
    const error = httpError(503)
    const request = controlled(response({}, 204))
    jest.mocked(axios.delete).mockReturnValueOnce(request.promise)
    await openDelete()
    await respond('confirm')
    await waitFor(() =>
      expect(selected().state).toBe(FolayerConfState.Deleting)
    )
    await act(async () => {
      request.reject(error)
      await jest.advanceTimersByTimeAsync(0)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'notifications.folayer_delete_error'
    )
    consumeExpectedError(error)
    await expectSettled()
    expect(nameInput()).toHaveValue('Delete retry draft')
    await advanceName()
    expect(nameInput()).toHaveValue('Delete retry draft')
    expect(visibility()).not.toBeChecked()
    expect(button('save')).toBeEnabled()
    expect(selected()).toMatchObject({
      state: FolayerConfState.Idle,
      unsyncedChanges: true,
      isVisible: false,
    })
    expect(remove).not.toHaveBeenCalled()
    expect(stops[0]).not.toHaveBeenCalled()
    expect(mockRouter.push).not.toHaveBeenCalled()
    expect(useAppletStore.getState().folayerAreaConfs['layer-a']).toEqual(
      areaData('layer-a')
    )
    expect(useMapStore.getState()._layerGroups[ids[0]]).toBeDefined()
    expect(
      screen.queryByText('notifications.folayer_delete_success')
    ).not.toBeInTheDocument()
    jest.mocked(axios.delete).mockResolvedValueOnce(response({}, 204))
    await openDelete()
    await respond('confirm')
    await expectSettled()
    expect(axios.delete).toHaveBeenCalledTimes(2)
    expect(selected()).toBeUndefined()
    expect(useMapStore.getState()._layerGroups[ids[0]]).toBeUndefined()
    expect(stops[0]).toHaveBeenCalledTimes(1)
    expect(stops[1]).not.toHaveBeenCalled()
    expect(selected('layer-b')).toEqual(adminLayer('layer-b'))
    expect(mockRouter.push).toHaveBeenCalledWith(adminPath, { locale: false })
    expect(
      await screen.findByText('notifications.folayer_delete_success')
    ).toBeVisible()
  })
})
