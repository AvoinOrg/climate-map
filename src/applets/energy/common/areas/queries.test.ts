/** @jest-environment node */
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import dataset from '../../../../../utils/test/energyAreas/dataset.json'
import {
  API_ORIGIN,
  createEnergyAreaFixture,
  createFixtureGate,
} from '../../../../../utils/test/energyAreas/responder.cjs'
import {
  areaDetailQueryOptions,
  areaMetadataQueryOptions,
  areaQueryKeys,
  refreshAreaQueries,
  retryAreaQuery,
  AREA_DETAIL_STALE_TIME,
  AREA_CACHE_TIME,
} from './queries'
import { resolveEnergyAreaApiConfig } from './config'
import { AreaApiError } from './errors'
import type { AreaDetailRequest } from 'applets/energy/common/types/areas'
const config = resolveEnergyAreaApiConfig({ origin: API_ORIGIN })
const request: AreaDetailRequest = { level: 'postal_code', areaCode: '00100' }
const clients: QueryClient[] = []
const client = () => {
  const q = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(q)
  return q
}
const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise<void>((r) => setImmediate(r))
}
afterEach(() => {
  clients.forEach((q) => q.clear())
  clients.length = 0
})
test('keys partition normalized origin, level, exact string code and global/municipality scope', () => {
  const base = areaQueryKeys.detail({ config, request })
  expect(base).toEqual([
    'energyAreas',
    API_ORIGIN,
    'detail',
    'postal_code',
    '00100',
    null,
  ])
  for (const next of [
    { ...request, areaCode: '00200' },
    { level: 'municipality' as const, areaCode: '091' },
    { ...request, municipalityCode: '091' },
    { ...request, municipalityCode: '049' },
  ])
    expect(areaQueryKeys.detail({ config, request: next })).not.toEqual(base)
  expect(
    areaQueryKeys.detail({
      config: resolveEnergyAreaApiConfig({ origin: 'https://other.test/' }),
      request,
    })
  ).not.toEqual(base)
  expect(() =>
    areaQueryKeys.detail({ config, request: { ...request, areaCode: '100' } })
  ).toThrow()
})
test.each([
  { ...request, areaCode: '00200' },
  { level: 'municipality' as const, areaCode: '091' },
  { ...request, municipalityCode: '091' },
  { ...request, municipalityCode: '005' },
])(
  'identity switching ignores noncooperative obsolete completions: %p',
  async (next) => {
    const fixture = createEnergyAreaFixture(),
      gate = createFixtureGate(),
      q = client()
    fixture.enqueue({
      match: () => true,
      gate: gate.promise,
      ignoreAbort: true,
    })
    const observer = new QueryObserver(
      q,
      areaDetailQueryOptions({ config, request, fetchFn: fixture.fetch })
    )
    const off = observer.subscribe(() => {})
    await flush()
    observer.setOptions(
      areaDetailQueryOptions({ config, request: next, fetchFn: fixture.fetch })
    )
    expect(observer.getCurrentResult().data).toBeUndefined()
    await flush()
    gate.release()
    await flush()
    expect(observer.getCurrentResult().data).toMatchObject({
      level: next.level,
      area_code: next.areaCode,
    })
    expect(observer.getCurrentResult().data?.scope.municipality_code).toBe(
      'municipalityCode' in next ? next.municipalityCode : undefined
    )
    off()
  }
)
test('refresh cancels a same-key first request, refetches fresh data and invalidates inactive Back/scope entries', async () => {
  const fixture = createEnergyAreaFixture(),
    gate = createFixtureGate(),
    q = client()
  const scoped = areaDetailQueryOptions({
    config,
    request: { ...request, municipalityCode: '091' },
    fetchFn: fixture.fetch,
  })
  await q.fetchQuery(scoped)
  fixture.enqueue({ match: () => true, gate: gate.promise, ignoreAbort: true })
  const options = areaDetailQueryOptions({
    config,
    request,
    fetchFn: fixture.fetch,
  })
  const observer = new QueryObserver(q, options),
    off = observer.subscribe(() => {})
  await flush()
  fixture.setActiveRelease(dataset.releaseIds[1])
  await refreshAreaQueries({ config, queryClient: q })
  expect(observer.getCurrentResult().data?.building_count).toBe(4)
  gate.release()
  await flush()
  expect(observer.getCurrentResult().data?.building_count).toBe(4)
  expect(q.getQueryState(scoped.queryKey)?.isInvalidated).toBe(true)
  expect((await q.fetchQuery(scoped)).as_of).toBe('2026-09-01')
  fixture.setActiveRelease(dataset.releaseIds[2])
  await refreshAreaQueries({ config, queryClient: q })
  expect(observer.getCurrentResult().data?.as_of).toBe('2026-08-01')
  expect(fixture.requests.every((url) => !url.includes('release'))).toBe(true)
  off()
})
test('finite lifetimes and cancellation/unsubscribe protect cache; reconnect is coordinated by provider', async () => {
  const fixture = createEnergyAreaFixture(),
    gate = createFixtureGate(),
    q = client()
  fixture.enqueue({ match: () => true, gate: gate.promise, ignoreAbort: true })
  const options = areaDetailQueryOptions({
    config,
    request,
    fetchFn: fixture.fetch,
  })
  expect(options).toMatchObject({
    staleTime: AREA_DETAIL_STALE_TIME,
    gcTime: AREA_CACHE_TIME,
    refetchOnMount: 'always',
    refetchOnReconnect: false,
  })
  expect(areaMetadataQueryOptions({ config }).gcTime).toBe(AREA_CACHE_TIME)
  const observer = new QueryObserver(q, options),
    off = observer.subscribe(() => {})
  await flush()
  off()
  gate.release()
  await flush()
  expect(q.getQueryData(options.queryKey)).toBeUndefined()
  const changed = { ...request }
  const snapshot = areaDetailQueryOptions({
    config,
    request: changed,
    fetchFn: fixture.fetch,
  })
  changed.areaCode = '00200'
  expect((await q.fetchQuery(snapshot)).area_code).toBe('00100')
  expect(
    areaDetailQueryOptions({ config: resolveEnergyAreaApiConfig({}), request })
      .enabled
  ).toBe(false)
})
test('transient retries are bounded; unsupported contracts are never retried', async () => {
  for (const kind of [
    'network',
    'unavailable',
    'malformed-contract',
    'unsupported-contract',
    'not-found',
  ] as const) {
    expect(
      retryAreaQuery(0, new AreaApiError({ kind, diagnostic: 'test' }))
    ).toBe(kind === 'network' || kind === 'unavailable')
    expect(
      retryAreaQuery(2, new AreaApiError({ kind, diagnostic: 'test' }))
    ).toBe(false)
  }
  const fixture = createEnergyAreaFixture(),
    q = client()
  for (let i = 0; i < 4; i++)
    fixture.enqueue({
      match: () => true,
      response: { status: 503, headers: {}, body: Buffer.from('unavailable') },
    })
  await expect(
    q.fetchQuery({
      ...areaMetadataQueryOptions({ config, fetchFn: fixture.fetch }),
      retryDelay: 0,
    })
  ).rejects.toMatchObject({ problem: { kind: 'unavailable' } })
  expect(fixture.requests).toHaveLength(3)
})

test('latest data becomes stale and inactive queries are actually collected at the bounded lifetime', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] })
  try {
    const fixture = createEnergyAreaFixture(),
      q = client()
    const options = areaDetailQueryOptions({
      config,
      request,
      fetchFn: fixture.fetch,
    })
    await q.fetchQuery(options)
    await q.fetchQuery(options)
    expect(fixture.requests).toHaveLength(1)
    fixture.setActiveRelease(dataset.releaseIds[1])
    jest.advanceTimersByTime(AREA_DETAIL_STALE_TIME + 1)
    expect((await q.fetchQuery(options)).building_count).toBe(4)
    expect(fixture.requests).toHaveLength(2)
    jest.advanceTimersByTime(AREA_CACHE_TIME + 1)
    expect(q.getQueryData(options.queryKey)).toBeUndefined()
  } finally {
    jest.useRealTimers()
  }
})
