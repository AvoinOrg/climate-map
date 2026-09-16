import {
  createEnergymapBuildingInfoPanels,
  createEnergymapBuildingInfoPresentation,
} from './buildingInfo'
import type { EnergymapSelectedBuilding } from './types'
import type { EnergymapBuildingInfoText } from './buildingInfo'
import enTranslations from '@i18n/energiakartta/en.json'
import fiTranslations from '@i18n/energiakartta/fi.json'

const complete: EnergymapSelectedBuilding['properties'] = {
  address_fin: 'Testikatu 1',
  permanent_building_identifier: '101614422K',
  property_identifier: '09102000040003',
  completion_date: '1967-01-01',
  main_purpose: '05',
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 100,
  energy_class: 'D',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2031-12-31',
  energy_certificate_previous_class: 'E',
  energy_certificate_heated_net_area: 100,
  energy_certificate_ventilation_type_label_fi: 'Painovoimainen',
  energy_certificate_ventilation_description_fi: 'Painovoimainen ilmanvaihto.',
  ventilation_category: 'gravity',
  energy_certificate_recommendations_fi: 'Tiivistä ikkunat.',
  distr_default_total: 120,
  distr_default_heat: 100,
  distr_default_elec: 20,
  distr_aahp_total: 100,
  distr_solar_total: 90,
  distr_windows_total: 80,
}
const selection = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapSelectedBuilding => ({
  id: 'diagnostics-building',
  buildingKey: 'diagnostics-building',
  source: 'energymap_building_polygons',
  sourceLayer: 'energymap_building_polygons',
  layerId: 'energymap_building_polygons-fill',
  properties,
})
const present = (properties = complete, locale = 'en') =>
  createEnergymapBuildingInfoPresentation({
    selectedBuilding: selection(properties),
    locale,
  })
const items = (properties = complete) => present(properties).missingData!.items
const reasonKey = (name: string) => ({
  type: 'translation',
  keyName: `sidebar.building_info.missing_data.${name}`,
})

it('preserves null and empty panel semantics without losing diagnostics', () => {
  expect(
    createEnergymapBuildingInfoPresentation({
      selectedBuilding: null,
      locale: 'en',
    })
  ).toEqual({ panels: null, missingData: null })
  expect(present({}).panels).toEqual([])
  expect(items({}).length).toBeGreaterThan(0)
  expect(present(complete).panels).toEqual(
    createEnergymapBuildingInfoPanels({
      selectedBuilding: selection(complete),
      locale: 'en',
    })
  )
  expect(items()).toEqual([])
})

it.each([
  ['propertyIdentifier', 'property_identifier', null, 'ryhti_unavailable'],
  [
    'propertyIdentifier',
    'property_identifier',
    '09102000040003 ',
    'ryhti_invalid',
  ],
  ['propertyIdentifier', 'property_identifier', 9102000040003, 'ryhti_invalid'],
  [
    'propertyIdentifier',
    'property_identifier',
    '00000000000000',
    'ryhti_invalid',
  ],
  ['constructionYear', 'completion_date', 'invalid', 'ryhti_invalid'],
  [
    'energyCertificateValidity',
    'energy_certificate_valid_until',
    '2031-02-30',
    'certificate_invalid',
  ],
  [
    'heatedNetArea',
    'energy_certificate_heated_net_area',
    0,
    'certificate_invalid',
  ],
  [
    'heatedNetArea',
    'energy_certificate_heated_net_area',
    ' ',
    'certificate_unavailable',
  ],
  [
    'ventilationType',
    'energy_certificate_ventilation_type_label_fi',
    '',
    'certificate_unavailable',
  ],
])(
  'explains unavailable %s from its resolved value',
  (id, property, value, reason) => {
    const result = present({ ...complete, [property]: value })
    expect(result.missingData!.items).toContainEqual(
      expect.objectContaining({
        id: `buildingDetails.${id}`,
        reason: reasonKey(String(reason)),
      })
    )
    expect(
      result.panels!.flatMap((p) => p.sections.flatMap((s) => s.rows ?? []))
    ).not.toContainEqual(expect.objectContaining({ id }))
    expect(items()).not.toContainEqual(
      expect.objectContaining({ id: `buildingDetails.${id}` })
    )
  }
)

it('accepts composite survivors, source fallback, estimates, zero, and unknown present codes', () => {
  const result = items({
    ...complete,
    address_fin: null,
    postal_code: '00100',
    heating_method: null,
    energy_class: 'Z',
    is_energy_class_modeled: true,
    energy_certificate_previous_class: 'Z',
    energy_certificate_ventilation_type_label_fi: ' ',
    energy_certificate_ventilation_type_label_sv: 'Självdrag',
    energy_certificate_ventilation_description_fi: null,
    energy_certificate_ventilation_description_sv: 'Självdrag.',
    energy_certificate_recommendations_fi: null,
    energy_certificate_recommendations_sv: 'Täta fönstren.',
    distr_default_elec: 0,
  })
  expect(result).toEqual([])
  expect(items({ ...complete, main_purpose: '99' })).not.toContainEqual(
    expect.objectContaining({ id: 'buildingDetails.buildingType' })
  )
})

it('does not turn a raw ventilation code into available display text or invent a class absence cause', () => {
  const result = items({
    ...complete,
    energy_certificate_ventilation_type_label_fi: null,
    energy_certificate_ventilation_type_id: '1',
    energy_class: null,
  })
  expect(result.map((item) => item.id)).toEqual([
    'buildingDetails.energyClass',
    'buildingDetails.ventilationType',
  ])
  expect(result[0]).not.toHaveProperty('reason')
})

it('qualifies partial outputs, orders families, and collects each semantic output once', () => {
  const result = items({
    ...complete,
    address_fin: null,
    floor_area: 0,
    distr_windows_total: null,
  })
  expect(result[0].id).toBe('buildingDetails.address')
  expect(result).toContainEqual(
    expect.objectContaining({
      id: 'energyConsumption.heating.annualTotal',
      reason: reasonKey('annual_area'),
    })
  )
  expect(result).not.toContainEqual(
    expect.objectContaining({ id: 'energyConsumption.heating.perSquareMeter' })
  )
  expect(result).toContainEqual(
    expect.objectContaining({
      id: 'renovationRecommendations.windows.perSquareMeter',
      reason: reasonKey('model_output'),
    })
  )
  expect(new Set(result.map((i) => i.id)).size).toBe(result.length)
  expect(result.map((i) => i.panelId)).toEqual(
    [...result.map((i) => i.panelId)].sort(
      (a, b) =>
        [
          'buildingDetails',
          'energyConsumption',
          'renovationRecommendations',
        ].indexOf(a) -
        [
          'buildingDetails',
          'energyConsumption',
          'renovationRecommendations',
        ].indexOf(b)
    )
  )
})

it('reuses supported calculation failure reasons and excludes unpublished scenarios', () => {
  const result = items({
    ...complete,
    heating_energy_source: '99',
    floor_area: null,
  })
  expect(
    result.find((i) => i.id === 'energyConsumption.water')?.reason
  ).toEqual({
    type: 'translation',
    keyName: 'sidebar.building_info.panels.energy.unsupported.water',
  })
  expect(result.find((i) => i.id === 'energyConsumption.cost')?.reason).toEqual(
    {
      type: 'translation',
      keyName:
        'sidebar.building_info.panels.energy.unsupported.heating_carrier',
    }
  )
  expect(
    result.some((i) => i.id.includes('renovationRecommendations.aahp'))
  ).toBe(false)
  expect(result.some((i) => i.id.includes('waterHeating'))).toBe(false)
  expect(
    items({ ...complete, heating_energy_source: '09' }).some((i) =>
      i.id.startsWith('renovationRecommendations.aahp')
    )
  ).toBe(false)
})

const certificate = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    schema_version: 1,
    basis: 'standardized_calculation',
    unit: 'kWh/year',
    certificate_version: 2018,
    certificate_id: 'test-certificate',
    building_identifier: '101614422K',
    completeness: 'partial',
    components: [{ carrier: 'electricity', annual_kwh: 0 }],
    ...overrides,
  })

it('collects applicable certificate total/intensity gaps without unused carriers or borrowed area', () => {
  const properties = {
    ...complete,
    distr_default_heat: null,
    energy_certificate_consumption: certificate(),
  }
  const gaps = items(properties).filter((i) => i.id.includes('certificate'))
  expect(gaps.map((i) => i.id)).toEqual([
    'energyConsumption.certificateTotal.annualTotal',
    'energyConsumption.certificateElectricity.perSquareMeter',
  ])
  expect(gaps[1].reason).toEqual(reasonKey('certificate_area'))
  expect(
    items({
      ...properties,
      energy_certificate_consumption: certificate({ heated_net_area_m2: 50 }),
    }).map((i) => i.id)
  ).not.toContain('energyConsumption.certificateElectricity.perSquareMeter')
  expect(
    items({ ...complete, energy_certificate_consumption: certificate() })
  ).toEqual([])
  expect(
    items({ ...properties, energy_certificate_consumption: 'invalid' })
  ).toContainEqual(
    expect.objectContaining({
      id: 'energyConsumption.certificateConsumption',
      reason: reasonKey('certificate_unavailable'),
    })
  )
})

it('rebuilds diagnostics without mutating prior results or selection properties', () => {
  const properties = Object.freeze({ ...complete, property_identifier: null })
  const first = present(properties, 'fi')
  const snapshot = JSON.stringify(first)
  expect(present(properties, 'en').missingData!.locale).toBe('en')
  expect(present(complete).missingData!.items).toEqual([])
  expect(JSON.stringify(first)).toBe(snapshot)
})

it.each([
  [{ main_purpose: '99' }, 'cost', 'cost_building_class'],
  [
    {
      main_purpose: '06',
      heating_energy_source: '07',
      wood_default_heat: 100,
      wood_default_elec: 20,
    },
    'cost',
    'apartment_pellet_cost',
  ],
  [{ distr_default_elec: null }, 'cost', 'missing_reference_data'],
  [{ floor_area: -1 }, 'co2', 'invalid_reference_data'],
])(
  'keeps the precise unsupported calculation reason for %s',
  (overrides, output, key) => {
    expect(
      items({ ...complete, ...overrides }).find(
        (item) => item.id === `energyConsumption.${output}`
      )?.reason
    ).toEqual({
      type: 'translation',
      keyName: `sidebar.building_info.panels.energy.unsupported.${key}`,
    })
  }
)

it('keeps zero consumption available while explaining the undefined savings ratio', () => {
  const gaps = items({
    ...complete,
    distr_default_total: 0,
    distr_default_heat: 0,
    distr_default_elec: 0,
  })
  expect(gaps.filter((item) => item.panelId === 'energyConsumption')).toEqual(
    []
  )
  expect(gaps.map((item) => item.id)).toEqual([
    'renovationRecommendations.aahp.savingsPercent',
    'renovationRecommendations.solar.savingsPercent',
    'renovationRecommendations.windows.savingsPercent',
  ])
  expect(
    gaps.every(
      (item) =>
        JSON.stringify(item.reason) ===
        JSON.stringify(reasonKey('savings_inputs'))
    )
  ).toBe(true)
})

it('resolves the diagnostic labels and reasons in both downloaded locales', () => {
  const keys = (text?: EnergymapBuildingInfoText): string[] =>
    text?.type === 'translation'
      ? [text.keyName]
      : text?.type === 'sequence'
        ? text.parts.flatMap((part) => keys(part))
        : []
  const diagnosticKeys = [
    ...items({}),
    ...items({
      ...complete,
      floor_area: -1,
      property_identifier: 'invalid',
      energy_certificate_valid_until: 'invalid',
    }),
    ...items({
      ...complete,
      distr_default_heat: null,
      energy_certificate_consumption: certificate(),
    }),
  ].flatMap((item) => [...keys(item.label), ...keys(item.reason)])
  for (const translations of [fiTranslations, enTranslations]) {
    for (const key of diagnosticKeys) {
      const value = key
        .split('.')
        .reduce<unknown>(
          (node, part) => (node as Record<string, unknown> | undefined)?.[part],
          translations
        )
      expect(typeof value).toBe('string')
      expect(value).not.toBe('')
    }
  }
})
