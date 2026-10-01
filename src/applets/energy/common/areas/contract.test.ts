/** @jest-environment node */
import dataset from '../../../../../utils/test/energyAreas/dataset.json'
import {
  AREA_LEVELS,
  parseAreaDetail,
  parseAreaDetailRequest,
  parseAreaMetadata,
  parseAreaReleaseId,
  parseAreaTileProperties,
} from 'applets/energy/common/areas/contract'
import { AreaApiError } from 'applets/energy/common/areas/errors'
import type { AreaDetailRequest } from 'applets/energy/common/types/areas'

const releaseId = dataset.releaseIds[0]
const request: AreaDetailRequest = {
  releaseId,
  level: 'postal_code',
  areaCode: '00100',
}
const full = dataset.snapshots[0].details['postal_code:00100']
const kind = (fn: () => unknown, expected = 'malformed-contract') => {
  try {
    fn()
    throw new Error('Expected contract rejection')
  } catch (e) {
    expect(e).toBeInstanceOf(AreaApiError)
    expect((e as AreaApiError).problem.kind).toBe(expected)
  }
}

test('all service fixture metadata/details/metrics retain release context and identity', () => {
  for (const snapshot of dataset.snapshots) {
    const metadata = parseAreaMetadata(snapshot.metadata, {
      requestedReleaseId: snapshot.metadata.release_id.toUpperCase(),
    })
    expect(metadata.sources).toEqual(snapshot.metadata.sources)
    expect(metadata.validation).toEqual(snapshot.metadata.validation)
    for (const detail of Object.values(snapshot.details)) {
      const parsed = parseAreaDetail(detail, {
        request: {
          releaseId: metadata.release_id,
          level: detail.level as AreaDetailRequest['level'],
          areaCode: detail.area_code,
        },
      })
      expect(parsed).toEqual(detail)
      expect(parsed.as_of).toBe(metadata.as_of)
      expect(parsed.boundary_vintage).toBe(metadata.boundary_vintage)
    }
  }
})
test('empty/sparse scales and optional names, metrics, arbitrary categories remain unchanged', () => {
  const municipality = dataset.snapshots[0].details['municipality:091']
  const parsed = parseAreaDetail(municipality, {
    request: { releaseId, level: 'municipality', areaCode: '091' },
  })
  expect(parsed.metrics.official_class?.valid_counts_by_scale).toEqual({
    '2013': { A: 1 },
  })
  expect(parsed.metrics.official_class?.known_building_count).toBe(3)
  expect(parsed.metrics.official_class?.eligible_building_count).toBe(1)
  expect(
    parseAreaDetail(full, { request }).metrics.heating_method?.counts
      .future_heating_code
  ).toBe(1)
  expect(
    parseAreaDetail({ ...full, metrics: {} }, { request }).metrics
  ).toEqual({})
  const empty = dataset.snapshots[0].details['postal_code:00300']
  expect(
    parseAreaDetail(empty, { request: { ...request, areaCode: '00300' } })
      .metrics
  ).toEqual(dataset.emptyMetrics)
  expect(
    parseAreaDetail(empty, { request: { ...request, areaCode: '00300' } }).names
  ).toEqual({})
  const sums = [
    'floor_area',
    'gross_floor_area',
    'total_area',
    'energy_certificate_heated_net_area',
  ] as const
  expect(
    new Set(sums.map((k) => parseAreaDetail(full, { request }).metrics[k]?.sum))
      .size
  ).toBe(4)
  expect(
    new Set(
      sums.map(
        (k) =>
          parseAreaDetail(full, { request }).metrics[k]?.known_building_count
      )
    ).size
  ).toBeGreaterThan(1)
  const extra = {
    ...full,
    metrics: { ...full.metrics, future_metric: { data: 'preserve' } },
    sources_extra: { diagnostic: 7 },
  }
  expect(parseAreaDetail(extra, { request })).toEqual(extra)
})
test('scope changes detail statistics while full relations remain, and known zero scope succeeds', () => {
  const snapshot = dataset.snapshots[0]
  const scoped = parseAreaDetail(snapshot.intersections['00100:091'], {
    request: { ...request, municipalityCode: '091' },
  })
  expect(scoped.building_count).toBe(2)
  expect(scoped.scope).toEqual({
    geometry: 'full_postal_area',
    municipality_code: '091',
  })
  expect(scoped.related_areas).toEqual(full.related_areas)
  const zero = parseAreaDetail(snapshot.intersections['00100:009'], {
    request: { ...request, municipalityCode: '009' },
  })
  expect(zero.metrics).toEqual(dataset.emptyMetrics)
  expect(zero.certificate_coverage).toBeNull()
})
test.each(['100', 100, '００１００', '0010', '001000', '00100 ', '-0100'])(
  'rejects malformed code %p without coercion',
  (code) => {
    kind(() => parseAreaDetail({ ...full, area_code: code }, { request }))
    kind(
      () =>
        parseAreaDetailRequest({
          ...request,
          areaCode: code,
        } as AreaDetailRequest),
      'rejected-request'
    )
  }
)
test('invalid release/level/ID, wrong context/scope/relations are rejected', () => {
  for (const change of [
    { release_id: 'bad' },
    { release_id: dataset.releaseIds[1] },
    { level: 'city' },
    { area_id: 'postal_code:100' },
    { area_code: '00200', area_id: 'postal_code:00200' },
    { related_area_level: 'region' },
    { related_areas: [{ area_code: '91', building_count: 1 }] },
    { scope: { geometry: 'full_postal_area', municipality_code: '091' } },
  ]) {
    kind(() => parseAreaDetail({ ...full, ...change }, { request }))
  }
  kind(() =>
    parseAreaDetail(
      { ...full, scope: { geometry: 'full_area' } },
      { request: { ...request, municipalityCode: '091' } }
    )
  )
  kind(() =>
    parseAreaDetail(
      {
        ...full,
        scope: { geometry: 'full_postal_area', municipality_code: '005' },
      },
      { request: { ...request, municipalityCode: '091' } }
    )
  )
  kind(
    () =>
      parseAreaDetailRequest({
        ...request,
        level: 'municipality',
        areaCode: '091',
        municipalityCode: '005',
      }),
    'rejected-request'
  )
  kind(() =>
    parseAreaMetadata(dataset.snapshots[0].metadata, {
      requestedReleaseId: dataset.releaseIds[1],
    })
  )
  expect(parseAreaReleaseId(releaseId.toUpperCase())).toBe(releaseId)
})
test('required shape/version and numeric domains are enforced independently of fixture builder', () => {
  for (const payload of [
    null,
    [],
    {},
    { ...full, metric_version: undefined },
    { ...full, building_count: -1 },
    { ...full, valid_official_class_count: 1.2 },
    { ...full, building_count: Number.MAX_SAFE_INTEGER + 1 },
    { ...full, certificate_coverage: NaN },
    { ...full, certificate_coverage: 1.01 },
    { ...full, as_of: '2026-02-30' },
    { ...full, metrics: null },
    { ...full, metrics: { official_class: { counts: {} } } },
    {
      ...full,
      metrics: {
        floor_area: {
          sum: 0,
          unit: 'm2',
          known_building_count: 0,
          unknown_building_count: 5,
        },
      },
    },
  ])
    kind(() => parseAreaDetail(payload, { request }))
  kind(
    () =>
      parseAreaDetail(
        { ...full, metric_version: 'building-area-summary-v2' },
        { request }
      ),
    'unsupported-contract'
  )
  kind(
    () =>
      parseAreaMetadata({
        ...dataset.snapshots[0].metadata,
        metric_version: 'building-area-summary-v2',
      }),
    'unsupported-contract'
  )
  const metadata = dataset.snapshots[0].metadata
  for (const change of [
    { building_filters_supported: true },
    { postal_areas_nested_in_municipalities: true },
    { layers: {} },
    { sources: null },
    { validation: [] },
    { metric_definitions: 'bad' },
  ])
    kind(() => parseAreaMetadata({ ...metadata, ...change }))
})
test('tile properties preserve strings, absent/null/zero coverage and repeated identities', () => {
  for (const level of AREA_LEVELS) {
    const feature = dataset.snapshots[0].geometry[level].features[0]
    const parsed = parseAreaTileProperties(feature.properties, {
      releaseId,
      level,
    })
    expect(parsed.area_id).toBe(`${level}:${parsed.area_code}`)
    expect(feature.id).not.toBe(parsed.area_code)
    expect(
      parseAreaTileProperties(
        { ...feature.properties, certificate_coverage: null },
        { releaseId, level }
      ).certificate_coverage
    ).toBeNull()
    const { certificate_coverage: _coverage, ...without } = feature.properties
    expect(
      parseAreaTileProperties(without, { releaseId, level })
        .certificate_coverage
    ).toBeUndefined()
    expect(
      parseAreaTileProperties(
        { ...without, certificate_coverage: 0 },
        { releaseId, level }
      ).certificate_coverage
    ).toBe(0)
    kind(() =>
      parseAreaTileProperties(
        { ...without, release_id: dataset.releaseIds[1] },
        { releaseId, level }
      )
    )
    kind(() =>
      parseAreaTileProperties(
        { ...without, area_code: feature.id },
        { releaseId, level }
      )
    )
  }
})
