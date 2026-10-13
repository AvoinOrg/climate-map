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
const {
  API_ORIGIN,
  createEnergyAreaFixture,
  createFixtureGate,
} = require('./responder.cjs')
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
    (s) => s.snapshotId === sample.releaseId
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
    assert(!Object.hasOwn(properties, 'release_id'))
    assert.equal(properties.level, full.level)
    assert.equal(properties.area_code, full.area_code)
    assert.equal(
      feature.id,
      Number(full.area_code),
      'numeric fid deliberately loses leading zeroes'
    )
    assert.equal(properties.building_count, full.building_count)
    assert.equal(properties.thematic_contract_version, 1)
    const recognized = [...'ABCDEFG'].reduce((total, code) => {
      const count = properties[`energy_class_${code.toLowerCase()}_count`]
      assert.equal(count, full.metrics.energy_class.counts[code] ?? 0)
      return total + count
    }, 0)
    assert.equal(
      recognized + properties.energy_class_unknown_count,
      full.building_count
    )
    assert.equal(
      properties.energy_class_official_count +
        properties.energy_class_modeled_count,
      recognized
    )
    assert.equal(
      ['geothermal', 'district', 'electricity', 'solar', 'other'].reduce(
        (total, key) => total + properties[`heating_${key}_count`],
        0
      ),
      full.building_count
    )
    assert.equal(
      ['mechanical', 'gravity', 'other', 'no_info'].reduce(
        (total, key) => total + properties[`ventilation_${key}_count`],
        0
      ),
      full.building_count
    )
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
// Latest HTTP and stable tiles are independent of advertised metadata.
const fixture = createEnergyAreaFixture()
const prefix = `${API_ORIGIN}/energy-data/areas`
const stableTemplate = (level) =>
  `https://sandbox.gis.avoin.org/geoserver/gwc/service/tms/1.0.0/sandbox_energiakartta%3Aenergymap_${level}_areas@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf`
for (const releaseId of dataset.releaseIds) {
  fixture.setActiveRelease(releaseId)
  const snapshot = dataset.snapshots.find((s) => s.snapshotId === releaseId)
  const metadata = JSON.parse(
    (await fixture.respond(`${prefix}/metadata`)).body
  )
  assert.equal(metadata.latest, true)
  assert(!Object.hasOwn(metadata, 'release_id'))
  for (const level of ['postal_code', 'municipality', 'region']) {
    const sample = manifest.tiles.find(
      (t) =>
        t.releaseId === releaseId && t.level === level && t.scheme === 'tms'
    )
    const url = stableTemplate(level)
      .replace('{z}', sample.z)
      .replace('{x}', sample.x)
      .replace('{y}', sample.row)
    const response = await fixture.respond(url)
    assert.equal(response.status, 200)
    assert.match(response.headers['Cache-Control'], /no-cache/)
    assert(decode(response.body).layers[`energymap_${level}_areas`].length > 0)
  }
  for (const detail of Object.values(snapshot.details)) {
    const response = await fixture.respond(
      `${prefix}/${detail.level}/${detail.area_code}`
    )
    assert.deepEqual(JSON.parse(response.body), detail)
    assert.equal(detail.latest, true)
    assert(!Object.hasOwn(detail, 'release_id'))
  }
  const scoped = JSON.parse(
    (await fixture.respond(`${prefix}/postal_code/00100?municipality_code=091`))
      .body
  )
  assert.deepEqual(scoped, snapshot.intersections['00100:091'])
}
fixture.setActiveRelease(dataset.releaseIds[0])
assert.equal(
  (await fixture.respond(`${prefix}/postal_code/00100?release_id=bad`)).status,
  422
)
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
).layers.energymap_postal_code_areas
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
).layers.energymap_postal_code_areas
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
const tileUrl = stableTemplate('postal_code')
  .replace('{z}', '11')
  .replace('{x}', '1165')
  .replace('{y}', '1455')
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
assert(decode(fulfilled.body).layers.energymap_postal_code_areas)
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
  `PASS: ${manifest.tiles.length} recorded MVT files, ${decodedFeatures} decoded polygons; stable TMS/latest API routing, fragments, three private snapshots, empty/zero/scoped data, binary browser adapter, errors/delays and isolation.`
)
