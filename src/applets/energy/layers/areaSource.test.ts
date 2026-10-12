/** @jest-environment node */
import {
  createAreaSourceDescriptors,
  areaSourceDescriptorSignature,
} from './areaSource'
import { createAreaLayerConf } from './areaLayers'

test('exact stable GeoServer descriptors use published layers, TMS, promoted strings and bounded IDs', () => {
  const sources = createAreaSourceDescriptors()
  expect(sources).toHaveLength(3)
  for (const d of sources) {
    expect(d.sourceId).toBe(`energymap_areas_${d.level}`)
    expect(d.sourceLayer).toBe(`energymap_${d.level}_areas`)
    expect(d.source).toEqual({
      type: 'vector',
      scheme: 'tms',
      promoteId: 'area_id',
      minzoom: 0,
      maxzoom: 14,
      tiles: [
        `https://sandbox.gis.avoin.org/geoserver/gwc/service/tms/1.0.0/sandbox_energiakartta%3Aenergymap_${d.level}_areas@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf`,
      ],
    })
    for (const layer of createAreaLayerConf(d).style!.layers!)
      expect(JSON.stringify(layer.filter)).not.toContain('release')
  }
  expect(areaSourceDescriptorSignature(createAreaSourceDescriptors())).toBe(
    areaSourceDescriptorSignature(sources)
  )
})
test('public GeoServer override changes only origin/base, preserving stable IDs and source layers', () => {
  const sources = createAreaSourceDescriptors({
    geoServerUrl: 'https://tiles.example.test/geoserver/',
  })
  expect(
    sources.every((d) =>
      d.source.tiles![0].startsWith('https://tiles.example.test/geoserver/gwc/')
    )
  ).toBe(true)
  expect(sources.map((d) => d.sourceId)).toEqual(
    createAreaSourceDescriptors().map((d) => d.sourceId)
  )
})
