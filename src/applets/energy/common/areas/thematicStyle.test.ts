import {
  createPropertyExpression,
  featureFilter,
} from '@maplibre/maplibre-gl-style-spec'
import { useAppletStore } from 'applets/energy/state/appletStore'
import {
  ENERGY_CERTIFICATE_CLASS_COLORS,
  ENERGY_CERTIFICATE_INACTIVE_COLOR,
} from 'applets/energy/layers/energyCertificateLayerConf'
import { HEATING_ENERGY_SOURCE_COLORS } from 'applets/energy/layers/heatingLayerConf'
import { VENTILATION_CATEGORY_COLORS } from 'applets/energy/layers/ventilationLayerConf'
import {
  areaThemeStyle,
  CLASS_FIELDS,
  HEATING_FIELDS,
  VENTILATION_FIELDS,
  isAreaThemeEligible,
  type EnergyThemeSelection,
} from './thematicStyle'
import dataset from '../../../../../utils/test/energyAreas/dataset.json'

const selection = (
  overrides: Partial<EnergyThemeSelection> = {}
): EnergyThemeSelection => ({
  ...useAppletStore.getInitialState(),
  activeThematicMode: 'energyCertificates',
  ...overrides,
})
const properties = (classes: Record<string, number> = {}, unknown = 0) => {
  const known = Object.values(classes).reduce((a, b) => a + b, 0)
  return {
    ...Object.fromEntries(
      Object.entries(CLASS_FIELDS).map(([code, field]) => [
        field,
        classes[code] ?? 0,
      ])
    ),
    ...Object.fromEntries(
      Object.values(HEATING_FIELDS).map((field) => [field, 0])
    ),
    ...Object.fromEntries(
      Object.values(VENTILATION_FIELDS).map((field) => [field, 0])
    ),
    building_count: known + unknown,
    energy_class_unknown_count: unknown,
    energy_class_official_count: known,
    energy_class_modeled_count: 0,
    heating_other_count: known + unknown,
    ventilation_no_info_count: known + unknown,
    thematic_contract_version: 1,
  }
}
const compile = (expression: unknown, type: 'color' | 'boolean') => {
  const result = createPropertyExpression(expression, {
    type,
    'property-type': 'data-driven',
    expression: { interpolated: false, parameters: ['feature'] },
  } as never)
  expect(result.result).toBe('success')
  if (result.result !== 'success') throw new Error(JSON.stringify(result.value))
  return (props: Record<string, unknown>) =>
    result.value.evaluate({ zoom: 8 }, { type: 3, properties: props } as never)
}
const channels = (value: { r: number; g: number; b: number }) =>
  [value.r, value.g, value.b].map((v) => v * 255)
const hex = (value: string) =>
  value
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16))
const expectColor = (actual: unknown, expected: number[] | string) => {
  channels(actual as never).forEach((v, i) =>
    expect(v).toBeCloseTo(
      typeof expected === 'string' ? hex(expected)[i] : expected[i],
      8
    )
  )
}
it.each(['heating', 'ventilation'] as const)(
  'keeps an identity-only navigation selection safe when switching to %s',
  (activeThematicMode) => {
    expect(
      isAreaThemeEligible(undefined, selection({ activeThematicMode }))
    ).toBe(true)
  }
)
it.each(['A', 'G'])('pure %s yields the canonical palette exactly', (code) => {
  expectColor(
    compile(
      areaThemeStyle(selection()).color,
      'color'
    )(properties({ [code]: 4 })),
    ENERGY_CERTIFICATE_CLASS_COLORS[code as 'A' | 'G']
  )
})
it('weights by building counts, uses effective classes once, and never uses coverage or unknown as the denominator', () => {
  const evaluate = compile(areaThemeStyle(selection()).color, 'color')
  expectColor(evaluate(properties({ A: 1, G: 1 })), [115, 75, 48])
  const props = {
    ...properties({ A: 3, G: 1 }, 100),
    energy_class_official_count: 1,
    energy_class_modeled_count: 3,
    valid_official_class_count: 0,
    certificate_coverage: 0,
  }
  expectColor(evaluate(props), [73, 112.5, 61])
  expectColor(
    evaluate({
      ...props,
      valid_official_class_count: 104,
      certificate_coverage: 1,
    }),
    [73, 112.5, 61]
  )
})
it('neutralizes inactive recognized classes instead of excluding their geometry/votes; re-enabling restores color', () => {
  const props = properties({ A: 3, G: 1 })
  expectColor(
    compile(
      areaThemeStyle(selection({ activeEnergyCertificateClasses: ['A'] }))
        .color,
      'color'
    )(props),
    [71, 160.25, 103.25]
  )
  const allOff = areaThemeStyle(
    selection({ activeEnergyCertificateClasses: [] })
  )
  expect(allOff.visible).toBe(true)
  expect(compile(allOff.eligibility, 'boolean')(props)).toBe(true)
  expectColor(
    compile(allOff.color, 'color')(props),
    ENERGY_CERTIFICATE_INACTIVE_COLOR
  )
  expectColor(
    compile(areaThemeStyle(selection()).color, 'color')(props),
    [73, 112.5, 61]
  )
})
it('zero/unknown-only and every invalid contract stay neutral with no partial plausible blend', () => {
  const evaluate = compile(areaThemeStyle(selection()).color, 'color')
  const good = properties({ A: 2, G: 1 })
  const missing = { ...good } as Record<string, unknown>
  delete missing.energy_class_g_count
  for (const bad of [
    properties(),
    properties({}, 5),
    missing,
    ...[null, '0', -1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, NaN].map(
      (v) => ({ ...good, energy_class_g_count: v })
    ),
    { ...good, thematic_contract_version: 2 },
    { ...good, thematic_contract_version: undefined },
    { ...good, building_count: 99 },
    { ...good, heating_other_count: 99 },
    { ...good, ventilation_no_info_count: 99 },
    { ...good, energy_class_modeled_count: 99 },
  ])
    expectColor(evaluate(bad), ENERGY_CERTIFICATE_INACTIVE_COLOR)
})
it.each(['heating', 'ventilation'] as const)(
  '%s excludes inactive categories, handles canonical ties, zero, unknown and re-enable',
  (mode) => {
    const mapping = mode === 'heating' ? HEATING_FIELDS : VENTILATION_FIELDS
    const palette =
      mode === 'heating'
        ? HEATING_ENERGY_SOURCE_COLORS
        : VENTILATION_CATEGORY_COLORS
    const keys = Object.keys(mapping)
    const fields = Object.values(mapping)
    const props = {
      ...properties({ A: 8 }),
      ...Object.fromEntries(fields.map((field, i) => [field, i < 2 ? 4 : 0])),
    }
    const evaluate = (choices: Record<string, boolean>) => {
      const state = selection({
        activeThematicMode: mode,
        [mode === 'heating' ? 'heatingSwitchState' : 'ventilationSwitchState']:
          choices,
      })
      const style = areaThemeStyle(state)
      const eligibility = compile(style.eligibility, 'boolean')(props)
      expect(isAreaThemeEligible(props, state)).toBe(eligibility)
      return {
        ...style,
        eligibility,
        color: compile(style.color, 'color')(props),
      }
    }
    const all = Object.fromEntries(
      [...keys].reverse().map((key) => [key, true])
    )
    expectColor(
      evaluate(all).color,
      (palette as Record<string, string>)[keys[0]]
    )
    expectColor(
      evaluate({ ...all, [keys[0]]: false }).color,
      (palette as Record<string, string>)[keys[1]]
    )
    const off = Object.fromEntries(keys.map((key) => [key, false]))
    expect(evaluate(off).visible).toBe(false)
    expect(evaluate(off).eligibility).toBe(false)
    expect(evaluate({ ...off, [keys.at(-1)!]: true }).eligibility).toBe(false)
    expect(evaluate({ ...off, [keys[1]]: true }).eligibility).toBe(true)
    const style = areaThemeStyle(selection({ activeThematicMode: mode }))
    expectColor(
      compile(style.color, 'color')(properties({}, 8)),
      (palette as Record<string, string>)[keys.at(-1)!]
    )
    expectColor(
      compile(style.color, 'color')({ ...props, thematic_contract_version: 0 }),
      ENERGY_CERTIFICATE_INACTIVE_COLOR
    )
    expect(compile(style.eligibility, 'boolean')(properties())).toBe(false)
  }
)
it('no theme hides every area and removes eligibility', () => {
  const state = selection({ activeThematicMode: null })
  const style = areaThemeStyle(state)
  expect(style.visible).toBe(false)
  expect(compile(style.eligibility, 'boolean')(properties({ A: 2 }))).toBe(
    false
  )
  expect(isAreaThemeEligible({}, state)).toBe(false)
})
it('compiles/evaluates all synthetic tile properties against the canonical facts', () => {
  for (const snapshot of dataset.snapshots)
    for (const collection of Object.values(snapshot.geometry))
      for (const feature of collection.features)
        for (const mode of [
          'energyCertificates',
          'heating',
          'ventilation',
        ] as const) {
          const state = selection({ activeThematicMode: mode })
          const style = areaThemeStyle(state)
          const color = channels(
            compile(style.color, 'color')(feature.properties)
          )
          expect(color.every(Number.isFinite)).toBe(true)
          expect(
            compile(style.eligibility, 'boolean')(feature.properties)
          ).toBe(isAreaThemeEligible(feature.properties, state))
        }
})

it('compiles actual combined layer filters, including no-theme/all-off constants, through MapLibre featureFilter', () => {
  const props = {
    ...properties({ A: 2 }),
    level: 'region',
    area_id: 'region:01',
  }
  for (const state of [
    selection(),
    selection({ activeThematicMode: null }),
    selection({ activeThematicMode: 'heating' }),
    selection({
      activeThematicMode: 'ventilation',
      ventilationSwitchState: {
        mechanical: false,
        gravity: false,
        other: false,
        no_info: false,
      },
    }),
  ]) {
    const filter = [
      'all',
      ['==', ['get', 'level'], 'region'],
      ['==', ['typeof', ['get', 'area_id']], 'string'],
      areaThemeStyle(state).eligibility,
    ]
    const compiled = featureFilter(filter as never)
    expect(
      compiled.filter({ zoom: 6 }, { type: 3, properties: props } as never)
    ).toBe(isAreaThemeEligible(props, state))
  }
})
