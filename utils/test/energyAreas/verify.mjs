// Independent decoder verification: Node ESM keeps Jest's global CJS setup intact.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { VectorTile } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import { fixtureTile } from './tiles.mjs'
import { installEnergyAreaFixtureRoutes } from './playwright.mjs'
const require = createRequire(import.meta.url)
const dataset = require('./dataset.json')
const manifest = require('./manifest.json')
const { API_ORIGIN, createEnergyAreaFixture, createFixtureGate } =
  require('./responder.cjs')
const decode = (bytes) => new VectorTile(new Pbf(bytes))
let decodedFeatures = 0
const fragments = []
for (const sample of manifest.tiles) {
  const bytes = await fs.readFile(new URL(sample.file, import.meta.url))
  assert.deepEqual(
    bytes,
    fixtureTile({ ...sample, sourceLayer: sample.sourceLayer })
  )
  const tile = decode(bytes),
    layer = tile.layers[sample.sourceLayer]
  assert(layer && layer.length > 0, `nonempty ${sample.file}`)
  assert.deepEqual(Object.keys(tile.layers), [sample.sourceLayer])
  const snapshot = dataset.snapshots.find(
    (s) => s.metadata.release_id === sample.releaseId
  )
  for (let index = 0; index < layer.length; index++) {
    const feature = layer.feature(index),
      properties = feature.properties
    assert.equal(feature.type, 3, 'actual polygon commands')
    const rings = feature.loadGeometry()
    assert(rings.length && rings.every((r) => r.length >= 4))
    assert(
      rings.every((r) => r[0].x === r.at(-1).x && r[0].y === r.at(-1).y),
      'closed rings'
    )
    const geographic = feature.toGeoJSON(sample.x, sample.y, sample.z)
    assert.equal(geographic.geometry.type, 'Polygon')
    const points = geographic.geometry.coordinates.flat()
    assert(
      points.every(
        ([lon, lat]) => lon > 24.5 && lon < 25.6 && lat > 59.8 && lat < 60.5
      ),
      'coordinate-correct Finnish extent'
    )
    const full = snapshot.details[properties.area_id]
    assert(full)
    assert.equal(properties.release_id, full.release_id)
    assert.equal(properties.level, full.level)
    assert.equal(properties.area_code, full.area_code)
    assert.equal(
      feature.id,
      Number(full.area_code),
      'numeric fid deliberately loses leading zeroes'
    )
    assert.equal(properties.building_count, full.building_count)
    assert.equal(
      properties.valid_official_class_count,
      full.valid_official_class_count
    )
    if (full.certificate_coverage === null)
      assert(!Object.hasOwn(properties, 'certificate_coverage'))
    else
      assert(
        Math.abs(properties.certificate_coverage - full.certificate_coverage) <
          1e-6
      )
    for (const lang of ['fi', 'sv', 'en'])
      assert.equal(properties[`name_${lang}`], full.names[lang] ?? undefined)
    if (
      sample.releaseId === dataset.releaseIds[0] &&
      sample.level === 'postal_code' &&
      sample.scheme === 'xyz' &&
      properties.area_id === 'postal_code:00100'
    )
      fragments.push({ sample, properties, geometry: rings })
    decodedFeatures++
  }
}
assert.equal(fragments.length, 2)
assert.equal(Math.abs(fragments[0].sample.x - fragments[1].sample.x), 1)
assert.deepEqual(fragments[0].properties, fragments[1].properties)
assert.notDeepEqual(
  fragments[0].geometry,
  fragments[1].geometry,
  'different clipped fragments'
)
const full = dataset.snapshots[0].details['postal_code:00100']
assert.equal(full.building_count, 5)
assert.equal(dataset.snapshots[0].intersections['00100:091'].building_count, 2)
assert.equal(dataset.snapshots[0].intersections['00100:009'].building_count, 0)
assert.deepEqual(
  dataset.snapshots[0].intersections['00100:009'].metrics,
  dataset.emptyMetrics
)
assert.deepEqual(
  dataset.snapshots[0].intersections['00100:091'].related_areas,
  full.related_areas
)
assert.equal(fragments[0].properties.building_count, 5)
// Whole polygon crosses both synthetic municipalities, across their shared meridian.
const postal = dataset.snapshots[0].geometry.postal_code.features.find(
  (f) => f.properties.area_code === '00100'
)
assert(
  postal.geometry.coordinates[0].some(
    (p) => p[0] < manifest.municipalityBorderLongitude
  )
)
assert(
  postal.geometry.coordinates[0].some(
    (p) => p[0] > manifest.municipalityBorderLongitude
  )
)
// Verify arbitrary coordinates through the shared responder, not just recorded samples.
for (const delivery of ['native', 'xyz', 'tms']) {
  const fixture = createEnergyAreaFixture({ delivery })
  for (const releaseId of dataset.releaseIds) {
    const metadataResponse = await fixture.respond(
      `${API_ORIGIN}/energy-data/areas/metadata?release_id=${releaseId}`
    )
    assert.equal(metadataResponse.headers['Cache-Control'], 'no-cache')
    const metadata = JSON.parse(metadataResponse.body)
    for (const level of ['postal_code', 'municipality', 'region']) {
      const descriptor = metadata.layers[level]
      const sample = manifest.tiles.find(
        (t) =>
          t.releaseId === releaseId &&
          t.level === level &&
          t.scheme === (delivery === 'tms' ? 'tms' : 'xyz')
      )
      const template = descriptor.url.startsWith('/')
        ? API_ORIGIN + descriptor.url
        : descriptor.url
      const url = template
        .replaceAll('{z}', sample.z)
        .replaceAll('{x}', sample.x)
        .replaceAll('{y}', sample.row)
      const response = await fixture.respond(url)
      assert.equal(response.status, 200)
      assert.equal(response.headers['X-Energy-Map-Release'], releaseId)
      assert.match(response.headers['Cache-Control'], /immutable/)
      assert.equal(
        response.headers['Content-Type'],
        'application/vnd.mapbox-vector-tile'
      )
      assert(decode(response.body).layers[descriptor.source_layer].length > 0)
    }
    for (const detail of Object.values(
      dataset.snapshots.find((s) => s.metadata.release_id === releaseId).details
    )) {
      const response = await fixture.respond(
        `${API_ORIGIN}/energy-data/areas/${detail.level}/${detail.area_code}?release_id=${releaseId}`
      )
      assert.deepEqual(JSON.parse(response.body), detail)
    }
  }
}
const fixture = createEnergyAreaFixture()
const prefix = `${API_ORIGIN}/energy-data/areas`
for (const [path, status] of [
  ['/metadata?release_id=bad', 422],
  ['/metadata?release_id=ffffffff-ffff-4fff-8fff-ffffffffffff', 404],
  ['/city/00100', 422],
  ['/municipality/5', 422],
  ['/municipality/091?municipality_code=005', 422],
  ['/postal_code/00100?municipality_code=999', 404],
  [`/${dataset.releaseIds[0]}/region/tiles/15/0/0.pbf`, 422],
  [`/${dataset.releaseIds[0]}/region/tiles/2/4/0.pbf`, 422],
])
  assert.equal((await fixture.respond(prefix + path)).status, status)
for (let z = 0; z <= 14; z++) {
  const response = await fixture.respond(
    `${prefix}/${dataset.releaseIds[0]}/postal_code/tiles/${z}/0/0.pbf`
  )
  assert.equal(response.status, 200)
  const tile = decode(response.body)
  if (z > 0) assert.deepEqual(tile.layers, {})
}
// Nonempty valid zero and empty absence on coordinate-correct tiles at z=12.
const coord = ({ lon, lat, z }) => ({
  z,
  x: Math.floor(((lon + 180) / 360) * 2 ** z),
  y: Math.floor(
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z
  ),
})
const sample = coord({ lon: 25.25, lat: 60.16, z: 12 })
const zeroTile = decode(
  fixtureTile({
    releaseId: dataset.releaseIds[0],
    level: 'postal_code',
    ...sample,
  })
).layers.areas
assert(zeroTile)
assert(
  Array.from(
    { length: zeroTile.length },
    (_, i) => zeroTile.feature(i).properties
  ).some(
    (p) =>
      p.area_code === '00400' &&
      p.building_count > 0 &&
      p.certificate_coverage === 0
  )
)
const emptyTile = decode(
  fixtureTile({
    releaseId: dataset.releaseIds[0],
    level: 'postal_code',
    ...coord({ lon: 25.15, lat: 60.16, z: 12 }),
  })
).layers.areas
assert(
  Array.from(
    { length: emptyTile.length },
    (_, i) => emptyTile.feature(i).properties
  ).some(
    (p) =>
      p.area_code === '00300' &&
      !Object.hasOwn(p, 'certificate_coverage') &&
      !Object.hasOwn(p, 'name_fi')
  )
)
// Explicit interception seam forwards the same binary bytes and cleans up exactly its route.
const registrations = []
const target = {
  route: async (predicate, handler) =>
    registrations.push({ predicate, handler }),
  unroute: async (predicate, handler) => {
    assert.equal(predicate, registrations[0].predicate)
    assert.equal(handler, registrations[0].handler)
  },
}
const installed = await installEnergyAreaFixtureRoutes({ target, fixture })
assert(
  !registrations[0].predicate(
    new URL('https://production.example.test/energy-data/areas/metadata')
  )
)
assert(!registrations[0].predicate(new URL(`${API_ORIGIN}/unrelated`)))
assert.equal(
  (await fixture.respond(`${prefix}/metadata`, { method: 'OPTIONS' })).status,
  204
)
assert.equal(
  (await fixture.respond(`${prefix}/metadata`, { method: 'POST' })).status,
  405
)
let fulfilled, aborted
const tileUrl = `${prefix}/${dataset.releaseIds[0]}/postal_code/tiles/11/1165/592.pbf`
const route = {
  request: () => ({ url: () => tileUrl, method: () => 'GET' }),
  fulfill: async (response) => {
    fulfilled = response
  },
  abort: async (reason) => {
    aborted = reason
  },
}
await registrations[0].handler(route)
assert(Buffer.isBuffer(fulfilled.body))
assert(decode(fulfilled.body).layers.areas)
fixture.enqueue({ match: () => true, network: true })
await registrations[0].handler(route)
assert.equal(aborted, 'failed')
await installed.dispose()
// Deterministic error and delay controls also work for tiles.
fixture.enqueue({
  match: () => true,
  response: { status: 503, headers: {}, body: Buffer.from('tile unavailable') },
})
assert.equal((await fixture.respond(tileUrl)).status, 503)
fixture.enqueue({
  match: () => true,
  response: { status: 200, headers: {}, body: Buffer.from([0x07]) },
})
const malformed = await fixture.respond(tileUrl)
assert.throws(() => decode(malformed.body))
const gate = createFixtureGate()
fixture.enqueue({ match: () => true, gate: gate.promise })
let resolved = false
const delayed = fixture.respond(tileUrl).then((response) => {
  resolved = true
  return response
})
await new Promise((resolve) => setImmediate(resolve))
assert.equal(resolved, false)
gate.release()
assert.equal((await delayed).status, 200)
// Production boundary may not import fixture code or point at test origins.
for (const file of ['config.ts', 'contract.ts', 'client.ts', 'queries.ts']) {
  const source = await fs.readFile(
    new URL(
      `../../../src/applets/energy/common/areas/${file}`,
      import.meta.url
    ),
    'utf8'
  )
  assert(!source.includes('utils/test') && !source.includes('.fixture.test'))
}
const sourceFactory = await fs.readFile(
  new URL('../../../src/applets/energy/layers/areaSource.ts', import.meta.url),
  'utf8'
)
assert(
  !sourceFactory.includes('utils/test') &&
    !sourceFactory.includes('.fixture.test')
)
console.log(
  `PASS: ${manifest.tiles.length} recorded MVT files, ${decodedFeatures} decoded polygons; native/XYZ/TMS API routing, fragments, three releases, empty/zero/scoped data, binary browser adapter, errors/delays and isolation.`
)
