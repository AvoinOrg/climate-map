/** @jest-environment node */
import {
  QueryClient,
  QueryObserver,
  focusManager,
  onlineManager,
} from '@tanstack/react-query'
import dataset from '../../../../../utils/test/energyAreas/dataset.json'
import {
  API_ORIGIN,
  createEnergyAreaFixture,
  createFixtureGate,
} from '../../../../../utils/test/energyAreas/responder.cjs'
import {
  AREA_METADATA_STALE_TIME,
  areaDetailQueryOptions,
  areaMetadataQueryOptions,
  areaQueryKeys,
  retryAreaQuery,
} from 'applets/energy/common/areas/queries'
import { resolveEnergyAreaApiConfig } from 'applets/energy/common/areas/config'
import { AreaApiError } from 'applets/energy/common/areas/errors'
import type {
  AreaDetail,
  AreaDetailRequest,
} from 'applets/energy/common/types/areas'

const config = resolveEnergyAreaApiConfig({ origin: API_ORIGIN })
const request: AreaDetailRequest = {
  releaseId: dataset.releaseIds[0],
  level: 'postal_code',
  areaCode: '00100',
}
const clients: QueryClient[] = []
const client = () => {
  const instance = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  clients.push(instance)
  return instance
}
const flush = async () => {
  for (let i = 0; i < 4; i++)
    await new Promise<void>((resolve) => setImmediate(resolve))
}
afterEach(() => {
  clients.forEach((c) => {
    c.unmount()
    c.clear()
  })
  clients.length = 0
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
})

test('keys separate normalized origin, retained release, identity and full/scoped postal requests', () => {
  const base = areaQueryKeys.detail({ config, request })
  expect(base).toEqual([
    'energyAreas',
    API_ORIGIN,
    'detail',
    request.releaseId,
    'postal_code',
    '00100',
    null,
  ])
  expect(
    areaQueryKeys.detail({
      config,
      request: { ...request, municipalityCode: undefined },
    })
  ).toEqual(base)
  expect(
    areaQueryKeys.detail({
      config,
      request: { ...request, releaseId: request.releaseId.toUpperCase() },
    })
  ).toEqual(base)
  for (const next of [
    { ...request, releaseId: dataset.releaseIds[1] },
    { ...request, areaCode: '00200' },
    { ...request, level: 'municipality' as const, areaCode: '091' },
    { ...request, municipalityCode: '091' },
  ])
    expect(areaQueryKeys.detail({ config, request: next })).not.toEqual(base)
  expect(
    areaQueryKeys.detail({
      config: resolveEnergyAreaApiConfig({
        origin: 'https://another.fixture.test/',
      }),
      request,
    })
  ).not.toEqual(base)
  expect(areaQueryKeys.metadata({ config })).not.toEqual(
    areaQueryKeys.metadata({ config, releaseId: request.releaseId })
  )
  expect(() =>
    areaQueryKeys.detail({ config, request: { ...request, areaCode: '100' } })
  ).toThrow()
})
test.each([
  { ...request, releaseId: dataset.releaseIds[1] },
  { ...request, areaCode: '00200' },
  { ...request, level: 'municipality' as const, areaCode: '091' },
  { ...request, municipalityCode: '091' },
  { ...request, municipalityCode: '009' },
])(
  'observer switches to %p and cannot accept older completion',
  async (next) => {
    const fixture = createEnergyAreaFixture()
    const oldGate = createFixtureGate(),
      newGate = createFixtureGate()
    fixture.enqueue({
      match: () => true,
      gate: oldGate.promise,
      ignoreAbort: true,
    })
    fixture.enqueue({ match: () => true, gate: newGate.promise })
    const queryClient = client()
    const oldOptions = areaDetailQueryOptions({
      config,
      request,
      fetchFn: fixture.fetch,
    })
    const newOptions = areaDetailQueryOptions({
      config,
      request: next,
      fetchFn: fixture.fetch,
    })
    const observer = new QueryObserver(queryClient, oldOptions)
    const displayed: AreaDetail[] = []
    const unsubscribe = observer.subscribe((result) => {
      if (result.isSuccess) displayed.push(result.data)
    })
    await flush()
    observer.setOptions(newOptions)
    await flush()
    expect(observer.getCurrentResult().data).toBeUndefined()
    newGate.release()
    await flush()
    expect(observer.getCurrentResult().isSuccess).toBe(true)
    oldGate.release()
    await flush()
    expect(displayed.length).toBeGreaterThan(0)
    for (const detail of displayed) {
      expect(detail.release_id).toBe(next.releaseId)
      expect(detail.level).toBe(next.level)
      expect(detail.area_code).toBe(next.areaCode)
      expect(detail.scope.municipality_code).toBe(next.municipalityCode)
    }
    expect(queryClient.getQueryState(oldOptions.queryKey)?.status).not.toBe(
      'success'
    )
    unsubscribe()
  }
)
test('two concurrent pinned releases resolve in reverse order and populate only their own keys', async () => {
  const fixture = createEnergyAreaFixture()
  const gate = createFixtureGate()
  fixture.enqueue({ match: () => true, gate: gate.promise })
  const queryClient = client()
  const r1 = areaDetailQueryOptions({ config, request, fetchFn: fixture.fetch })
  const r2 = areaDetailQueryOptions({
    config,
    request: { ...request, releaseId: dataset.releaseIds[1] },
    fetchFn: fixture.fetch,
  })
  const old = queryClient.fetchQuery(r1)
  await flush()
  expect((await queryClient.fetchQuery(r2)).release_id).toBe(
    dataset.releaseIds[1]
  )
  gate.release()
  expect((await old).release_id).toBe(request.releaseId)
  expect(queryClient.getQueryData(r1.queryKey)?.release_id).toBe(
    request.releaseId
  )
  expect(queryClient.getQueryData(r2.queryKey)?.release_id).toBe(
    dataset.releaseIds[1]
  )
})
test('provider-client cancellation and unsubscribe abort outstanding details without successful caching', async () => {
  for (const action of ['cancel', 'unsubscribe']) {
    const fixture = createEnergyAreaFixture(),
      gate = createFixtureGate()
    fixture.enqueue({
      match: () => true,
      gate: gate.promise,
      ignoreAbort: true,
    })
    const queryClient = client()
    const options = areaDetailQueryOptions({
      config,
      request,
      fetchFn: fixture.fetch,
    })
    let observed: AbortSignal | null | undefined
    const observer = new QueryObserver(queryClient, {
      ...options,
      queryFn: ({ signal }) => {
        observed = signal
        return options.queryFn!({
          signal,
          queryKey: options.queryKey,
          meta: undefined,
        })
      },
    })
    const unsubscribe = observer.subscribe(() => {})
    await flush()
    if (action === 'cancel')
      await queryClient.cancelQueries({
        queryKey: areaQueryKeys.details({ config }),
      })
    else unsubscribe()
    expect(observed?.aborted).toBe(true)
    gate.release()
    await flush()
    expect(queryClient.getQueryState(options.queryKey)?.status).not.toBe(
      'success'
    )
    unsubscribe()
  }
})
test('metadata deduplicates inside stale window, intentionally refreshes, and revalidates on stale focus/reconnect', async () => {
  const fixture = createEnergyAreaFixture(),
    queryClient = client()
  queryClient.mount()
  const options = areaMetadataQueryOptions({ config, fetchFn: fixture.fetch })
  expect(options).toMatchObject({
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
  })
  await queryClient.fetchQuery(options)
  await queryClient.fetchQuery(options)
  const observer = new QueryObserver(queryClient, options)
  const unsubscribe = observer.subscribe(() => {})
  await flush()
  expect(fixture.requests).toHaveLength(1)
  focusManager.setFocused(false)
  focusManager.setFocused(true)
  onlineManager.setOnline(false)
  onlineManager.setOnline(true)
  await flush()
  expect(fixture.requests).toHaveLength(1)
  fixture.setActiveRelease(dataset.releaseIds[1])
  await queryClient.invalidateQueries({
    queryKey: areaQueryKeys.metadata({ config }),
    exact: true,
  })
  expect(observer.getCurrentResult().data?.release_id).toBe(
    dataset.releaseIds[1]
  )
  expect(fixture.requests).toHaveLength(2)
  const markStale = () =>
    queryClient.setQueryData(
      options.queryKey,
      observer.getCurrentResult().data,
      { updatedAt: Date.now() - AREA_METADATA_STALE_TIME - 1000 }
    )
  markStale()
  focusManager.setFocused(false)
  focusManager.setFocused(true)
  await flush()
  expect(fixture.requests).toHaveLength(3)
  markStale()
  onlineManager.setOnline(false)
  onlineManager.setOnline(true)
  await flush()
  expect(fixture.requests).toHaveLength(4)
  unsubscribe()
})
test('delayed active metadata captures pointer at dispatch; explicit metadata is independently keyed', async () => {
  const fixture = createEnergyAreaFixture(),
    gate = createFixtureGate(),
    queryClient = client()
  fixture.enqueue({ match: () => true, gate: gate.promise })
  const active = queryClient.fetchQuery(
    areaMetadataQueryOptions({ config, fetchFn: fixture.fetch })
  )
  await flush()
  fixture.setActiveRelease(dataset.releaseIds[1])
  const retained = await queryClient.fetchQuery(
    areaMetadataQueryOptions({
      config,
      releaseId: dataset.releaseIds[1],
      fetchFn: fixture.fetch,
    })
  )
  gate.release()
  expect((await active).release_id).toBe(dataset.releaseIds[0])
  expect(retained.release_id).toBe(dataset.releaseIds[1])
})
test('options snapshot mutable inputs; disabled queries expose no fabricated data; retry is bounded and selective', async () => {
  const fixture = createEnergyAreaFixture(),
    queryClient = client()
  const mutable = { ...request }
  const mutableConfig = resolveEnergyAreaApiConfig({ origin: API_ORIGIN })
  const options = areaDetailQueryOptions({
    config: mutableConfig,
    request: mutable,
    fetchFn: fixture.fetch,
  })
  mutable.areaCode = '00200'
  if (mutableConfig.ok) mutableConfig.config.origin = 'https://bad.example.test'
  expect((await queryClient.fetchQuery(options)).area_code).toBe('00100')
  const missing = resolveEnergyAreaApiConfig({})
  expect(areaMetadataQueryOptions({ config: missing }).enabled).toBe(false)
  expect(areaDetailQueryOptions({ config }).enabled).toBe(false)
  expect(areaDetailQueryOptions({ config, request }).staleTime).toBe(Infinity)
  const kinds = [
    'not-configured',
    'invalid-config',
    'unavailable',
    'not-found',
    'rejected-request',
    'malformed-contract',
    'unsupported-contract',
    'network',
    'http',
  ] as const
  for (const kind of kinds) {
    const error = new AreaApiError({ kind, diagnostic: 'test' })
    expect(retryAreaQuery(0, error)).toBe(
      kind === 'network' || kind === 'unavailable'
    )
    expect(retryAreaQuery(2, error)).toBe(false)
  }
  expect(retryAreaQuery(0, new DOMException('aborted', 'AbortError'))).toBe(
    false
  )
})

test.each(['005', undefined])(
  'changing an existing postal scope to %p does not reuse its previous success',
  async (municipalityCode) => {
    const fixture = createEnergyAreaFixture(),
      queryClient = client(),
      gate = createFixtureGate()
    const before = { ...request, municipalityCode: '091' }
    const oldOptions = areaDetailQueryOptions({
      config,
      request: before,
      fetchFn: fixture.fetch,
    })
    await queryClient.fetchQuery(oldOptions)
    fixture.enqueue({ match: () => true, gate: gate.promise })
    const nextOptions = areaDetailQueryOptions({
      config,
      request: { ...request, municipalityCode },
      fetchFn: fixture.fetch,
    })
    const observer = new QueryObserver(queryClient, oldOptions)
    const unsubscribe = observer.subscribe(() => {})
    observer.setOptions(nextOptions)
    expect(observer.getCurrentResult().data).toBeUndefined()
    gate.release()
    await flush()
    expect(observer.getCurrentResult().data?.scope.municipality_code).toBe(
      municipalityCode
    )
    expect(observer.getCurrentResult().data?.building_count).toBe(
      municipalityCode === '005' ? 1 : 5
    )
    expect(queryClient.getQueryData(oldOptions.queryKey)?.building_count).toBe(
      2
    )
    unsubscribe()
  }
)
test('actual Query retry stops after two transient retries and never retries a rejected contract', async () => {
  for (const unsupported of [false, true]) {
    const fixture = createEnergyAreaFixture(),
      queryClient = client()
    for (let i = 0; i < 4; i++)
      fixture.enqueue({
        match: () => true,
        response: {
          status: unsupported ? 200 : 503,
          headers: {},
          body: Buffer.from(
            unsupported ? '{"metric_version":"v2"}' : 'unavailable'
          ),
        },
      })
    await expect(
      queryClient.fetchQuery({
        ...areaMetadataQueryOptions({ config, fetchFn: fixture.fetch }),
        retryDelay: 0,
      })
    ).rejects.toMatchObject({
      problem: { kind: unsupported ? 'unsupported-contract' : 'unavailable' },
    })
    expect(fixture.requests).toHaveLength(unsupported ? 1 : 3)
  }
})
