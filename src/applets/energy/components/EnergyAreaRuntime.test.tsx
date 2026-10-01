import React from 'react'
import '@testing-library/jest-dom'
import { act, cleanup, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Tolgee, TolgeeProvider } from '@tolgee/react'
import { FormatIcu } from '@tolgee/format-icu'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { AppThemeProvider } from '#/common/style/theme'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import * as client from 'applets/energy/common/areas/client'
import fi from '@i18n/energiakartta/fi.json'
import en from '@i18n/energiakartta/en.json'
import EnergyAreaRuntime from './EnergyAreaRuntime'
import EnergyAreaControls from './EnergyAreaControls'

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
let mapZoom: number
let listeners: Map<string, Set<() => void>>
const map = {
  getZoom: () => mapZoom,
  getSource: jest.fn(),
  getLayer: jest.fn(),
  addSource: jest.fn(),
  on: jest.fn((event: string, listener: () => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(listener)
  }),
  off: jest.fn((event: string, listener: () => void) => {
    listeners.get(event)?.delete(listener)
  }),
}
const zoomTo = (zoom: number) =>
  act(() => {
    mapZoom = zoom
    listeners.get('zoom')?.forEach((listener) => listener())
  })

beforeEach(() => {
  jest.clearAllMocks()
  mapZoom = 11
  listeners = new Map()
  queryClient = new QueryClient()
  useMapStore.setState({
    ...useMapStore.getInitialState(),
    mapContext: 'energy',
    isLoaded: true,
  })
  useMapInstanceStore.setState({ _map: map as unknown as MapLibreMap })
  useAppletStore.setState({
    ...useAppletStore.getInitialState(),
    geographyMode: 'buildings',
  })
  jest.spyOn(client, 'fetchAreaMetadata')
  jest.spyOn(client, 'fetchAreaDetail')
})
afterEach(() => {
  cleanup()
  queryClient.clear()
  jest.restoreAllMocks()
  useMapInstanceStore.setState({ _map: null })
  useMapStore.setState(useMapStore.getInitialState())
  useAppletStore.setState(useAppletStore.getInitialState())
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
      'tracks actual zoom for the manual Buildings hint (%s, compact=%s)',
      async (locale, compact) => {
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
                  <EnergyAreaControls locale={locale} compact={compact} />
                </EnergyAreaRuntime>
              </AppThemeProvider>
            </TolgeeProvider>
          </QueryClientProvider>
        )
        const controls = await screen.findByTestId('energy-area-controls')
        const hint =
          locale === 'fi'
            ? 'Lähennä karttaa nähdäksesi rakennukset.'
            : 'Zoom in to see buildings.'
        // The runtime must read the map; the stored default is zoom 12.
        expect(controls).toHaveTextContent(hint)
        expect(useAppletStore.getState().areaZoom).toBe(11)
        for (const zoom of [11.999, 12, 12.001, 11.5]) {
          zoomTo(zoom)
          expect(useAppletStore.getState().areaZoom).toBe(zoom)
          if (zoom < 12) expect(controls).toHaveTextContent(hint)
          else expect(controls).not.toHaveTextContent(hint)
          expect(useAppletStore.getState().geographyMode).toBe('buildings')
          expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
        }
        expect(useAppletStore.getState().areaAvailable).toBe(false)
        expect(client.fetchAreaMetadata).not.toHaveBeenCalled()
        expect(client.fetchAreaDetail).not.toHaveBeenCalled()
        expect(map.addSource).not.toHaveBeenCalled()
        view.unmount()
        expect([...listeners.values()].every((set) => set.size === 0)).toBe(true)
        zoomTo(10)
        expect(useAppletStore.getState().areaZoom).toBe(12)
      }
    )
  }
)
