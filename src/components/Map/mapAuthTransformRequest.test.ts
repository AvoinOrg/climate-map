import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { registerMapTileRequestTransform } from '#/common/utils/mapTileRequestTransforms'
import type { ResourceType } from 'maplibre-gl'
import { EMBEDDED_PARAMS_URL_PREFIX } from '#/common/types/map'

const mockDecodeUrlAndParams = jest.fn()

jest.mock('#/common/utils/map', () => ({
  decodeUrlAndParams: mockDecodeUrlAndParams,
}))

const { createMapTransformRequest } = jest.requireActual<
  typeof import('./mapAuthTransformRequest')
>('./mapAuthTransformRequest')

describe('createMapTransformRequest', () => {
  const originalGeoserverUrl = process.env.PUBLIC_GEOSERVER_URL
  const originalLegacyGeoserverUrl =
    process.env.NEXT_PUBLIC_GEOSERVER_URL

  beforeEach(() => {
    process.env.PUBLIC_GEOSERVER_URL = 'https://gis.example.test/geoserver'
    delete process.env.NEXT_PUBLIC_GEOSERVER_URL
    mockDecodeUrlAndParams.mockReset()
  })

  afterAll(() => {
    if (originalGeoserverUrl === undefined) {
      delete process.env.PUBLIC_GEOSERVER_URL
    } else {
      process.env.PUBLIC_GEOSERVER_URL = originalGeoserverUrl
    }
    if (originalLegacyGeoserverUrl === undefined) {
      delete process.env.NEXT_PUBLIC_GEOSERVER_URL
    } else {
      process.env.NEXT_PUBLIC_GEOSERVER_URL = originalLegacyGeoserverUrl
    }
  })

  it('adds the access token for configured GeoServer URLs that require a token', () => {
    const url =
      'https://gis.example.test/geoserver/wms?service=WMS&requireToken=true'
    const transformRequest = createMapTransformRequest({
      accessToken: 'map-access-token',
    })

    expect(transformRequest(url)).toEqual({
      url,
      headers: {
        Authorization: 'Bearer map-access-token',
      },
    })
  })

  it('returns the original GeoServer URL when a required token is missing', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const url =
      'https://gis.example.test/geoserver/wms?service=WMS&requireToken=true'
    const transformRequest = createMapTransformRequest({})

    expect(transformRequest(url)).toEqual({ url })
    expect(errorSpy).toHaveBeenCalledWith(
      'Maplibre: No access token provided for the request.',
      url
    )

    errorSpy.mockRestore()
  })

  it('matches against a normalized configured base', () => {
    process.env.PUBLIC_GEOSERVER_URL =
      '  https://gis.example.test/geoserver///  '
    const url =
      'https://gis.example.test/geoserver/wms?service=WMS&requireToken=true'
    const transformRequest = createMapTransformRequest({
      accessToken: 'map-access-token',
    })

    expect(transformRequest(url)).toMatchObject({
      headers: { Authorization: 'Bearer map-access-token' },
    })
  })

  it.each([undefined, 'not-a-url', 'https://undefined.example.test/geoserver'])(
    'does not match requests when the canonical base is unavailable',
    (configuredBase) => {
      if (configuredBase === undefined) {
        delete process.env.PUBLIC_GEOSERVER_URL
      } else {
        process.env.PUBLIC_GEOSERVER_URL = configuredBase
      }
      process.env.NEXT_PUBLIC_GEOSERVER_URL =
        'https://gis.example.test/geoserver'
      const url =
        'https://gis.example.test/geoserver/wms?service=WMS&requireToken=true'
      const transformRequest = createMapTransformRequest({
        accessToken: 'map-access-token',
      })

      expect(transformRequest(url)).toBeUndefined()
    }
  )

  it('adds the access token for embedded URLs with useAccessToken', () => {
    const embeddedUrl = `${EMBEDDED_PARAMS_URL_PREFIX}fixture`
    const originalUrl = 'https://tiles.example.test/private.json'
    mockDecodeUrlAndParams.mockReturnValue({
      url: originalUrl,
      params: {
        useAccessToken: true,
        sourceId: 'fixture-source',
      },
    })
    const transformRequest = createMapTransformRequest({
      accessToken: 'map-access-token',
    })

    expect(transformRequest(embeddedUrl)).toEqual({
      url: originalUrl,
      headers: {
        Authorization: 'Bearer map-access-token',
      },
    })
  })

  it('tracks stale embedded sources when a required token is missing', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const addStaleSourceId = jest.fn()
    const embeddedUrl = `${EMBEDDED_PARAMS_URL_PREFIX}fixture`
    const originalUrl = 'https://tiles.example.test/private.json'
    mockDecodeUrlAndParams.mockReturnValue({
      url: originalUrl,
      params: {
        useAccessToken: true,
        sourceId: 'fixture-source',
      },
    })
    const transformRequest = createMapTransformRequest({
      addStaleSourceId,
    })

    expect(transformRequest(embeddedUrl)).toEqual({ url: originalUrl })
    expect(addStaleSourceId).toHaveBeenCalledWith('fixture-source')
    expect(errorSpy).toHaveBeenCalledWith(
      'Maplibre: No access token provided for the request.',
      originalUrl
    )

    errorSpy.mockRestore()
  })

  it('unwraps embedded URLs that do not request an access token', () => {
    const embeddedUrl = `${EMBEDDED_PARAMS_URL_PREFIX}fixture`
    const originalUrl = 'https://tiles.example.test/public.json'
    mockDecodeUrlAndParams.mockReturnValue({
      url: originalUrl,
      params: {
        useAccessToken: false,
      },
    })
    const transformRequest = createMapTransformRequest({
      accessToken: 'map-access-token',
    })

    expect(transformRequest(embeddedUrl)).toEqual({ url: originalUrl })
  })
})

it('composes an owned tile transport with authentication and preserves other request types and cleanup', () => {
  const previous = process.env.PUBLIC_GEOSERVER_URL
  process.env.PUBLIC_GEOSERVER_URL = 'https://gis.example.test/geoserver'
  const url = 'https://gis.example.test/geoserver/areas/11/1166/592.pbf?requireToken=true'
  const transform = createMapTransformRequest({ accessToken: 'test-access-token' })
  const dispose = registerMapTileRequestTransform((request) => request.url === url ? { ...request, url: 'test-transport://area' } : undefined)
  expect(transform(url, 'Tile' as ResourceType)).toEqual({ url: 'test-transport://area', headers: { Authorization: 'Bearer test-access-token' } })
  expect(transform(url, 'Glyphs' as ResourceType)).toEqual({ url, headers: { Authorization: 'Bearer test-access-token' } })
  expect(transform('https://other.test/tile.pbf', 'Tile' as ResourceType)).toBeUndefined()
  dispose()
  expect(transform(url, 'Tile' as ResourceType)?.url).toBe(url)
  if (previous === undefined) delete process.env.PUBLIC_GEOSERVER_URL
  else process.env.PUBLIC_GEOSERVER_URL = previous
})
