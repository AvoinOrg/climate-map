/** @jest-environment node */
import maplibregl from 'maplibre-gl'
import { registerAreaTileTransport } from './tileTransport'
import { transformRegisteredMapTileRequest } from '#/common/utils/mapTileRequestTransforms'
import { createAreaSourceDescriptors } from 'applets/energy/layers/areaSource'

jest.mock('maplibre-gl', () => ({
  __esModule: true,
  default: { addProtocol: jest.fn(), removeProtocol: jest.fn() },
}))
const descriptors = createAreaSourceDescriptors()
it('fetches the exact advertised URL once, keeps headers/caching, exposes suppressed 404 and cleans only its registration', async () => {
  let active = true
  const dispose = registerAreaTileTransport({
    descriptors,
    isCurrent: () => active,
  })
  const url = descriptors[0].source
    .tiles![0].replace('{z}', '11')
    .replace('{x}', '1166')
    .replace('{y}', '592')
  const transformed = transformRegisteredMapTileRequest({
    url,
    headers: { Accept: 'application/vnd.mapbox-vector-tile' },
  })!
  expect(transformed.url).toMatch(/^energy-area-\d+:\/\//)
  expect(
    transformRegisteredMapTileRequest({
      url: 'https://other.test/11/1166/592.pbf',
    })
  ).toBeUndefined()
  const [protocol, handler] = (
    maplibregl.addProtocol as jest.Mock
  ).mock.calls.at(-1)!
  const controller = new AbortController()
  const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(new Uint8Array([1, 2]), {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  )
  const response = await handler(transformed, controller)
  expect(fetchSpy).toHaveBeenCalledTimes(1)
  expect(fetchSpy).toHaveBeenCalledWith(
    url,
    expect.objectContaining({
      signal: controller.signal,
      headers: transformed.headers,
    })
  )
  expect([...new Uint8Array(response.data)]).toEqual([1, 2])
  expect(response.cacheControl).toContain('immutable')
  fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }))
  await expect(handler(transformed, controller)).rejects.toThrow(
    'Area tile transport failed'
  )
  fetchSpy.mockResolvedValueOnce(new Response(new Uint8Array(0)))
  expect((await handler(transformed, controller)).data.byteLength).toBe(0)
  active = false
  expect(transformRegisteredMapTileRequest({ url })).toBeUndefined()
  dispose()
  expect(maplibregl.removeProtocol).toHaveBeenCalledWith(protocol)
  expect(transformRegisteredMapTileRequest({ url })).toBeUndefined()
  fetchSpy.mockRestore()
})
