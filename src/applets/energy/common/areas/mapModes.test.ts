import { createPropertyExpression } from '@maplibre/maplibre-gl-style-spec'
import {
  resolveAreaGeography,
  AREA_METRIC_BANDS,
  areaMetricColorExpression,
  AREA_UNAVAILABLE_COLOR,
} from './mapModes'

const expected = [
  [0, 'region'],
  [6.999, 'region'],
  [7, 'municipality'],
  [7.001, 'municipality'],
  [9.999, 'municipality'],
  [10, 'postal_code'],
  [10.001, 'postal_code'],
  [11.999, 'postal_code'],
  [12, 'buildings'],
  [12.001, 'buildings'],
  [17.5, 'buildings'],
] as const
it.each([...expected, ...[...expected].reverse()])(
  'automatic zoom %s resolves to %s',
  (zoom, geography) => {
    expect(
      resolveAreaGeography({ zoom })
    ).toBe(geography)
  }
)
it('ignores legacy override and API availability properties', () => {
  for (const [zoom, geography] of expected) {
    for (const mode of ['region', 'municipality', 'postal_code', 'buildings']) {
      const legacy = { zoom, mode, available: false }
      expect(resolveAreaGeography(legacy)).toBe(geography)
    }
  }
})
it.each(['building_count', 'certificate_coverage'] as const)(
  '%s evaluates exact stable bands with real MapLibre expressions',
  (metric) => {
    const result = createPropertyExpression(areaMetricColorExpression(metric), {
      type: 'color',
      'property-type': 'data-driven',
      expression: { interpolated: false, parameters: ['feature'] },
    })
    expect(result.result).toBe('success')
    if (result.result !== 'success') throw new Error('Invalid expression')
    const evaluate = (properties: Record<string, unknown>) =>
      result.value
        .evaluate({ zoom: 11 }, { type: 3, properties } as never)
        .toString()
    const color = (hex: string) => {
      const rgb = hex
        .slice(1)
        .match(/../g)!
        .map((value) => parseInt(value, 16))
      return `rgba(${rgb.join(',')},1)`
    }
    for (const band of AREA_METRIC_BANDS[metric]) {
      expect(evaluate({ [metric]: band.min })).toBe(color(band.color))
      if (band.max != null)
        expect(
          evaluate({
            [metric]: band.max - (metric === 'building_count' ? 1 : 0.0001),
          })
        ).toBe(color(band.color))
    }
    for (const properties of [{}, { [metric]: null }, { [metric]: '0' }])
      expect(evaluate(properties)).toBe(color(AREA_UNAVAILABLE_COLOR))
    expect(evaluate({ [metric]: 0 })).not.toBe(color(AREA_UNAVAILABLE_COLOR))
  }
)
