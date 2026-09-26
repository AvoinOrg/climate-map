import {
  formatYearFromDate,
  getEnergyReferenceCoverageExclusions,
  getOpaqueIdentifier,
  isUsableEnergyIntensity,
} from './buildingInfoEvidence'
import { resolveEffectiveWaterOutcome } from './buildingInfoMissingData'

it.each(['2024-02-29', '2024', 2024, '2024-02-29T14:15:16.123456'])(
  'accepts supported completion input %s',
  (value) => expect(formatYearFromDate(value)).toBe('2024')
)
it.each([
  '2023-02-29',
  '2024-02-30',
  '2024-13-01',
  '2024garbage',
  '0000',
  '0000-01-01',
  '2024-01-01T25:00:00',
  {},
  NaN,
])('rejects invalid completion input %s', (value) =>
  expect(formatYearFromDate(value)).toBeNull()
)
it('preserves opaque identifiers and rejects invalid types without a checksum invention', () => {
  expect(getOpaqueIdentifier('000001A')).toBe('000001A')
  expect(getOpaqueIdentifier(' 000001A ')).toBe(' 000001A ')
  expect(getOpaqueIdentifier(10001)).toBeNull()
  expect(getOpaqueIdentifier(' ')).toBeNull()
})
it('rejects unrepresentable intensities while retaining zero', () => {
  expect(isUsableEnergyIntensity(Number.MAX_VALUE, Number.MIN_VALUE)).toBe(
    false
  )
  expect(isUsableEnergyIntensity(Number.MIN_VALUE, Number.MAX_VALUE)).toBe(
    false
  )
  expect(isUsableEnergyIntensity(0, 1)).toBe(true)
})
it('projects the same Water result and reason for default and override without a usable default', () => {
  expect(
    resolveEffectiveWaterOutcome({ origin: 'default', floorArea: 0 })
  ).toMatchObject({
    calculationResult: { status: 'unsupported' },
    missingReason: {
      code: 'water-default',
      dependencies: [{ field: 'floorArea', kind: 'invalid-supplied-input' }],
    },
  })
  expect(
    resolveEffectiveWaterOutcome({ origin: 'override', rawValue: '3' })
  ).toEqual({
    calculationResult: {
      status: 'complete',
      cubicMetersPerYear: 131.4,
      unit: 'm³/year',
    },
    missingReason: null,
  })
  expect(
    resolveEffectiveWaterOutcome({ origin: 'default', floorArea: 104 })
  ).toMatchObject({
    calculationResult: { status: 'complete', cubicMetersPerYear: 131.4 },
    missingReason: null,
  })
})
it.each([
  ['', 'water-empty'],
  [' ', 'water-empty'],
  [null, 'water-empty'],
  ['not a number', 'water-invalid'],
  ['2.5', 'water-invalid'],
  [Infinity, 'water-invalid'],
  [NaN, 'water-invalid'],
  [0, 'water-range'],
  [-1, 'water-range'],
  [10001, 'water-range'],
] as const)(
  'does not retain a successful Water result during invalid override %s',
  (rawValue, code) => {
    const result = resolveEffectiveWaterOutcome({
      origin: 'override',
      rawValue,
    })
    expect(result.calculationResult.status).toBe('unsupported')
    expect(result.missingReason).toMatchObject({
      source: 'userResidentCount',
      code,
      evidence: 'user-input',
    })
  }
)

it.each([
  ['05', 'awhp', ['aahp']],
  ['05', 'gshp', ['aahp']],
  ['05', 'delec', []],
  ['05', 'distr', []],
  ['05', 'elecb', []],
  ['05', 'oil', []],
  ['05', 'wood', []],
  ['06', 'awhp', ['aahp']],
  ['06', 'gshp', ['aahp']],
  ['06', 'delec', ['aahp']],
  ['06', 'distr', ['aahp']],
  ['06', 'oil', ['aahp']],
  ['06', 'wood', ['default', 'aahp', 'solar', 'windows']],
  ['06', 'elecb', ['default', 'aahp', 'solar', 'windows']],
] as const)(
  'shares canonical reference coverage for purpose %s and prefix %s',
  (purpose, prefix, excluded) => {
    const measures = ['default', 'aahp', 'solar', 'windows'] as const
    expect(
      measures.filter(
        (measure) =>
          getEnergyReferenceCoverageExclusions({
            purpose,
            prefix,
            measure,
          }).length > 0
      )
    ).toEqual(excluded)
  }
)

it.each([1, 10000])('accepts the approved Water boundary %s', (count) => {
  for (const input of [
    { origin: 'override', rawValue: count },
    { origin: 'default', residentCount: count, floorArea: 0 },
  ] as const) {
    expect(resolveEffectiveWaterOutcome(input)).toMatchObject({
      calculationResult: { status: 'complete' },
      missingReason: null,
    })
  }
})
