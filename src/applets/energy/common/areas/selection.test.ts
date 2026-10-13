import { useAppletStore } from 'applets/energy/state/appletStore'
beforeEach(() =>
  useAppletStore.setState({ activeThematicMode: 'energyCertificates' })
)
import type { MapGeoJSONFeature } from 'maplibre-gl'
import { createAreaSourceDescriptors } from 'applets/energy/layers/areaSource'
import { projectAreaSelection, createAreaSelection } from './selection'

const descriptors = createAreaSourceDescriptors()
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
    ).toEqual({ level, areaCode: code })
  }
)
it('rejects numerical IDs, malformed properties, wrong release/source/layer and inactive geography', () => {
  const hit = feature('postal_code', '00100')
  for (const changed of [
    { id: 100 },
    { source: 'building' },
    { sourceLayer: 'other' },
    { properties: { ...hit.properties, area_code: 100 } },
    { properties: { ...hit.properties, area_id: 'postal_code:00200' } },
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
it('accepts only validated internal scoped placeholders in the active descriptor and rejects fabricated identities', () => {
  const descriptor = descriptors.find((item) => item.level === 'postal_code')!
  const request = {
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
      descriptors: [{ ...descriptor, sourceId: 'other' }],
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
      request: { level: 'municipality', areaCode: '091' },
    })
  ).toThrow()
})
