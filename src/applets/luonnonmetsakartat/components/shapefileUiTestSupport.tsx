import React, { type ComponentType } from 'react'
import '@testing-library/jest-dom'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientProviderProps,
} from '@tanstack/react-query'
import { AppThemeProvider } from '#/common/style/theme'
import ConfirmationDialog from '#/components/Notification/ConfirmationDialog'
import { useUIStore } from '#/common/store/uiStore'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import {
  FolayerConfState,
  type AdminFolayerConf,
} from 'applets/luonnonmetsakartat/common/types'
import {
  expectedColumns,
  fixtureBytes,
} from 'applets/luonnonmetsakartat/common/shapefileTestData'

jest.unmock('zustand')
jest.mock('@tolgee/react', () => {
  const t = (key: string, params?: Record<string, unknown>) =>
    key + (params ? ` ${Object.values(params).join(' ')}` : '')
  return { useTranslate: () => ({ t }) }
})
jest.mock('#/components/common/TText', () => ({
  __esModule: true,
  default: ({ keyName }: { keyName: string }) => keyName,
}))
jest.mock('#/common/store', () => ({
  useUIStore: jest.requireActual('#/common/store/uiStore').useUIStore,
  useMapStore: (selector: (state: unknown) => unknown) =>
    selector({ removeLayerGroup: jest.fn() }),
}))
jest.mock('#/components/Sidebar', () => ({
  SidebarContentBox: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
jest.mock('#/common/hooks/ui/useSidebarActivityLoader', () => {
  const setLoading = jest.fn()
  return { useSidebarActivityLoader: () => [false, setLoading] }
})
jest.mock('#/common/navigation/navigation', () => {
  const router = { push: jest.fn() }
  return {
    useAppRouter: () => router,
    useAppParams: () => ({ folayerIdSlug: 'test-layer' }),
  }
})
jest.mock('#/common/navigation/appRouteLinks', () => {
  const build = () => '/test-layer'
  return { useAppRouteHrefBuilder: () => build }
})
// Settings only needs this map naming function, not the map/modal module graph.
jest.mock('applets/luonnonmetsakartat/common/utils', () => ({
  getFolayerGroupId: (id: string) => id,
}))

export const label = (field: string) => `sidebar.admin.create.${field}`
export const settingsLabel = (field: string) =>
  `sidebar.admin.folayer.settings.${field}`
export const adminLayer: AdminFolayerConf = {
  id: 'test-layer',
  name: 'Test layer',
  colorCode: '#06402B',
  createdTs: 1,
  updatedTs: 1,
  isVisible: false,
  state: FolayerConfState.Idle,
  unsyncedChanges: false,
  colOptions: expectedColumns,
}
// A narrow visible notification adapter; confirmations use the real dialog and store.
const Notices = () => {
  const notifications = useUIStore((state) => state.notifications)
  return (
    <>
      {Object.entries(notifications).map(([id, notice]) => (
        <div role="alert" key={id}>
          {notice.message}
        </div>
      ))}
    </>
  )
}
const clients: QueryClient[] = []
export const renderUi = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  // Same React type compatibility adapter used by the existing query harness.
  const StableQueryClientProvider =
    QueryClientProvider as ComponentType<QueryClientProviderProps>
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <StableQueryClientProvider client={client}>
      <AppThemeProvider>
        {children}
        <Notices />
        <ConfirmationDialog />
      </AppThemeProvider>
    </StableQueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}
let consoleError: jest.SpyInstance
let originalFetch: typeof globalThis.fetch
beforeEach(() => {
  consoleError = jest.spyOn(console, 'error')
  originalFetch = globalThis.fetch
  globalThis.fetch = jest.fn(() =>
    Promise.reject(new Error('Unexpected network request in shapefile UI test'))
  )
  useUIStore.setState(useUIStore.getInitialState(), true)
  useAppletStore.setState(useAppletStore.getInitialState(), true)
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  const errors = consoleError.mock.calls.slice()
  consoleError.mockRestore()
  expect(globalThis.fetch).not.toHaveBeenCalled()
  globalThis.fetch = originalFetch
  expect(errors).toEqual([])
  localStorage.clear()
})
export const chooseColumn = async (field: string, value: string) => {
  const trigger = screen.getByRole('combobox', { name: label(field) })
  fireEvent.click(trigger)
  const option = await screen.findByRole('option', { name: value })
  fireEvent.mouseMove(option)
  fireEvent.keyDown(option, { key: 'Enter' })
  await waitFor(() =>
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  )
}
export const clearColumn = (field: string) =>
  chooseColumn(field, 'Empty selection')
export const waitForColumns = async () => {
  await screen.findByRole('combobox', {
    name: label('select_folayer_name_record'),
  })
}
export const nameImport = () =>
  fireEvent.change(
    screen.getByRole('textbox', { name: label('name.header') }),
    { target: { value: 'Imported forest' } }
  )
export const acceptImport = () =>
  fireEvent.click(
    screen.getByRole('button', { name: 'Accept imported forest layer' })
  )
export const respondToWarning = async (response: 'confirm' | 'cancel') => {
  await screen.findByRole('dialog')
  fireEvent.click(
    screen.getByRole('button', {
      name: `components.confirmation_dialog.${response}`,
    })
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
}
export const upload = (
  container: HTMLElement,
  name = 'valid-layer.zip',
  bytes = fixtureBytes(name)
) => {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('Missing file input')
  fireEvent.change(input, {
    target: { files: [new File([bytes], name, { type: 'application/zip' })] },
  })
  return bytes
}
export { act, fireEvent, screen, waitFor }
