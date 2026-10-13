import { resolveAreaGeography } from './mapModes'

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
    expect(resolveAreaGeography({ zoom })).toBe(geography)
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
