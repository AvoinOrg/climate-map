import geojsonVt from 'geojson-vt'
import { fromGeojsonVt } from '@maplibre/vt-pbf'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { snapshots } = require('./dataset.json')
const indexes = new Map()
export const fixtureTile = ({
  releaseId,
  level,
  z,
  x,
  y,
  sourceLayer = 'areas',
}) => {
  const key = `${releaseId}:${level}`
  if (!indexes.has(key)) {
    const snapshot = snapshots.find((s) => s.metadata.release_id === releaseId)
    if (!snapshot?.geometry[level])
      throw new Error('Unknown fixture release/level')
    indexes.set(
      key,
      geojsonVt(snapshot.geometry[level], {
        maxZoom: 14,
        extent: 4096,
        buffer: 64,
        tolerance: 0,
      })
    )
  }
  const tile = indexes.get(key).getTile(z, x, y)
  return Buffer.from(tile ? fromGeojsonVt({ [sourceLayer]: tile }) : [])
}
