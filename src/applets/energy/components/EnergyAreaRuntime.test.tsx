import React from 'react'
import '@testing-library/jest-dom'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Tolgee, TolgeeProvider } from '@tolgee/react'
import { FormatIcu } from '@tolgee/format-icu'
import { AppThemeProvider } from '#/common/style/theme'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useUIStore } from '#/common/store/uiStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'
import { createAreaSelection } from 'applets/energy/common/areas/selection'
import type { AreaDetailRequest } from 'applets/energy/common/types/areas'
import * as client from 'applets/energy/common/areas/client'
import fi from '@i18n/energiakartta/fi.json'
import en from '@i18n/energiakartta/en.json'
import { mockAreaMap } from '../../../../utils/test/energyAreas/mapMock'
import EnergyAreaRuntime from './EnergyAreaRuntime'
import EnergyAreaTileError from './EnergyAreaTileError'

jest.mock('#/common/utils/store', () => ({
  createIndexedDbStorage: () => () => ({
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  }),
}))
jest.unmock('zustand')
jest.mock('maplibre-gl', () => ({
  __esModule: true,
  default: { addProtocol: jest.fn(), removeProtocol: jest.fn() },
  Map: jest.fn(),
  LngLatBounds: jest.fn(),
}))
jest.mock('maplibre_symbol_utils', () => ({ canvasFill: jest.fn() }))

const originalOrigin = process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
let queryClient: QueryClient
let current: ReturnType<typeof mockAreaMap>
const zoomTo = (zoom: number) => act(() => current.zoom(zoom))

beforeEach(() => {
  jest.clearAllMocks()
  current = mockAreaMap()
  current.zoom(11)
  queryClient = new QueryClient()
  useMapStore.setState({
    ...useMapStore.getInitialState(),
    mapContext: 'energy',
    isLoaded: true,
  })
  useMapInstanceStore.setState({ _map: current.map })
  useAppletStore.setState(useAppletStore.getInitialState())
  useUIStore.getState().setIsSidebarOpen(true)
  jest.spyOn(client, 'fetchAreaMetadata')
  jest.spyOn(client, 'fetchAreaDetail')
})
afterEach(async () => {
  cleanup()
  await waitFor(() => expect(current.sources.size).toBe(0))
  queryClient.clear()
  jest.restoreAllMocks()
  useMapInstanceStore.setState({ _map: null })
  useMapStore.setState(useMapStore.getInitialState())
  useAppletStore.setState(useAppletStore.getInitialState())
  useUIStore.getState().setIsSidebarOpen(true)
  if (originalOrigin === undefined)
    delete process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
  else process.env.PUBLIC_ENERGY_AREA_API_ORIGIN = originalOrigin
})

describe.each([undefined, 'invalid-origin'])(
  'unavailable area configuration (%s)',
  (origin) => {
    it.each([
      ['fi', false],
      ['fi', true],
      ['en', false],
      ['en', true],
    ] as const)(
      'tracks automatic geography without global fallback copy (%s, compact=%s)',
      async (locale) => {
        if (origin === undefined)
          delete process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
        else process.env.PUBLIC_ENERGY_AREA_API_ORIGIN = origin
        const tolgee = Tolgee()
          .use(FormatIcu())
          .init({
            language: locale,
            defaultNs: 'energiakartta',
            staticData: { 'fi:energiakartta': fi, 'en:energiakartta': en },
          })
        const view = render(
          <QueryClientProvider client={queryClient}>
            <TolgeeProvider tolgee={tolgee}>
              <AppThemeProvider disableCssBaseline>
                <EnergyAreaRuntime>
                  <EnergyAreaTileError />
                </EnergyAreaRuntime>
              </AppThemeProvider>
            </TolgeeProvider>
          </QueryClientProvider>
        )
        const controls = view.container
        expect(controls).not.toHaveTextContent(
          /building map remains|rakennuskartta toimii/i
        )
        expect(
          screen.queryByRole('combobox', {
            name: locale === 'fi' ? 'Aluetaso' : 'Geography',
          })
        ).not.toBeInTheDocument()
        expect(useAppletStore.getState().areaZoom).toBe(11)
        for (const [zoom, geography] of [
          [6.999, 'region'],
          [7, 'municipality'],
          [9.999, 'municipality'],
          [10, 'postal_code'],
          [11.999, 'postal_code'],
          [12, 'buildings'],
          [12.001, 'buildings'],
          [11.5, 'postal_code'],
          [9, 'municipality'],
          [6, 'region'],
        ] as const) {
          zoomTo(zoom)
          expect(useAppletStore.getState().areaZoom).toBe(zoom)
          expect(useAppletStore.getState().effectiveGeography).toBe(geography)
          expect(controls).not.toHaveTextContent(
            /building map remains|rakennuskartta toimii/i
          )
          expect(
            screen.queryByRole('button', {
              name:
                locale === 'fi' ? 'Päivitä aluetiedot' : 'Refresh area data',
              hidden: true,
            })
          ).not.toBeInTheDocument()
          expect(controls).not.toHaveTextContent('sidebar.area_map.refresh')
        }
        await act(async () => {
          await Promise.resolve()
          await Promise.resolve()
        })
        expect(useAppletStore.getState().areaAvailable).toBe(true)
        expect(current.sources.size).toBe(3)
        expect(
          screen.queryByRole('button', {
            name: locale === 'fi' ? 'Päivitä aluetiedot' : 'Refresh area data',
            hidden: true,
          })
        ).not.toBeInTheDocument()
        expect(client.fetchAreaMetadata).not.toHaveBeenCalled()
        expect(client.fetchAreaDetail).not.toHaveBeenCalled()
        view.unmount()
        await waitFor(() =>
          expect(
            [...current.listeners.values()].every((set) => set.size === 0)
          ).toBe(true)
        )
        zoomTo(10)
        expect(useAppletStore.getState().areaZoom).toBe(12)
      }
    )
  }
)

describe('selected-area detail opening', () => {
  let runtime: ReturnType<typeof useEnergyAreaRuntime>
  const Probe = () => {
    runtime = useEnergyAreaRuntime()
    return null
  }
  const mount = async () => {
    // The selection/visibility behavior is independent of the detail service.
    delete process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
    useAppletStore.setState({ activeThematicMode: 'energyCertificates' })
    render(
      <QueryClientProvider client={queryClient}>
        <EnergyAreaRuntime>
          <Probe />
        </EnergyAreaRuntime>
      </QueryClientProvider>
    )
    await waitFor(() => expect(runtime.generation).toBeDefined())
  }
  const select = (request: AreaDetailRequest) => {
    const descriptor = runtime.generation!.descriptors.find(
      (item) => item.level === request.level
    )!
    act(() =>
      useMapStore
        .getState()
        .setSelectedFeatures([createAreaSelection({ request, descriptor })])
    )
  }
  const showMap = () => act(() => useUIStore.getState().setIsSidebarOpen(false))

  it.each([
    ['region', '01', 6, 6.5, 5.5, 7],
    ['municipality', '091', 8, 9, 7.5, 10],
    ['postal_code', '00100', 11, 11.5, 10.5, 12],
  ] as const)(
    'keeps the map visible during %s zoom and clears selection at the boundary',
    async (level, areaCode, start, up, down, boundary) => {
      zoomTo(start)
      await mount()
      showMap()
      select({ level, areaCode })
      expect(runtime.request).toEqual({ level, areaCode })
      expect(useUIStore.getState().isSidebarOpen).toBe(true)
      showMap()
      for (const zoom of [up, down]) {
        zoomTo(zoom)
        expect(current.map.getZoom()).toBe(zoom)
        expect(runtime.request).toEqual({ level, areaCode })
        expect(useUIStore.getState().isSidebarOpen).toBe(false)
      }
      zoomTo(boundary)
      expect(runtime.request).toBeUndefined()
      expect(useMapStore.getState().selectedFeatures).toEqual([])
      expect(useUIStore.getState().isSidebarOpen).toBe(false)
      zoomTo(start)
      select({ level, areaCode })
      expect(useUIStore.getState().isSidebarOpen).toBe(true)
      act(() => runtime.close())
      showMap()
      select({ level, areaCode })
      expect(useUIStore.getState().isSidebarOpen).toBe(true)
    }
  )

  it('opens a new area or postal scope while passive theme/style/reconnect updates keep the map visible', async () => {
    zoomTo(11)
    await mount()
    select({ level: 'postal_code', areaCode: '00100' })
    showMap()
    select({ level: 'postal_code', areaCode: '00140' })
    expect(useUIStore.getState().isSidebarOpen).toBe(true)
    showMap()
    select({
      level: 'postal_code',
      areaCode: '00140',
      municipalityCode: '091',
    })
    expect(useUIStore.getState().isSidebarOpen).toBe(true)
    showMap()
    act(() => useAppletStore.getState().setActiveThematicMode('heating'))
    act(() => window.dispatchEvent(new Event('online')))
    current.sources.clear()
    current.layers.clear()
    act(() => current.fire('style.load'))
    await waitFor(() => expect(runtime.status).toBe('ready'))
    expect(runtime.request).toEqual({
      level: 'postal_code',
      areaCode: '00140',
      municipalityCode: '091',
    })
    expect(useUIStore.getState().isSidebarOpen).toBe(false)
    expect(client.fetchAreaDetail).not.toHaveBeenCalled()
    act(() => runtime.showWholePostalArea())
    expect(runtime.request?.municipalityCode).toBeUndefined()
    expect(useUIStore.getState().isSidebarOpen).toBe(true)
  })
})
