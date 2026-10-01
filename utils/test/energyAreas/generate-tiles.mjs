import fs from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fixtureTile } from './tiles.mjs'
const require = createRequire(import.meta.url)
const { releaseIds } = require('./dataset.json')
const coordinate = ({ lon, lat, z }) => ({
  z,
  x: Math.floor(((lon + 180) / 360) * 2 ** z),
  y: Math.floor(
    ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z
  ),
})
const samples = [
  { level: 'region', ...coordinate({ lon: 24.94, lat: 60.16, z: 6 }) },
  { level: 'municipality', ...coordinate({ lon: 24.94, lat: 60.16, z: 8 }) },
  { level: 'postal_code', ...coordinate({ lon: 24.97, lat: 60.16, z: 11 }) },
  // Crossing 00100 spans x=1165/1166 at z=11.
  { level: 'postal_code', ...coordinate({ lon: 24.9, lat: 60.16, z: 11 }) },
]
const tiles = []
for (const releaseId of releaseIds)
  for (const sample of samples)
    for (const scheme of ['xyz', 'tms']) {
      const sourceLayer = scheme === 'xyz' ? 'areas' : `fixture_${sample.level}`
      const row = scheme === 'tms' ? 2 ** sample.z - 1 - sample.y : sample.y
      const file = `tiles/${releaseId}/${scheme}/${sample.level}/${sample.z}-${sample.x}-${row}.pbf`
      const target = new URL(file, import.meta.url)
      await fs.mkdir(new URL('.', target), { recursive: true })
      await fs.writeFile(
        target,
        fixtureTile({ releaseId, ...sample, sourceLayer })
      )
      tiles.push({ releaseId, ...sample, scheme, row, sourceLayer, file })
    }
await fs.writeFile(
  new URL('./manifest.json', import.meta.url),
  JSON.stringify(
    {
      center: [24.94, 60.16],
      postalZoom: 11,
      municipalityBorderLongitude: 24.94,
      postalBounds: [24.9, 60.12, 24.98, 60.2],
      tiles,
    },
    null,
    2
  ) + '\n'
)
console.log(
  `Generated ${tiles.length} real coordinate-correct MVT samples (three releases, three levels, XYZ/TMS).`
)
