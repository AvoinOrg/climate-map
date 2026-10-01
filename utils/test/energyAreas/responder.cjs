// Explicit Node/test seam only. This file is never imported by application code.
const dataset = require('./dataset.json')
const API_ORIGIN = 'https://energy-areas.fixture.test'
const TILE_ORIGIN = 'https://energy-tiles.fixture.test'
const levels = ['postal_code', 'municipality', 'region']
const patterns = {
  postal_code: /^[0-9]{5}$/,
  municipality: /^[0-9]{3}$/,
  region: /^[0-9]{2}$/,
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const clone = (value) => globalThis.structuredClone(value)
const json = ({ status, value, headers = {} }) => ({
  status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type, Cache-Control',
    ...headers,
  },
  body: Buffer.from(JSON.stringify(value)),
})
const error = (status, detail) => json({ status, value: { detail } })
const createEnergyAreaFixture = ({ delivery = 'native' } = {}) => {
  let activeReleaseId = dataset.releaseIds[0]
  let advertised = delivery
  const rules = []
  const requests = []
  const matches = (url) =>
    (url.origin === API_ORIGIN &&
      url.pathname.startsWith('/energy-data/areas/')) ||
    (url.origin === TILE_ORIGIN &&
      url.pathname.startsWith('/gwc/service/tms/1.0.0/'))
  const metadataFor = (snapshot) => {
    const metadata = clone(snapshot.metadata)
    if (advertised === 'tms')
      metadata.layers = Object.fromEntries(
        levels.map((level, index) => [
          level,
          {
            url: `${TILE_ORIGIN}/gwc/service/tms/1.0.0/fixture%3A${metadata.release_id}_${level}@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?release_id=${metadata.release_id}&column={x}&row={y}`,
            source_layer: `fixture_${level}`,
            minzoom: index,
            maxzoom: 14 - index,
            scheme: 'tms',
          },
        ])
      )
    if (advertised === 'xyz')
      for (const layer of Object.values(metadata.layers)) layer.scheme = 'xyz'
    return metadata
  }
  const routeRequest = async (url) => {
    const parts = url.pathname.slice('/energy-data/areas/'.length).split('/')
    let releaseId = url.searchParams.get('release_id')
    const nativeTile = parts.length === 6 && parts[2] === 'tiles'
    const tmsTile = url.origin === TILE_ORIGIN
    let level,
      z,
      x,
      y,
      sourceLayer = 'areas'
    if (nativeTile) {
      releaseId = parts[0]
      level = parts[1]
      if (
        !/^-?[0-9]+$/.test(parts[3]) ||
        !/^-?[0-9]+$/.test(parts[4]) ||
        !/^-?[0-9]+\.pbf$/.test(parts[5])
      )
        return error(422, 'Invalid tile coordinate syntax')
      z = Number(parts[3])
      x = Number(parts[4])
      y = Number(parts[5].replace(/\.pbf$/, ''))
    } else if (tmsTile) {
      const match = url.pathname.match(
        /\/fixture%3A([0-9a-f-]+)_(postal_code|municipality|region)@EPSG%3A900913@pbf\/(\d+)\/(\d+)\/(\d+)\.pbf$/i
      )
      if (!match) return error(422, 'Invalid advertised fixture tile path')
      releaseId = match[1]
      level = match[2]
      z = Number(match[3])
      x = Number(match[4])
      y = 2 ** z - 1 - Number(match[5])
      sourceLayer = `fixture_${level}`
    }
    const [detailLevel, code] = parts
    const municipality = url.searchParams.get('municipality_code')
    const metadataRequest = parts.length === 1 && parts[0] === 'metadata'
    // The service validates code/scope or coordinates before choosing a release.
    if (nativeTile || tmsTile) {
      if (
        !levels.includes(level) ||
        ![z, x, y].every(Number.isSafeInteger) ||
        z < 0 ||
        z > 14 ||
        x < 0 ||
        y < 0 ||
        x >= 2 ** z ||
        y >= 2 ** z
      )
        return error(422, 'Invalid area tile coordinates')
    } else if (
      !metadataRequest &&
      (parts.length !== 2 ||
        !levels.includes(detailLevel) ||
        !patterns[detailLevel].test(code) ||
        (municipality !== null &&
          (detailLevel !== 'postal_code' ||
            !patterns.municipality.test(municipality))))
    )
      return error(422, 'Invalid area identity/scope')
    if (releaseId !== null && !uuid.test(releaseId))
      return error(422, 'Invalid release UUID')
    releaseId = releaseId === null ? activeReleaseId : releaseId.toLowerCase()
    const snapshot = dataset.snapshots.find(
      (s) => s.metadata.release_id === releaseId
    )
    if (!snapshot)
      return error(
        releaseId === null ? 503 : 404,
        releaseId === null ? 'No active area release' : 'Area release not found'
      )
    if (nativeTile || tmsTile) {
      if (tmsTile) {
        const layer = metadataFor(snapshot).layers[level]
        if (z < layer.minzoom || z > layer.maxzoom)
          return error(422, 'Outside advertised fixture zooms')
      }
      const { fixtureTile } = await import('./tiles.mjs')
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.mapbox-vector-tile',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Energy-Map-Release': releaseId,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Content-Type, Cache-Control',
        },
        body: fixtureTile({ releaseId, level, z, x, y, sourceLayer }),
      }
    }
    if (metadataRequest)
      return json({
        status: 200,
        value: metadataFor(snapshot),
        headers: { 'Cache-Control': 'no-cache' },
      })
    const detail = snapshot.details[`${detailLevel}:${code}`]
    if (!detail) return error(404, 'Area not found')
    if (
      municipality !== null &&
      !snapshot.details[`municipality:${municipality}`]
    )
      return error(404, 'Municipality not found')
    return json({
      status: 200,
      value:
        municipality === null
          ? detail
          : snapshot.intersections[`${code}:${municipality}`],
    })
  }
  const respond = async (input, { signal, method = 'GET' } = {}) => {
    const url = new URL(input)
    if (!matches(url))
      throw new Error('Request is outside explicit fixture origins/paths')
    if (method === 'OPTIONS')
      return {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Content-Type, Cache-Control',
        },
        body: Buffer.alloc(0),
      }
    if (method !== 'GET') return error(405, 'Method not allowed')
    const ruleIndex = rules.findIndex((rule) => rule.match(url))
    const rule = ruleIndex < 0 ? undefined : rules.splice(ruleIndex, 1)[0]
    // Freeze response at request time, including active pointer before a delay.
    const response = rule?.response || (await routeRequest(url))
    requests.push(url.href)
    if (rule?.gate) await rule.gate
    if (!rule?.ignoreAbort) signal?.throwIfAborted()
    if (rule?.network)
      throw new TypeError('Deterministic fixture transport failure')
    if (rule?.transform)
      return {
        ...response,
        body: Buffer.from(
          JSON.stringify(rule.transform(JSON.parse(response.body)))
        ),
      }
    return response
  }
  return {
    requests,
    matches,
    respond,
    setActiveRelease: (releaseId) => {
      if (releaseId !== null && !dataset.releaseIds.includes(releaseId))
        throw new Error('Unknown fixture release')
      activeReleaseId = releaseId
    },
    setDelivery: (value) => {
      if (!['native', 'xyz', 'tms'].includes(value))
        throw new Error('Unknown fixture delivery')
      advertised = value
    },
    enqueue: (rule) => rules.push(rule),
    fetch: async (input, init) => {
      const response = await respond(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        { signal: init?.signal, method: init?.method }
      )
      return new Response(response.status === 204 ? null : response.body, {
        status: response.status,
        headers: response.headers,
      })
    },
  }
}
const createFixtureGate = () => {
  let release
  const promise = new Promise((resolve) => {
    release = resolve
  })
  return { promise, release: () => release() }
}
module.exports = {
  API_ORIGIN,
  TILE_ORIGIN,
  createEnergyAreaFixture,
  createFixtureGate,
}
