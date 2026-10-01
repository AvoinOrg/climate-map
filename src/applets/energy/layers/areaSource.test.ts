/** @jest-environment node */
import dataset from '../../../../utils/test/energyAreas/dataset.json'
import { resolveEnergyAreaApiConfig } from 'applets/energy/common/areas/config'
import { parseAreaMetadata } from 'applets/energy/common/areas/contract'
import {
  areaSourceDescriptorSignature,
  createAreaSourceDescriptors,
} from 'applets/energy/layers/areaSource'
import {
  createEnergyAreaFixture,
  API_ORIGIN,
} from '../../../../utils/test/energyAreas/responder.cjs'

const config = resolveEnergyAreaApiConfig({ origin: API_ORIGIN })
test('all metadata-derived native sources pin one release, promote area_id, and default XYZ', () => {
  const metadata = parseAreaMetadata(dataset.snapshots[0].metadata)
  const sources = createAreaSourceDescriptors({ config, metadata })
  expect(sources).toHaveLength(3)
  for (const descriptor of sources) {
    const advertised = metadata.layers[descriptor.level]
    expect(descriptor.source).toEqual({
      type: 'vector',
      scheme: 'xyz',
      promoteId: 'area_id',
      tiles: [`${API_ORIGIN}${advertised.url}`],
      minzoom: 0,
      maxzoom: 14,
    })
    expect(descriptor.sourceLayer).toBe('areas')
    expect(descriptor.sourceId).toContain(
      `${metadata.release_id}_${descriptor.level}`
    )
  }
  const old = createAreaSourceDescriptors({
    config,
    metadata: parseAreaMetadata(dataset.snapshots[1].metadata),
  })
  expect(areaSourceDescriptorSignature(sources)).not.toBe(
    areaSourceDescriptorSignature(old)
  )
})
test('absolute TMS advertises different layers/zooms unchanged and same-release descriptor changes are detectable', async () => {
  const fixture = createEnergyAreaFixture({ delivery: 'tms' })
  const metadata = parseAreaMetadata(
    await (
      await fixture.fetch(`${API_ORIGIN}/energy-data/areas/metadata`)
    ).json()
  )
  const sources = createAreaSourceDescriptors({ config, metadata })
  sources.forEach((d, i) => {
    expect(d.source.tiles).toEqual([metadata.layers[d.level].url])
    expect(d.sourceLayer).toBe(`fixture_${d.level}`)
    expect(d.source.scheme).toBe('tms')
    expect(d.source.minzoom).toBe(i)
    expect(d.source.maxzoom).toBe(14 - i)
  })
  const changed = structuredClone(metadata)
  changed.layers.region.source_layer = 'new_name'
  expect(areaSourceDescriptorSignature(sources)).not.toBe(
    areaSourceDescriptorSignature(
      createAreaSourceDescriptors({ config, metadata: changed })
    )
  )
})
test('MapLibre legal source zooms include 25 and equal bounds; illegal ranges/descriptors fail', () => {
  const metadata = dataset.snapshots[0].metadata
  for (const pair of [
    [0, 25],
    [14, 14],
    [25, 25],
  ]) {
    const parsed = parseAreaMetadata({
      ...metadata,
      layers: {
        ...metadata.layers,
        region: {
          ...metadata.layers.region,
          minzoom: pair[0],
          maxzoom: pair[1],
        },
      },
    })
    expect(
      createAreaSourceDescriptors({ config, metadata: parsed })[2].source
        .maxzoom
    ).toBe(pair[1])
  }
  for (const change of [
    { minzoom: -1 },
    { maxzoom: 26 },
    { maxzoom: 14.5 },
    { minzoom: 15, maxzoom: 14 },
    { minzoom: NaN },
    { source_layer: '' },
    { scheme: 'bad' },
    { url: 'no-template' },
  ])
    expect(() =>
      parseAreaMetadata({
        ...metadata,
        layers: {
          ...metadata.layers,
          region: { ...metadata.layers.region, ...change },
        },
      })
    ).toThrow()
})
