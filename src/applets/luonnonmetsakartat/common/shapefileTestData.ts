// Local binary fixtures only; no services or downloaded data.
import fs from 'node:fs'
import path from 'node:path'
import type { FeatureCollection, GeoJsonProperties } from 'geojson'

export const fixtureDir = path.join(
  process.cwd(),
  'test-data/luonnonmetsakartat'
)
export const toArrayBuffer = (bytes: ArrayLike<number>): ArrayBuffer =>
  Uint8Array.from(bytes).buffer
export const fixtureBytes = (name = 'valid-layer.zip') =>
  toArrayBuffer(fs.readFileSync(path.join(fixtureDir, name)))
export const collection = (
  properties: GeoJsonProperties[]
): FeatureCollection => ({
  type: 'FeatureCollection',
  features: properties.map((props) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [24, 60] },
    properties: props,
  })),
})
export const expectedColumns = {
  indexingStrategy: 'id' as const,
  idCol: 'id',
  nameCol: 'nimi',
  municipalityCol: 'kunta',
  regionCol: 'maakunta',
  descriptionCol: 'kuvaus',
  areaCol: 'pinta_ala',
}
