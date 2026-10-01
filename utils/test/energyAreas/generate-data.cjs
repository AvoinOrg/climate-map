// Offline synthetic fixture authoring. Never imports or executes backend code.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const directory = __dirname
const levels = ['postal_code', 'municipality', 'region']
const categories = [
  'official_class',
  'modeled_class',
  'modeled_reason',
  'heating_method',
  'heating_energy_source',
  'ventilation',
  'main_purpose',
  'construction_period',
]
const areaFields = [
  'floor_area',
  'gross_floor_area',
  'total_area',
  'energy_certificate_heated_net_area',
]
const releaseIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
]
const emptyMetrics = () => ({
  ...Object.fromEntries(
    categories.map((c) => [
      c,
      { counts: {}, known_building_count: 0, unknown_building_count: 0 },
    ])
  ),
  official_class: {
    counts: {},
    known_building_count: 0,
    unknown_building_count: 0,
    valid_counts_by_scale: {},
    eligible_building_count: 0,
  },
  ...Object.fromEntries(
    areaFields.map((c) => [
      c,
      {
        sum: null,
        unit: 'm2',
        known_building_count: 0,
        unknown_building_count: 0,
      },
    ])
  ),
})
const facts = [
  ['00100', '005', '2018:valid:C'],
  ['00100', '091', '2018:expired:B'],
  ['00100', '091', '2013:valid:A'],
  ['00100', null, '2018:valid:C'],
  ['00100', null, 'invalid_class'],
  ['00200', '005', 'unknown_scale:valid:D'],
  ['00200', '091', '2018:unknown_validity:C'],
  [null, '005', 'missing'],
  ['00400', '006', 'unknown_scale:valid:C'],
  ['00400', '006', 'missing'],
  ['00400', '006', 'invalid_class'],
  ['00400', '006', '2018:expired:D'],
].map(([postal, municipality, official_class], index) => ({
  postal,
  municipality,
  official_class,
  modeled_class: index % 2 ? 'unknown' : 'D',
  modeled_reason: index % 2 ? 'unknown' : 'fixture_unrecognized_reason',
  heating_method:
    index === 4 ? 'future_heating_code' : index % 3 ? '01' : 'unknown',
  heating_energy_source: index % 2 ? '02' : 'unknown',
  ventilation: ['gravity', 'mechanical', 'other', 'no_info'][index % 4],
  main_purpose: index === 4 ? 'unrecognized_purpose' : '0110',
  construction_period: [
    'before_1940',
    '1940_1959',
    '1960_1979',
    '1980_1999',
    '2000_2019',
    '2020_onward',
    'unknown',
  ][index % 7],
  floor_area: index === 2 ? null : 100 + index,
  gross_floor_area: index % 3 === 0 ? null : 150 + index,
  total_area: index % 4 === 0 ? null : 180 + index,
  energy_certificate_heated_net_area: index % 2 === 0 ? 90 + index : null,
}))
const summary = (rows) => {
  const metrics = emptyMetrics()
  for (const c of categories) {
    for (const row of rows)
      metrics[c].counts[row[c]] = (metrics[c].counts[row[c]] || 0) + 1
    metrics[c].known_building_count = rows.filter(
      (r) => !['unknown', 'no_info', 'missing', 'invalid_class'].includes(r[c])
    ).length
    metrics[c].unknown_building_count =
      rows.length - metrics[c].known_building_count
  }
  const eligible = rows.filter((r) =>
    /^(2013|2018):valid:[A-G]$/.test(r.official_class)
  )
  for (const row of eligible) {
    const [scale, , cls] = row.official_class.split(':')
    const counts = (metrics.official_class.valid_counts_by_scale[scale] ||= {})
    counts[cls] = (counts[cls] || 0) + 1
  }
  metrics.official_class.eligible_building_count = eligible.length
  for (const c of areaFields) {
    const values = rows.map((r) => r[c]).filter((v) => v !== null)
    metrics[c] = {
      sum: values.length ? values.reduce((a, b) => a + b, 0) : null,
      unit: 'm2',
      known_building_count: values.length,
      unknown_building_count: rows.length - values.length,
    }
  }
  return {
    building_count: rows.length,
    valid_official_class_count: eligible.length,
    certificate_coverage: rows.length ? eligible.length / rows.length : null,
    metrics,
  }
}
const rectangles = {
  postal_code: {
    '00100': [24.9, 60.12, 24.98, 60.2],
    '00200': [24.98, 60.12, 25.08, 60.2],
    '00300': [25.1, 60.12, 25.2, 60.2],
    '00400': [25.2, 60.12, 25.3, 60.2],
  },
  municipality: {
    '005': [24.8, 60.08, 24.94, 60.24],
    '091': [24.94, 60.08, 25.1, 60.24],
    '009': [25.1, 60.08, 25.2, 60.24],
    '006': [25.2, 60.08, 25.3, 60.24],
  },
  region: {
    '01': [24.8, 60.08, 25.1, 60.24],
    '02': [25.1, 60.08, 25.2, 60.24],
    '03': [25.2, 60.08, 25.3, 60.24],
  },
}
const municipalityRegion = {
  '005': '01',
  '091': '01',
  '009': '02',
  '006': '03',
}
const polygon = ([w, s, e, n]) => ({
  type: 'Polygon',
  coordinates: [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ],
})
const names = (level, code) =>
  code === '00200'
    ? { fi: null, sv: 'Syntetiskt postområde' }
    : code === '00300'
      ? {}
      : {
          fi: `Testialue ${code}`,
          sv: `Testområde ${code}`,
          en: `Fixture ${level} ${code}`,
        }
const snapshots = releaseIds.map((release_id, index) => {
  const rows = facts.filter(
    (_, i) => index === 0 || (index === 1 ? i !== 3 : i !== 3 && i !== 11)
  )
  const as_of = ['2026-10-01', '2026-09-01', '2026-08-01'][index]
  const metadata = {
    release_id,
    boundary_vintage: 2026,
    as_of,
    metric_version: 'building-area-summary-v1',
    metric_definitions: {
      population:
        'Distinct nonempty building_key values in the frozen main snapshot',
      certificate_coverage:
        'Valid A-G official classes on the 2013 or 2018 scale / all buildings',
      official_class:
        'counts are scale:validity:class diagnostics; valid_counts_by_scale is the default A-G distribution',
      modeled_class: 'Diagnostic only; source model version unavailable',
      floor_area: 'Separate positive finite known sums for each definition',
      filters: ['postal_code within municipality'],
    },
    validation: {
      building_count: rows.length,
      levels: Object.fromEntries(
        levels.map((level) => [
          level,
          {
            assigned: rows.filter((r) =>
              level === 'postal_code' ? r.postal : r.municipality
            ).length,
            unassigned: rows.filter(
              (r) => !(level === 'postal_code' ? r.postal : r.municipality)
            ).length,
          },
        ])
      ),
    },
    sources: {
      fixture:
        'Synthetic frontend dataset, not official geography or published data',
      building_count: rows.length,
      model_version: null,
    },
    layers: Object.fromEntries(
      levels.map((level) => [
        level,
        {
          url: `/energy-data/areas/${release_id}/${level}/tiles/{z}/{x}/{y}.pbf`,
          source_layer: 'areas',
          minzoom: 0,
          maxzoom: 14,
        },
      ])
    ),
    building_filters_supported: false,
    postal_areas_nested_in_municipalities: false,
  }
  const details = {},
    intersections = {},
    geometry = {}
  for (const level of levels) {
    geometry[level] = { type: 'FeatureCollection', features: [] }
    for (const [code, rectangle] of Object.entries(rectangles[level])) {
      const selected = rows.filter((r) =>
        level === 'postal_code'
          ? r.postal === code
          : level === 'municipality'
            ? r.municipality === code
            : municipalityRegion[r.municipality] === code
      )
      const relatedLevel =
        level === 'municipality' ? 'postal_code' : 'municipality'
      const related = Object.keys(rectangles[relatedLevel])
        .sort()
        .map((relatedCode) => ({
          area_code: relatedCode,
          building_count: selected.filter((r) =>
            level === 'postal_code'
              ? r.municipality === relatedCode
              : level === 'municipality'
                ? r.postal === relatedCode
                : r.municipality === relatedCode
          ).length,
        }))
        .filter((r) =>
          level === 'region'
            ? municipalityRegion[r.area_code] === code
            : r.building_count > 0
        )
      const detail = {
        release_id,
        level,
        area_code: code,
        area_id: `${level}:${code}`,
        names: names(level, code),
        boundary_vintage: 2026,
        as_of,
        metric_version: metadata.metric_version,
        ...summary(selected),
        scope: { geometry: 'full_area' },
        related_areas: related,
        related_area_level: relatedLevel,
        ...(level === 'municipality'
          ? { region_code: municipalityRegion[code] }
          : {}),
      }
      details[detail.area_id] = detail
      if (level === 'postal_code')
        for (const municipalityCode of Object.keys(rectangles.municipality)) {
          intersections[`${code}:${municipalityCode}`] = {
            ...detail,
            ...summary(
              selected.filter((r) => r.municipality === municipalityCode)
            ),
            scope: {
              municipality_code: municipalityCode,
              geometry: 'full_postal_area',
            },
          }
        }
      const {
        building_count,
        valid_official_class_count,
        certificate_coverage,
      } = detail
      const properties = {
        release_id,
        level,
        area_code: code,
        area_id: detail.area_id,
        building_count,
        valid_official_class_count,
        ...(certificate_coverage === null ? {} : { certificate_coverage }),
        ...Object.fromEntries(
          Object.entries(detail.names)
            .filter(([, value]) => value != null)
            .map(([lang, value]) => [`name_${lang}`, value])
        ),
      }
      geometry[level].features.push({
        type: 'Feature',
        id: Number(code),
        properties,
        geometry: polygon(rectangle),
      })
    }
  }
  return { metadata, details, intersections, geometry }
})
const serviceRoot = '/host/home/xbexbex/git/avoin-energy-map-service'
const serviceFiles = [
  'src/api/areas.py',
  'src/area_contract.py',
  'src/etl/build_area_aggregates.py',
  'src/geoserver/publish_area_aggregates.py',
  'tests/test_area_aggregates.py',
]
const provenance = Object.fromEntries(
  serviceFiles.map((file) => [
    file,
    crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(serviceRoot, file)))
      .digest('hex'),
  ])
)
fs.writeFileSync(
  path.join(directory, 'dataset.json'),
  JSON.stringify(
    { releaseIds, snapshots, emptyMetrics: emptyMetrics() },
    null,
    2
  ) + '\n'
)
fs.writeFileSync(
  path.join(directory, 'provenance.json'),
  JSON.stringify(
    {
      serviceRoot,
      sha256: provenance,
      synthetic: true,
      generator: 'generate-data.cjs',
      generatorSha256: crypto
        .createHash('sha256')
        .update(fs.readFileSync(__filename))
        .digest('hex'),
      codecVersions: {
        'geojson-vt': '4.0.2',
        '@maplibre/vt-pbf': '4.1.0',
        '@mapbox/vector-tile': '2.0.4',
        pbf: '4.0.1',
      },
    },
    null,
    2
  ) + '\n'
)
console.log(
  'Authored three immutable synthetic snapshots; no backend executed.'
)
