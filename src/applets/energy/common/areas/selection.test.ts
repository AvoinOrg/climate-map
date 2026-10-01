import type { MapGeoJSONFeature } from 'maplibre-gl'
import dataset from '../../../../../utils/test/energyAreas/dataset.json'
import { parseAreaMetadata } from './contract'
import { resolveEnergyAreaApiConfig } from './config'
import { createAreaSourceDescriptors } from 'applets/energy/layers/areaSource'
import {
  projectAreaSelection,
  detailMatchesMetadata,
  createAreaSelection,
} from './selection'

const metadata = parseAreaMetadata(dataset.snapshots[0].metadata)
const descriptors = createAreaSourceDescriptors({
  metadata,
  config: resolveEnergyAreaApiConfig({
    origin: 'https://energy-areas.fixture.test',
  }),
})
const feature = (
  level: 'region' | 'municipality' | 'postal_code',
  code: string
) => {
  const descriptor = descriptors.find((item) => item.level === level)!
  return {
    id: `${level}:${code}`,
    source: descriptor.sourceId,
    sourceLayer: descriptor.sourceLayer,
    properties: {
      release_id: metadata.release_id,
      level,
      area_code: code,
      area_id: `${level}:${code}`,
      building_count: 0,
      valid_official_class_count: 0,
    },
    layer: { id: `${descriptor.sourceId}-fill` },
  } as MapGeoJSONFeature
}
it.each([
  ['region', '01'],
  ['municipality', '091'],
  ['postal_code', '00100'],
] as const)(
  'promotes %s string identity across duplicate layers/fragments',
  (level, code) => {
    const hit = feature(level, code)
    expect(
      projectAreaSelection({
        features: [
          hit,
          { ...hit, layer: { ...hit.layer, id: 'outline' } },
          hit,
        ],
        descriptors,
        effective: level,
      })
    ).toEqual({ releaseId: metadata.release_id, level, areaCode: code })
  }
)
it('rejects numerical IDs, malformed properties, wrong release/source/layer and inactive geography', () => {
  const hit = feature('postal_code', '00100')
  for (const changed of [
    { id: 100 },
    { source: 'building' },
    { sourceLayer: 'other' },
    { properties: { ...hit.properties, area_code: 100 } },
    { properties: { ...hit.properties, release_id: dataset.releaseIds[1] } },
  ]) {
    expect(
      projectAreaSelection({
        features: [{ ...hit, ...changed } as MapGeoJSONFeature],
        descriptors,
        effective: 'postal_code',
      })
    ).toBeUndefined()
  }
  expect(
    projectAreaSelection({
      features: [hit],
      descriptors,
      effective: 'buildings',
    })
  ).toBeUndefined()
  expect(
    projectAreaSelection({
      features: [hit, feature('postal_code', '00200')],
      descriptors,
      effective: 'postal_code',
    })
  ).toBeUndefined()
})
it('prevents contradictory pinned provenance', () => {
  const detail = {
    release_id: metadata.release_id,
    boundary_vintage: metadata.boundary_vintage,
    as_of: metadata.as_of,
  }
  expect(detailMatchesMetadata({ metadata, detail })).toBe(true)
  for (const changed of [
    { release_id: dataset.releaseIds[1] },
    { boundary_vintage: 2025 },
    { as_of: '2025-01-01' },
  ])
    expect(
      detailMatchesMetadata({ metadata, detail: { ...detail, ...changed } })
    ).toBe(false)
})

it('accepts only validated internal scoped placeholders in the active descriptor and rejects fabricated identities', () => {
  const descriptor = descriptors.find((item) => item.level === 'postal_code')!
  const request = {
    releaseId: metadata.release_id,
    level: 'postal_code' as const,
    areaCode: '00100',
    municipalityCode: '009',
  }
  const placeholder = createAreaSelection({ descriptor, request })
  expect(placeholder.properties).toBeUndefined()
  expect(
    projectAreaSelection({
      features: [placeholder],
      descriptors,
      effective: 'postal_code',
    })
  ).toEqual(request)
  expect(
    projectAreaSelection({
      features: [{ ...placeholder }],
      descriptors,
      effective: 'postal_code',
    })
  ).toBeUndefined()
  expect(
    projectAreaSelection({
      features: [placeholder],
      descriptors,
      effective: 'municipality',
    })
  ).toBeUndefined()
  expect(
    projectAreaSelection({
      features: [placeholder],
      descriptors: [{ ...descriptor, releaseId: dataset.releaseIds[1] }],
      effective: 'postal_code',
    })
  ).toBeUndefined()
  expect(() =>
    createAreaSelection({
      descriptor,
      request: { ...request, areaCode: '100' },
    })
  ).toThrow()
  expect(() =>
    createAreaSelection({
      descriptor,
      request: { ...request, releaseId: dataset.releaseIds[1] },
    })
  ).toThrow()
})
