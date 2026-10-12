import React from 'react'
import '@testing-library/jest-dom'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'
import { createAreaSelection } from 'applets/energy/common/areas/selection'
import { areaQueryKeys } from 'applets/energy/common/areas/queries'
import { resolveEnergyAreaApiConfig } from 'applets/energy/common/areas/config'
import EnergyAreaRuntime from './EnergyAreaRuntime'
import { mockAreaMap } from '../../../../utils/test/energyAreas/mapMock'
import {
  createEnergyAreaFixture,
  createFixtureGate,
  API_ORIGIN,
} from '../../../../utils/test/energyAreas/responder.cjs'
import type {
  AreaDetailRequest,
  AreaLevel,
} from 'applets/energy/common/types/areas'
import type { MapGeoJSONFeature } from 'maplibre-gl'

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
let runtime: ReturnType<typeof useEnergyAreaRuntime>
const Probe = () => {
  const value = useEnergyAreaRuntime()
  React.useEffect(() => {
    runtime = value
  }, [value])
  return (
    <output data-testid="detail">
      {JSON.stringify({
        request: value.request,
        count: value.detail?.building_count,
        error: value.detailProblem,
      })}
    </output>
  )
}
let current: ReturnType<typeof mockAreaMap>
let fixture: ReturnType<typeof createEnergyAreaFixture>
let queryClient: QueryClient
const originalFetch = globalThis.fetch
const originalClone = globalThis.structuredClone
const originalThrowIfAborted = AbortSignal.prototype.throwIfAborted
const originalOrigin = process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
beforeEach(() => {
  AbortSignal.prototype.throwIfAborted = function () {
    if (this.aborted)
      throw this.reason ?? new DOMException('Aborted', 'AbortError')
  }
  process.env.PUBLIC_ENERGY_AREA_API_ORIGIN = API_ORIGIN
  // Fixture payloads are plain JSON; use the existing responder in jsdom.
  globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value))
  fixture = createEnergyAreaFixture()
  globalThis.fetch = jest.fn(async (url, init) => {
    const response = await fixture.respond(String(url), {
      signal: init?.signal,
    })
    return {
      ok: response.status < 400,
      status: response.status,
      json: async () => JSON.parse(response.body.toString()),
    } as Response
  })
  queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  })
  current = mockAreaMap()
  useMapStore.setState({
    ...useMapStore.getInitialState(),
    mapContext: 'energy',
    isLoaded: true,
  })
  useMapInstanceStore.setState({ _map: current.map })
  useAppletStore.setState(useAppletStore.getInitialState())
})
afterEach(async () => {
  cleanup()
  await act(async () => {
    await queryClient.cancelQueries()
    await Promise.resolve()
  })
  await waitFor(() =>
    expect(
      [...current.sources.keys()].filter((key) =>
        key.startsWith('energymap_areas_')
      )
    ).toHaveLength(0)
  )
  queryClient.clear()
  AbortSignal.prototype.throwIfAborted = originalThrowIfAborted
  globalThis.fetch = originalFetch
  globalThis.structuredClone = originalClone
  if (originalOrigin === undefined)
    delete process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
  else process.env.PUBLIC_ENERGY_AREA_API_ORIGIN = originalOrigin
  useMapInstanceStore.setState({ _map: null })
})
const mount = async () => {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EnergyAreaRuntime>
        <Probe />
      </EnergyAreaRuntime>
    </QueryClientProvider>
  )
  await waitFor(() => expect(runtime.generation).toBeDefined())
  return view
}
const select = (level: AreaLevel, areaCode: string) =>
  act(() => {
    const descriptor = runtime.generation!.descriptors.find(
      (item) => item.level === level
    )!
    const feature = {
      source: descriptor.sourceId,
      sourceLayer: descriptor.sourceLayer,
      id: `${level}:${areaCode}`,
      layer: { id: `${descriptor.sourceId}-fill` },
      properties: {
        level,
        area_code: areaCode,
        area_id: `${level}:${areaCode}`,
        building_count: 5,
        valid_official_class_count: 3,
      },
    } as MapGeoJSONFeature
    useMapStore.getState().setSelectedFeatures([feature])
  })
const expectRequest = async (
  level: AreaLevel,
  code: string,
  municipalityCode?: string,
  count?: number
) => {
  await waitFor(() => {
    expect(runtime.request).toMatchObject({ level, areaCode: code })
    expect(runtime.request?.municipalityCode).toBe(municipalityCode)
    expect(runtime.detail?.area_code).toBe(code)
    if (count !== undefined) expect(runtime.detail?.building_count).toBe(count)
  })
}
it('integrates region → municipality → scoped postal → whole → Buildings and Back with pinned keys', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  expect(
    fixture.requests.filter((url: string) => !url.endsWith('/metadata'))
  ).toHaveLength(1)
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await expectRequest('municipality', '091', undefined, 3)
  expect(current.map.getZoom()).toBe(8)
  act(() =>
    runtime.navigateRelated({ level: 'postal_code', areaCode: '00100' })
  )
  await expectRequest('postal_code', '00100', '091', 2)
  expect(current.map.getZoom()).toBe(11)
  expect(runtime.detail?.related_areas.map((item) => item.area_code)).toEqual([
    '005',
    '091',
  ])
  const scopedKey = areaQueryKeys.detail({
    config: resolveEnergyAreaApiConfig({ origin: API_ORIGIN }),
    request: runtime.request!,
  })
  expect(scopedKey.at(-1)).toBe('091')
  expect(queryClient.getQueryData(scopedKey)).toEqual(runtime.detail)
  expect(useMapStore.getState().selectedFeatures[0].properties).toBeUndefined()
  expect(
    current.featureState.get(
      JSON.stringify({
        source: useMapStore.getState().selectedFeatures[0].source,
        id: 'postal_code:00100',
        sourceLayer: 'energymap_postal_code_areas',
      })
    )
  ).toEqual({ selected: true })
  act(() => runtime.showWholePostalArea())
  await expectRequest('postal_code', '00100', undefined, 5)
  expect(runtime.detail?.related_areas.map((item) => item.area_code)).toEqual([
    '005',
    '091',
  ])
  act(() => runtime.back())
  await expectRequest('postal_code', '00100', '091', 2)
  useAppletStore.setState({ activeEnergyCertificateClasses: ['A', 'C'] })
  act(() => runtime.showBuildings())
  expect(runtime.request).toBeUndefined()
  expect(useMapStore.getState().selectedFeatures).toEqual([])
  expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
  expect(current.map.getZoom()).toBe(12)
  // An ordinary building click cannot erase the explicit postal return.
  act(() =>
    useMapStore.getState().setSelectedFeatures([
      {
        id: 'building-key',
        source: 'energymap_building_polygons',
      } as MapGeoJSONFeature,
    ])
  )
  expect(runtime.canGoBack).toBe(true)
  act(() => runtime.back())
  await expectRequest('postal_code', '00100', '091', 2)
  expect(useAppletStore.getState().activeEnergyCertificateClasses).toEqual([
    'A',
    'C',
  ])
  act(() => runtime.back())
  await expectRequest('municipality', '091', undefined, 3)
  act(() => runtime.back())
  await expectRequest('region', '01')
  expect(runtime.canGoBack).toBe(false)
  expect(fixture.requests.every((url: string) => !url.includes('bounds'))).toBe(
    true
  )
})
it('retains scope within a band and clears obsolete trail on user zoom, direct clicks and close', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await expectRequest('municipality', '091')
  act(() =>
    runtime.navigateRelated({ level: 'postal_code', areaCode: '00100' })
  )
  await expectRequest('postal_code', '00100', '091')
  act(() => current.zoom(11.7))
  expect(runtime.canGoBack).toBe(true)
  expect(runtime.request?.municipalityCode).toBe('091')
  act(() => current.zoom(12))
  expect(runtime.request).toBeUndefined()
  expect(runtime.canGoBack).toBe(false)
  act(() => current.zoom(11))
  select('postal_code', '00100')
  await expectRequest('postal_code', '00100', undefined, 5)
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '005' }))
  await expectRequest('municipality', '005')
  select('municipality', '091')
  await expectRequest('municipality', '091')
  expect(runtime.canGoBack).toBe(false)
  act(() =>
    runtime.navigateRelated({ level: 'postal_code', areaCode: '00100' })
  )
  await expectRequest('postal_code', '00100', '091')
  act(() => runtime.close())
  act(() => runtime.back())
  expect(runtime.request).toBeUndefined()
  expect(runtime.canGoBack).toBe(false)
  act(() => current.zoom(6.999))
  select('region', '01')
  await expectRequest('region', '01')
  act(() => current.zoom(7))
  expect(runtime.request).toBeUndefined()
  expect(runtime.canGoBack).toBe(false)
})
it('handles valid zero intersection successfully through the same selected-feature seam', async () => {
  await mount()
  act(() => {
    current.zoom(11)
    const descriptor = runtime.generation!.descriptors.find(
      (item) => item.level === 'postal_code'
    )!
    const request: AreaDetailRequest = {
      level: 'postal_code',
      areaCode: '00100',
      municipalityCode: '009',
    }
    useMapStore
      .getState()
      .setSelectedFeatures([createAreaSelection({ descriptor, request })])
  })
  await expectRequest('postal_code', '00100', '009', 0)
  expect(runtime.detailProblem).toBeUndefined()
  expect(runtime.detail?.certificate_coverage).toBeNull()
  expect(runtime.detail?.related_areas.map((item) => item.area_code)).toEqual([
    '005',
    '091',
  ])
  act(() => runtime.showWholePostalArea())
  await expectRequest('postal_code', '00100', undefined, 5)
})
it('cancels gated noncooperative responses across rapid navigation/back and close', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  const gate = createFixtureGate()
  fixture.enqueue({
    match: (url: URL) => url.pathname.endsWith('/municipality/091'),
    gate: gate.promise,
    ignoreAbort: true,
  })
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await waitFor(() =>
    expect(
      fixture.requests.some((url: string) => url.includes('/municipality/091'))
    ).toBe(true)
  )
  const fetchCalls = (globalThis.fetch as jest.Mock).mock.calls
  const signal = fetchCalls.find(([url]) =>
    String(url).includes('/municipality/091')
  )[1].signal
  act(() => runtime.back())
  await expectRequest('region', '01')
  expect(signal.aborted).toBe(true)
  gate.release()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
  expect(screen.getByTestId('detail')).not.toHaveTextContent('091')
  act(() => runtime.close())
  act(() => runtime.back())
  expect(runtime.request).toBeUndefined()
})
it('retains request, history and selected outline across refresh/reconnect/style recovery; invalidates on exit', async () => {
  const view = await mount()
  select('region', '01')
  await expectRequest('region', '01')
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await expectRequest('municipality', '091')
  act(() => runtime.refresh())
  await waitFor(() =>
    expect(
      fixture.requests.filter((url) => url.endsWith('/metadata'))
    ).toHaveLength(2)
  )
  expect(runtime.canGoBack).toBe(true)
  expect(current.map.refreshTiles).toHaveBeenCalledTimes(3)
  act(() => window.dispatchEvent(new Event('online')))
  await waitFor(() =>
    expect(
      fixture.requests.filter((url) => url.endsWith('/metadata'))
    ).toHaveLength(3)
  )
  expect(current.map.refreshTiles).toHaveBeenCalledTimes(6)
  current.sources.clear()
  current.layers.clear()
  current.featureState.clear()
  act(() => current.fire('style.load'))
  await waitFor(() => expect(runtime.status).toBe('ready'))
  expect(runtime.canGoBack).toBe(true)
  await expectRequest('municipality', '091')
  expect([...current.featureState.values()]).toContainEqual({ selected: true })
  act(() => useMapStore.setState({ mapContext: 'main' }))
  expect(runtime.request).toBeUndefined()
  view.unmount()
})

it('never displays obsolete scoped statistics after gated whole-area switching/back, cancellation or release promotion', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await expectRequest('municipality', '091')
  const gate = createFixtureGate()
  fixture.enqueue({
    match: (url: URL) => url.searchParams.get('municipality_code') === '091',
    gate: gate.promise,
    ignoreAbort: true,
  })
  act(() =>
    runtime.navigateRelated({ level: 'postal_code', areaCode: '00100' })
  )
  await waitFor(() =>
    expect(
      fixture.requests.some((url: string) =>
        url.includes('municipality_code=091')
      )
    ).toBe(true)
  )
  expect(runtime.detail).toBeUndefined()
  act(() => runtime.showWholePostalArea())
  await expectRequest('postal_code', '00100', undefined, 5)
  gate.release()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
  expect(runtime.detail?.building_count).toBe(5)
  act(() => runtime.back())
  await expectRequest('postal_code', '00100', '091', 2)
  fixture.setActiveRelease('22222222-2222-4222-8222-222222222222')
  act(() => runtime.refresh())
  await waitFor(() => expect(runtime.detail?.as_of).toBe('2026-09-01'))
  expect(runtime.request?.municipalityCode).toBe('091')
  expect(runtime.canGoBack).toBe(true)
  expect(fixture.requests.every((url) => !url.includes('release_id'))).toBe(
    true
  )
})

it('ignores a legacy manual preference in rendering and selected request projection', async () => {
  const legacy = { geographyMode: 'region' }
  useAppletStore.setState(
    legacy as Partial<ReturnType<typeof useAppletStore.getState>>
  )
  current.zoom(11)
  await mount()
  expect(useAppletStore.getState().effectiveGeography).toBe('postal_code')
  select('region', '01')
  expect(runtime.request).toBeUndefined()
  select('postal_code', '00100')
  await expectRequest('postal_code', '00100', undefined, 5)
  act(() => current.zoom(8))
  expect(runtime.request).toBeUndefined()
  expect(useAppletStore.getState().effectiveGeography).toBe('municipality')
})
it('does not install an invisible postal request when the map cannot reach its band', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await expectRequest('municipality', '091')
  const max = jest.spyOn(current.map, 'getMaxZoom').mockReturnValue(9)
  act(() =>
    runtime.navigateRelated({ level: 'postal_code', areaCode: '00100' })
  )
  expect(current.map.getZoom()).toBe(8)
  expect(runtime.request?.level).toBe('municipality')
  expect(runtime.canGoBack).toBe(false)
  max.mockRestore()
})
it('cancels a pending scoped response when user zoom crosses into buildings after navigation', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  act(() => runtime.navigateRelated({ level: 'municipality', areaCode: '091' }))
  await expectRequest('municipality', '091')
  const gate = createFixtureGate()
  fixture.enqueue({
    match: (url: URL) => url.searchParams.get('municipality_code') === '091',
    gate: gate.promise,
    ignoreAbort: true,
  })
  act(() =>
    runtime.navigateRelated({ level: 'postal_code', areaCode: '00100' })
  )
  await waitFor(() => expect(runtime.detailLoading).toBe(true))
  act(() => current.zoom(12))
  expect(runtime.request).toBeUndefined()
  expect(runtime.canGoBack).toBe(false)
  gate.release()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10))
  })
  expect(runtime.detail).toBeUndefined()
  expect(screen.getByTestId('detail')).not.toHaveTextContent('00100')
})

it('malformed optional metadata never gates stable coverage or independently valid latest details', async () => {
  fixture.enqueue({
    match: (url) => url.pathname.endsWith('/metadata'),
    transform: () => ({ bad: true }),
  })
  await mount()
  expect(current.sources.size).toBe(3)
  select('region', '01')
  await expectRequest('region', '01')
  expect(runtime.status).toBe('ready')
  expect(runtime.detailProblem).toBeUndefined()
})
it('missing origin keeps clicked identity and map selection with a truthful unavailable detail', async () => {
  delete process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
  await mount()
  select('region', '01')
  await waitFor(() => expect(runtime.request?.areaCode).toBe('01'))
  expect(runtime.detailProblem).toBe('not-configured')
  expect(runtime.detail).toBeUndefined()
  expect(current.sources.size).toBe(3)
  act(() => runtime.refresh())
  expect(current.map.refreshTiles).toHaveBeenCalledTimes(3)
  expect(fixture.requests).toEqual([])
})
it('a failed selected refresh suppresses last-good statistics and leaves polygons and scope selected', async () => {
  await mount()
  select('region', '01')
  await expectRequest('region', '01')
  fixture.enqueue({
    match: (url) => url.pathname.endsWith('/region/01'),
    response: { status: 404, headers: {}, body: Buffer.from('{}') },
  })
  act(() => runtime.refresh())
  await waitFor(() => expect(runtime.detailProblem).toBe('not-found'))
  expect(runtime.detail).toBeUndefined()
  expect(runtime.request?.areaCode).toBe('01')
  expect(current.sources.size).toBe(3)
  act(() => runtime.retryDetail())
  await expectRequest('region', '01')
})
