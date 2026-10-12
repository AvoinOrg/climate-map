// Explicit Node/test seam only. This file is never imported by application code.
const dataset = require('./dataset.json')
const API_ORIGIN = 'https://energy-areas.fixture.test'
const TILE_ORIGIN = 'https://sandbox.gis.avoin.org'
const levels = ['postal_code', 'municipality', 'region']
const patterns = {
  postal_code: /^[0-9]{5}$/,
  municipality: /^[0-9]{3}$/,
  region: /^[0-9]{2}$/,
}
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
const createEnergyAreaFixture = () => {
  let activeReleaseId = dataset.releaseIds[0]
  const rules = []
  const requests = []
  const tilePattern =
    /^\/geoserver\/gwc\/service\/tms\/1.0.0\/sandbox_energiakartta%3Aenergymap_(postal_code|municipality|region)_areas@EPSG%3A900913@pbf\/(\d+)\/(\d+)\/(\d+)\.pbf$/i
  const matches = (url) =>
    (url.origin === API_ORIGIN &&
      url.pathname.startsWith('/energy-data/areas/')) ||
    (url.origin === TILE_ORIGIN && tilePattern.test(url.pathname))
  const routeRequest = async (url) => {
    if (url.searchParams.has('release_id'))
      return error(
        422,
        'Versioned requests are outside the latest fixture contract'
      )
    const snapshot = dataset.snapshots.find(
      (s) => s.snapshotId === activeReleaseId
    )
    if (!snapshot) return error(503, 'No active area data')
    const tile = url.origin === TILE_ORIGIN && url.pathname.match(tilePattern)
    if (tile) {
      const [, level, zs, xs, ys] = tile
      const z = Number(zs),
        x = Number(xs),
        row = Number(ys)
      if (z > 14 || x >= 2 ** z || row >= 2 ** z)
        return error(422, 'Invalid tile coordinates')
      const { fixtureTile } = await import('./tiles.mjs')
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.mapbox-vector-tile',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
        body: fixtureTile({
          releaseId: snapshot.snapshotId,
          level,
          z,
          x,
          y: 2 ** z - 1 - row,
        }),
      }
    }
    const parts = url.pathname.slice('/energy-data/areas/'.length).split('/')
    if (parts.length === 1 && parts[0] === 'metadata')
      return json({
        status: 200,
        value: clone(snapshot.metadata),
        headers: { 'Cache-Control': 'no-cache' },
      })
    const [level, code] = parts
    const municipality = url.searchParams.get('municipality_code')
    if (
      parts.length !== 2 ||
      !levels.includes(level) ||
      !patterns[level].test(code) ||
      (municipality !== null &&
        (level !== 'postal_code' || !patterns.municipality.test(municipality)))
    )
      return error(422, 'Invalid area identity/scope')
    const detail = snapshot.details[`${level}:${code}`]
    if (
      !detail ||
      (municipality !== null &&
        !snapshot.details[`municipality:${municipality}`])
    )
      return error(404, 'Area not found')
    return json({
      status: 200,
      value: clone(
        municipality === null
          ? detail
          : snapshot.intersections[`${code}:${municipality}`]
      ),
      headers: { 'Cache-Control': 'no-cache' },
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
