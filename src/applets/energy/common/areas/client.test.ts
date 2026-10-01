/** @jest-environment node */
import dataset from '../../../../../utils/test/energyAreas/dataset.json'
import {
  createEnergyAreaFixture,
  createFixtureGate,
  API_ORIGIN,
} from '../../../../../utils/test/energyAreas/responder.cjs'
import {
  fetchAreaDetail,
  fetchAreaMetadata,
} from 'applets/energy/common/areas/client'
import { resolveEnergyAreaApiConfig } from 'applets/energy/common/areas/config'
import type {
  AreaDetailRequest,
  AreaFetch,
} from 'applets/energy/common/types/areas'

const config = resolveEnergyAreaApiConfig({ origin: API_ORIGIN })
const request: AreaDetailRequest = {
  releaseId: dataset.releaseIds[0],
  level: 'postal_code',
  areaCode: '00100',
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve))
test('active/candidate/retained metadata and pinned full/scoped detail use truthful service URLs', async () => {
  const fixture = createEnergyAreaFixture()
  const fetchFn = fixture.fetch
  expect((await fetchAreaMetadata({ config, fetchFn })).release_id).toBe(
    dataset.releaseIds[0]
  )
  expect(new URL(fixture.requests[0]).search).toBe('')
  for (const releaseId of dataset.releaseIds) {
    expect(
      (await fetchAreaMetadata({ config, releaseId, fetchFn })).release_id
    ).toBe(releaseId)
    expect(
      (
        await fetchAreaDetail({
          config,
          request: { ...request, releaseId },
          fetchFn,
        })
      ).release_id
    ).toBe(releaseId)
  }
  const full = await fetchAreaDetail({ config, request, fetchFn })
  const scoped = await fetchAreaDetail({
    config,
    request: { ...request, municipalityCode: '091' },
    fetchFn,
  })
  const zero = await fetchAreaDetail({
    config,
    request: { ...request, municipalityCode: '009' },
    fetchFn,
  })
  expect([
    full.building_count,
    scoped.building_count,
    zero.building_count,
  ]).toEqual([5, 2, 0])
  expect(scoped.related_areas).toEqual(full.related_areas)
  expect(zero.metrics).toEqual(dataset.emptyMetrics)
  const scopedUrl = new URL(fixture.requests.at(-2)!)
  expect(scopedUrl.pathname).toBe('/energy-data/areas/postal_code/00100')
  expect(Object.fromEntries(scopedUrl.searchParams)).toEqual({
    release_id: request.releaseId,
    municipality_code: '091',
  })
  fixture.setActiveRelease(dataset.releaseIds[1])
  expect((await fetchAreaMetadata({ config, fetchFn })).release_id).toBe(
    dataset.releaseIds[1]
  )
  expect(
    (await fetchAreaDetail({ config, request, fetchFn })).building_count
  ).toBe(5)
})
test('missing/invalid config and invalid identities reject before transport; fixtures never selected implicitly', async () => {
  const fetchFn = jest.fn<ReturnType<AreaFetch>, Parameters<AreaFetch>>()
  for (const origin of [undefined, 'https://api.example.test/api']) {
    await expect(
      fetchAreaMetadata({
        config: resolveEnergyAreaApiConfig({ origin }),
        fetchFn,
      })
    ).rejects.toMatchObject({
      problem: { kind: origin ? 'invalid-config' : 'not-configured' },
    })
  }
  await expect(
    fetchAreaDetail({
      config,
      request: { ...request, areaCode: '100' },
      fetchFn,
    })
  ).rejects.toMatchObject({ problem: { kind: 'rejected-request' } })
  await expect(
    fetchAreaDetail({
      config,
      request: {
        ...request,
        level: 'municipality',
        areaCode: '091',
        municipalityCode: '005',
      },
      fetchFn,
    })
  ).rejects.toMatchObject({ problem: { kind: 'rejected-request' } })
  expect(fetchFn).not.toHaveBeenCalled()
})
test.each([
  [503, 'unavailable'],
  [404, 'not-found'],
  [422, 'rejected-request'],
  [500, 'http'],
])(
  'HTTP %s retains classification even with HTML body',
  async (status, kind) => {
    const fetchFn: AreaFetch = async () =>
      new Response('<html>error</html>', { status: Number(status) })
    await expect(fetchAreaMetadata({ config, fetchFn })).rejects.toMatchObject({
      problem: { kind, status },
    })
  }
)
test('service not-found/unavailable, network, invalid JSON, shape and version are distinct', async () => {
  const fixture = createEnergyAreaFixture()
  await expect(
    fetchAreaDetail({
      config,
      request: { ...request, areaCode: '99999' },
      fetchFn: fixture.fetch,
    })
  ).rejects.toMatchObject({ problem: { kind: 'not-found', status: 404 } })
  await expect(
    fetchAreaDetail({
      config,
      request: { ...request, municipalityCode: '999' },
      fetchFn: fixture.fetch,
    })
  ).rejects.toMatchObject({ problem: { kind: 'not-found', status: 404 } })
  fixture.setActiveRelease(null)
  await expect(
    fetchAreaMetadata({ config, fetchFn: fixture.fetch })
  ).rejects.toMatchObject({ problem: { kind: 'unavailable', status: 503 } })
  const cases: [AreaFetch, string][] = [
    [
      async () => {
        throw new TypeError('offline')
      },
      'network',
    ],
    [async () => new Response('{oops'), 'malformed-contract'],
    [async () => Response.json({}), 'malformed-contract'],
    [
      async () => Response.json({ metric_version: 'building-area-summary-v9' }),
      'unsupported-contract',
    ],
  ]
  for (const [fetchFn, kind] of cases)
    await expect(fetchAreaMetadata({ config, fetchFn })).rejects.toMatchObject({
      problem: { kind },
    })
})
test('wrong echoed release, area and scope never satisfy the pinned detail', async () => {
  const fixture = createEnergyAreaFixture()
  for (const change of [
    { release_id: dataset.releaseIds[1] },
    { area_code: '00200', area_id: 'postal_code:00200' },
    { level: 'municipality', area_code: '091', area_id: 'municipality:091' },
    { scope: { geometry: 'full_postal_area', municipality_code: '091' } },
  ]) {
    fixture.enqueue({
      match: () => true,
      transform: (payload) => ({ ...(payload as object), ...change }),
    })
    await expect(
      fetchAreaDetail({ config, request, fetchFn: fixture.fetch })
    ).rejects.toMatchObject({ problem: { kind: 'malformed-contract' } })
  }
  fixture.enqueue({
    match: () => true,
    transform: (payload) => ({
      ...(payload as object),
      release_id: dataset.releaseIds[1],
    }),
  })
  await expect(
    fetchAreaMetadata({
      config,
      releaseId: request.releaseId,
      fetchFn: fixture.fetch,
    })
  ).rejects.toMatchObject({ problem: { kind: 'malformed-contract' } })
})
test('abort reaches transport and prevents late noncooperative transport/body success', async () => {
  for (const bodyDelay of [false, true]) {
    const gate = createFixtureGate()
    const controller = new AbortController()
    let observedSignal: AbortSignal | null | undefined
    const fetchFn: AreaFetch = async (_url, init) => {
      observedSignal = init?.signal
      if (!bodyDelay) await gate.promise
      const response = Response.json(
        dataset.snapshots[0].details['postal_code:00100']
      )
      if (bodyDelay)
        response.json = async () => {
          await gate.promise
          return dataset.snapshots[0].details['postal_code:00100']
        }
      return response
    }
    const pending = fetchAreaDetail({
      config,
      request,
      signal: controller.signal,
      fetchFn,
    })
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'AbortError',
    })
    await settle()
    controller.abort()
    gate.release()
    await assertion
    expect(observedSignal).toBe(controller.signal)
  }
})

test('body stream failure is network failure, while AbortError remains cancellation', async () => {
  for (const aborted of [false, true]) {
    const fetchFn: AreaFetch = async () => {
      const response = Response.json({})
      response.json = async () => {
        throw aborted
          ? new DOMException('cancelled', 'AbortError')
          : new TypeError('stream closed')
      }
      return response
    }
    await expect(fetchAreaMetadata({ config, fetchFn })).rejects.toMatchObject(
      aborted ? { name: 'AbortError' } : { problem: { kind: 'network' } }
    )
  }
})
