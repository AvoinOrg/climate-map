import dataset from '../../../../../utils/test/energyAreas/dataset.json'
import { parseAreaDetail } from './contract'
import {
  officialScaleSummary,
  distributionRows,
  AREA_SUMS,
} from './detailPresentation'
const detail = (code: string) =>
  parseAreaDetail(
    dataset.snapshots[0].details[
      `postal_code:${code}` as keyof (typeof dataset.snapshots)[0]['details']
    ],
    {
      request: {
        level: 'postal_code',
        areaCode: code,
      },
    }
  )
it('uses each valid official scale as its distribution denominator and all buildings as coverage denominator', () => {
  const postal = detail('00100')
  expect(postal.valid_official_class_count).toBe(3)
  expect(postal.certificate_coverage).toBe(3 / 5)
  expect(postal.metrics.official_class?.known_building_count).toBe(4)
  const scale2013 = officialScaleSummary({ detail: postal, scale: '2013' })!
  const scale2018 = officialScaleSummary({ detail: postal, scale: '2018' })!
  expect(scale2013.denominator).toBe(1)
  expect(scale2018.denominator).toBe(2)
  expect(scale2013.rows[0]).toEqual({ key: 'A', count: 1, fraction: 1 })
  expect(scale2018.rows[2]).toEqual({ key: 'C', count: 2, fraction: 1 })
  expect(scale2013.rows[2]).toEqual({ key: 'C', count: 0, fraction: 0 })
  expect(scale2018.rows[0]).toEqual({ key: 'A', count: 0, fraction: 0 })
  expect(scale2013.population).toBe(5)
  const polluted = {
    ...postal,
    metrics: {
      ...postal.metrics,
      official_class: {
        ...postal.metrics.official_class!,
        counts: {
          '2013:expired:A': 999,
          'unknown_scale:valid:A': 888,
          invalid_class: 777,
        },
        valid_counts_by_scale: {
          '2013': { A: 1, invalid: 500 },
          '2018': { C: 2 },
          future: { A: 555 },
        },
      },
      modeled_class: {
        counts: { A: 999 },
        known_building_count: 999,
        unknown_building_count: 0,
      },
    },
  }
  expect(officialScaleSummary({ detail: polluted, scale: '2013' })).toEqual(
    scale2013
  )
})
it('distinguishes absent, valid zero, sparse and empty summaries without invented percentages', () => {
  expect(
    officialScaleSummary({
      detail: { ...detail('00100'), metrics: {} },
      scale: '2013',
    })
  ).toBeUndefined()
  for (const code of ['00300', '00400']) {
    const postal = detail(code)
    const summary = officialScaleSummary({ detail: postal, scale: '2013' })!
    expect(summary.denominator).toBe(0)
    expect(
      summary.rows.every((row) => row.count === 0 && row.fraction === null)
    ).toBe(true)
    expect(postal.certificate_coverage).toBe(code === '00300' ? null : 0)
  }
})
it('retains arbitrary categories/counts, maps exact codes and never coerces purpose 0110 to 01', () => {
  expect(
    distributionRows({
      metric: 'main_purpose',
      summary: {
        counts: { '01': 0, '0110': 2, mystery: 3, unknown: 1 },
        known_building_count: 5,
        unknown_building_count: 1,
      },
    })
  ).toEqual([
    { count: 0, keyName: 'sidebar.building_info.codes.main_purpose.01' },
    { count: 2, keyName: 'sidebar.area_map.unrecognized_category', index: 1 },
    { count: 3, keyName: 'sidebar.area_map.unrecognized_category', index: 2 },
    { count: 1, keyName: 'sidebar.area_map.unknown_information' },
  ])
  expect(
    distributionRows({
      metric: 'ventilation',
      summary: {
        counts: { no_info: 1 },
        known_building_count: 0,
        unknown_building_count: 1,
      },
    })[0].keyName
  ).toBe('sidebar.area_map.unknown_information')
  expect(
    distributionRows({
      metric: 'main_purpose',
      summary: {
        counts: { no_info: 1 },
        known_building_count: 0,
        unknown_building_count: 1,
      },
    })[0]
  ).toEqual({
    count: 1,
    keyName: 'sidebar.area_map.unrecognized_category',
    index: 1,
  })
})
it('preserves the four distinct sums and unequal known/unknown denominators supplied by v1', () => {
  const postal = detail('00100')
  expect(AREA_SUMS.map((key) => postal.metrics[key])).toEqual([
    {
      sum: 408,
      unit: 'm2',
      known_building_count: 4,
      unknown_building_count: 1,
    },
    {
      sum: 457,
      unit: 'm2',
      known_building_count: 3,
      unknown_building_count: 2,
    },
    {
      sum: 546,
      unit: 'm2',
      known_building_count: 3,
      unknown_building_count: 2,
    },
    {
      sum: 276,
      unit: 'm2',
      known_building_count: 3,
      unknown_building_count: 2,
    },
  ])
  expect(
    AREA_SUMS.every((key) => detail('00300').metrics[key]?.sum === null)
  ).toBe(true)
})
