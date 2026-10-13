import React from 'react'
import '@testing-library/jest-dom'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Tolgee, TolgeeProvider } from '@tolgee/react'
import { FormatIcu } from '@tolgee/format-icu'
import { AppThemeProvider } from '#/common/style/theme'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import * as client from 'applets/energy/common/areas/client'
import fi from '@i18n/energiakartta/fi.json'
import en from '@i18n/energiakartta/en.json'
import { mockAreaMap } from '../../../../utils/test/energyAreas/mapMock'
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
              name: locale === 'fi' ? 'Päivitä aluetiedot' : 'Refresh area data',
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
