import {
  collectMissingBuildingInfo,
  projectBuildingInfoMissingReason,
} from './buildingInfoMissingData'
import { parseEnergyCertificateConsumptionOutcome } from './energyCertificateConsumption'
import {
  createEnergymapBuildingInfoPanels,
  createEnergymapBuildingInfoPresentation,
  getSelectedEnergyConsumption,
} from './buildingInfo'
import type { EnergymapSelectedBuilding } from './types'
import type { EnergymapBuildingInfoText } from './buildingInfo'
import enTranslations from '@i18n/energiakartta/en.json'
import fiTranslations from '@i18n/energiakartta/fi.json'

const complete: EnergymapSelectedBuilding['properties'] = {
  address_fin: 'Testikatu 1',
  postal_code: '00100',
  postal_office_fin: 'Helsinki',
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
const gap = (properties: EnergymapSelectedBuilding['properties'], id: string) =>
  items(properties).find((item) => item.id === id)
const reasons = (item: ReturnType<typeof gap>) => {
  const flatten = (
    reason: import('./buildingInfoMissingData').BuildingInfoMissingReason
  ): import('./buildingInfoMissingData').BuildingInfoMissingReason[] => [
    reason,
    ...(reason.dependencies ?? []).flatMap(flatten),
  ]
  return item ? flatten(item.evidence) : []
}
const codes = (item: ReturnType<typeof gap>) =>
  reasons(item).map((reason) => reason.code)
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

it('records effective certificate quantities and keeps future ventilation reasons source-specific', () => {
  const model = present({
    ...complete,
    distr_default_total: null,
    energy_certificate_consumption: certificate(),
  })
  expect(model.missingData?.inventory).toContainEqual({
    id: 'energyConsumption.purchasedElectricity.annualTotal',
    status: 'available',
  })
  expect(
    projectBuildingInfoMissingReason({
      source: 'energyMapVentilationGrouping',
      field: 'ventilationCategory',
      kind: 'legacy-cause-unestablished',
      code: 'future-classification-cause',
      evidence: 'published-field',
    })
  ).toEqual({
    type: 'translation',
    keyName:
      'sidebar.building_info.missing_reason.fields.ventilationCategory.legacy',
  })
})

it('preserves null/empty semantics and records available and excluded inventory outcomes', () => {
  expect(
    createEnergymapBuildingInfoPresentation({
      selectedBuilding: null,
      locale: 'en',
    })
  ).toEqual({ panels: null, missingData: null })
  expect(present({}).panels).toEqual([])
  expect(items({}).length).toBeGreaterThan(20)
  expect(present().panels).toEqual(
    createEnergymapBuildingInfoPanels({
      selectedBuilding: selection(complete),
      locale: 'en',
    })
  )
  expect(items()).toEqual([])
  expect(present().missingData!.inventory).toEqual(
    expect.arrayContaining([
      { id: 'buildingDetails.address.street', status: 'available' },
      {
        id: 'waterHeating',
        status: 'excluded',
        basis: 'no-approved-separation-method',
      },
    ])
  )
})

it.each([
  ['propertyIdentifier', 'property_identifier', null, 'legacy'],
  ['propertyIdentifier', 'property_identifier', '09102000040003 ', 'invalid'],
  ['propertyIdentifier', 'property_identifier', 9102000040003, 'invalid'],
  ['propertyIdentifier', 'property_identifier', '00000000000000', 'invalid'],
  ['propertyIdentifier', 'property_identifier', '9102000040003', 'invalid'],
  ['buildingIdentifier', 'permanent_building_identifier', 123, 'invalid'],
  ['buildingIdentifier', 'permanent_building_identifier', '', 'legacy'],
  ['constructionYear', 'completion_date', 'invalid', 'invalid'],
  ['constructionYear', 'completion_date', '2024-02-30', 'invalid'],
  ['constructionYear', 'completion_date', '1967-garbage', 'invalid'],
  [
    'energyCertificateValidity',
    'energy_certificate_valid_until',
    '2031-02-30',
    'invalid',
  ],
  ['heatedNetArea', 'energy_certificate_heated_net_area', 0, 'invalid'],
  ['heatedNetArea', 'energy_certificate_heated_net_area', -1, 'invalid'],
  ['heatedNetArea', 'energy_certificate_heated_net_area', Infinity, 'invalid'],
  ['heatedNetArea', 'energy_certificate_heated_net_area', ' ', 'legacy'],
  [
    'ventilationType',
    'energy_certificate_ventilation_type_label_fi',
    123,
    'invalid',
  ],
  [
    'ventilation',
    'energy_certificate_ventilation_description_fi',
    false,
    'invalid',
  ],
] as const)(
  'distinguishes the received %s field (%s = %s)',
  (id, property, value, code) => {
    const properties = { ...complete, [property]: value }
    expect(gap(properties, `buildingDetails.${id}`)?.evidence).toMatchObject({
      field: id,
      code,
      evidence: 'published-field',
    })
    expect(
      present(properties).panels!.flatMap((panel) =>
        panel.sections.flatMap((section) => section.rows ?? [])
      )
    ).not.toContainEqual(expect.objectContaining({ id }))
  }
)

it('preserves opaque IDs, leading zeroes, valid calendar years and historical dates', () => {
  const properties = {
    ...complete,
    permanent_building_identifier: '000001A',
    property_identifier: '00102000040003',
    completion_date: '2024-02-29',
    energy_certificate_valid_until: '1999-01-01',
  }
  expect(items(properties)).toEqual([])
  const rows = present(properties).panels!.flatMap((panel) =>
    panel.sections.flatMap((section) => section.rows ?? [])
  )
  expect(rows).toContainEqual(
    expect.objectContaining({
      id: 'buildingIdentifier',
      text: { type: 'plain', text: '000001A' },
    })
  )
  expect(rows).toContainEqual(
    expect.objectContaining({
      id: 'propertyIdentifier',
      text: { type: 'plain', text: '00102000040003' },
    })
  )
})

it('keeps useful composite survivors and explains only unavailable components', () => {
  const properties = {
    ...complete,
    address_fin: 4,
    postal_office_fin: null,
    heating_method: null,
  }
  const result = items(properties)
  expect(result.map((item) => item.id)).toEqual([
    'buildingDetails.address.street',
    'buildingDetails.address.postalOffice',
    'buildingDetails.heating.method',
  ])
  expect(result[0].evidence.kind).toBe('invalid-supplied-input')
  expect(result[1].evidence.kind).toBe('legacy-cause-unestablished')
  expect(
    present(properties).panels!.flatMap((panel) =>
      panel.sections.flatMap((section) => section.rows ?? [])
    )
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: 'address',
        text: { type: 'plain', text: '00100' },
      }),
      expect.objectContaining({ id: 'heating', status: 'real' }),
    ])
  )
  const whollyAbsent = gap(
    {
      ...complete,
      address_fin: null,
      postal_code: null,
      postal_office_fin: null,
    },
    'buildingDetails.address'
  )
  expect(reasons(whollyAbsent).map((reason) => reason.field)).toEqual([
    'address',
    'address.street',
    'address.postalCode',
    'address.postalOffice',
  ])
})

it.each([
  ['unsupported_building_purpose', { main_purpose: '02' }, 'class-unsupported'],
  ['unsupported_building_purpose', { main_purpose: null }, 'class-purpose'],
  [
    'missing_completion_date',
    { completion_date: '2023-02-30' },
    'class-completion',
  ],
  [
    'unsupported_heating_source',
    { heating_energy_source: null },
    'class-heating',
  ],
  [
    'unsupported_heating_source',
    { main_purpose: '06', heating_energy_source: '07' },
    'class-heating',
  ],
  ['missing_heated_area', {}, 'class-area'],
  ['heated_area_below_50_m2', {}, 'class-small-area'],
  ['missing_number_of_storeys', {}, 'class-storeys'],
  ['missing_reference_value', {}, 'class-reference'],
  ['unrecognized_future_code', {}, 'class-unknown'],
  [undefined, {}, 'class-unknown'],
] as const)(
  'consumes modeled-class outcome %s independently of the official class',
  (code, raw, expected) => {
    const properties = {
      ...complete,
      ...raw,
      energy_class: null,
      modeled_energy_class_reason: code,
    }
    const item = gap(properties, 'buildingDetails.energyClass')
    expect(codes(item)).toEqual(
      expect.arrayContaining(['official-class', expected])
    )
    expect(JSON.stringify(item?.reason)).not.toContain(String(code))
    expect(
      gap({ ...properties, energy_class: 'C' }, 'buildingDetails.energyClass')
    ).toBeUndefined()
  }
)

it('does not invent certificate absence/history from modeled class or unknown origin', () => {
  for (const origin of [true, false, undefined, 'unexpected']) {
    const result = items({
      ...complete,
      energy_class: 'Z',
      is_energy_class_modeled: origin,
      energy_certificate_valid_until: null,
      energy_certificate_previous_class: null,
    })
    expect(result.map((item) => item.id)).toEqual([
      'buildingDetails.energyCertificateValidity',
      'buildingDetails.previousEnergyClass',
    ])
    expect(
      result.every(
        (item) => item.evidence.kind === 'legacy-cause-unestablished'
      )
    ).toBe(true)
  }
  const result = gap(
    { ...complete, energy_class: null, permanent_building_identifier: null },
    'buildingDetails.energyClass'
  )
  expect(codes(result)).toContain('certificate-join')
})

it.each([
  [
    {
      energy_certificate_ventilation_type_id: '1',
      energy_certificate_ventilation_type_label_fi: null,
    },
    'ventilationType',
    'ventilation-known-code',
  ],
  [
    {
      energy_certificate_ventilation_type_id: '999',
      energy_certificate_ventilation_type_label_fi: null,
    },
    'ventilationType',
    'ventilation-unknown-code',
  ],
  [
    { ventilation_category: 'no_info' },
    'ventilationCategory',
    'ventilation-no-info',
  ],
  [
    { ventilation_category: 'bad' },
    'ventilationCategory',
    'ventilation-classification',
  ],
] as const)(
  'keeps ventilation evidence distinct (%s)',
  (overrides, field, code) => {
    expect(
      codes(gap({ ...complete, ...overrides }, `buildingDetails.${field}`))
    ).toContain(code)
  }
)

it.each(['fi', 'en'])(
  'preserves FI/SV source alternatives and unknown present codes in %s',
  (locale) => {
    const properties = {
      ...complete,
      main_purpose: '99',
      heating_energy_source: '99',
      energy_class: 'Z',
      energy_certificate_ventilation_type_id: 'future',
      energy_certificate_ventilation_type_label_fi: false,
      energy_certificate_ventilation_type_label_sv: 'Självdrag',
      energy_certificate_ventilation_description_fi: 1,
      energy_certificate_ventilation_description_sv: 'Beskrivning',
      energy_certificate_recommendations_fi: null,
      energy_certificate_recommendations_sv: 'Täta fönstren.',
      ventilation_category: 'other',
    }
    expect(
      present(properties, locale).missingData!.items.filter(
        (item) => item.panelId === 'buildingDetails'
      )
    ).toEqual([])
  }
)

it.each([
  ['05', '01', '01', 'aahp', undefined],
  ['05', '09', '01', 'aahp', 'unsupported-aahp'],
  ['06', '01', '01', 'aahp', 'unsupported-aahp'],
  ['06', '07', '01', 'solar', 'unsupported-heating'],
  ['06', '04', '01', 'windows', 'unsupported-heating'],
  ['02', '01', '01', 'solar', 'unsupported-building'],
  [null, '01', '01', 'solar', 'legacy'],
  ['05', null, '01', 'solar', 'legacy'],
  ['05', '04', null, 'solar', 'legacy'],
  ['05', '99', '01', 'solar', 'unsupported-heating'],
] as const)(
  'uses actual reference coverage for %s / %s / %s / %s',
  (purpose, source, method, scenario, expected) => {
    const properties = {
      ...complete,
      main_purpose: purpose,
      heating_energy_source: source,
      heating_method: method,
      distr_aahp_total: null,
      distr_solar_total: null,
      distr_windows_total: null,
    }
    const item = gap(
      properties,
      `renovationRecommendations.${scenario}.perSquareMeter`
    )
    expect(item).toBeDefined()
    if (expected) expect(codes(item)).toContain(expected)
    else expect(codes(item)).not.toContain('unsupported-aahp')
    expect(
      items(properties).filter((item) =>
        /^renovationRecommendations\.(aahp|solar|windows)\./.test(item.id)
      )
    ).toHaveLength(9)
  }
)

it.each([
  ['05', '09', '01', 'gshp', ['aahp'], 'unsupported-aahp'],
  ['06', '01', '01', 'distr', ['aahp'], 'unsupported-aahp'],
  [
    '06',
    '07',
    '01',
    'wood',
    ['aahp', 'solar', 'windows'],
    'unsupported-heating',
  ],
  [
    '06',
    '04',
    '01',
    'elecb',
    ['aahp', 'solar', 'windows'],
    'unsupported-heating',
  ],
  [
    '02',
    '01',
    '01',
    'distr',
    ['aahp', 'solar', 'windows'],
    'unsupported-building',
  ],
] as const)(
  'does not present populated unsupported references for %s / %s / %s',
  (purpose, source, method, prefix, unsupportedMeasures, expected) => {
    const properties = {
      ...complete,
      main_purpose: purpose,
      heating_energy_source: source,
      heating_method: method,
      [`${prefix}_default_total`]: 20,
      [`${prefix}_default_heat`]: 15,
      [`${prefix}_default_elec`]: 5,
      [`${prefix}_aahp_total`]: 10,
      [`${prefix}_solar_total`]: 10,
      [`${prefix}_windows_total`]: 10,
      energy_certificate_consumption: certificate(),
    }
    const model = present(properties)
    const scenarios = model.panels?.flatMap((panel) =>
      panel.sections.flatMap((section) => section.scenarios ?? [])
    )
    for (const measure of unsupportedMeasures) {
      expect(scenarios?.some((scenario) => scenario.id === measure)).toBe(false)
      for (const quantity of [
        'annualTotal',
        'perSquareMeter',
        'savingsPercent',
      ]) {
        const id = `renovationRecommendations.${measure}.${quantity}`
        expect(
          codes(model.missingData!.items.find((item) => item.id === id))
        ).toContain(expected)
        expect(model.missingData?.inventory).toContainEqual({
          id,
          status: 'missing',
        })
      }
    }
    if (expected !== 'unsupported-aahp') {
      expect(
        model.missingData!.items.some(
          ({ id }) => id === 'energyConsumption.electricity.annualTotal'
        )
      ).toBe(false)
      expect(
        codes(gap(properties, 'energyConsumption.total.annualTotal'))
      ).toContain('certificate-total')
      // Independent certificate quantities survive residential-reference exclusions.
      expect(model.missingData?.inventory).toContainEqual({
        id: 'energyConsumption.purchasedElectricity.annualTotal',
        status: 'available',
      })
    }
  }
)

it('never infers AWHP from populated columns', () => {
  expect(
    gap(
      { ...complete, heating_energy_source: null, awhp_default_total: 10 },
      'energyConsumption.total.perSquareMeter'
    )
  ).toBeDefined()
})

it.each([
  [true, 'energyMapModeledClass'],
  [false, 'energyCertificateRegister'],
  [undefined, 'energyMapSelectedBuildingDataset'],
  ['true', 'energyMapSelectedBuildingDataset'],
] as const)(
  'attributes invalid effective class using origin %s without changing official uncertainty',
  (origin, source) => {
    const properties = {
      ...complete,
      energy_class: true,
      is_energy_class_modeled: origin,
      modeled_energy_class_reason: 'missing_reference_value',
    }
    const item = gap(properties, 'buildingDetails.energyClass')
    expect(reasons(item).filter((reason) => reason.code === 'invalid')).toEqual(
      [
        expect.objectContaining({
          field: 'energyClass',
          source,
          kind: 'invalid-supplied-input',
        }),
      ]
    )
    expect(codes(item)).toEqual([
      'official-class',
      'invalid',
      'class-reference',
    ])
    expect(
      gap({ ...properties, energy_class: 'Z' }, 'buildingDetails.energyClass')
    ).toBeUndefined()
  }
)

it.each(['total', 'heat', 'elec'] as const)(
  'separates annual operands from %s intensity, preserves zero and rejects invalid arithmetic',
  (quantity) => {
    const id =
      quantity === 'heat'
        ? 'heating'
        : quantity === 'elec'
          ? 'electricity'
          : 'total'
    const property = `distr_default_${quantity}`
    const annual = `energyConsumption.${id}.annualTotal`,
      intensity = `energyConsumption.${id}.perSquareMeter`
    expect(gap({ ...complete, floor_area: 0 }, intensity)).toBeUndefined()
    expect(
      reasons(gap({ ...complete, floor_area: 0 }, annual)).map(
        (reason) => reason.field
      )
    ).toContain('floorArea')
    const both = gap({ ...complete, floor_area: 0, [property]: null }, annual)
    expect(codes(both)).toContain('reference-output')
    expect(codes(both)).toContain('invalid')
    expect(gap({ ...complete, [property]: 0 }, annual)).toBeUndefined()
    for (const value of [-1, NaN, Infinity, 'bad'])
      expect(
        codes(gap({ ...complete, [property]: value }, intensity))
      ).toContain('invalid-output')
    expect(
      codes(
        gap(
          { ...complete, floor_area: 2, [property]: Number.MAX_VALUE },
          annual
        )
      )
    ).toContain('arithmetic')
    expect(
      gap(
        { ...complete, floor_area: 2, [property]: Number.MAX_VALUE },
        intensity
      )
    ).toBeUndefined()
  }
)

it.each(['aahp', 'solar', 'windows'] as const)(
  'keeps %s savings baseline separate from scenario and area',
  (scenario) => {
    const id = `renovationRecommendations.${scenario}.savingsPercent`,
      property = `distr_${scenario}_total`
    expect(
      gap({ ...complete, floor_area: null, [property]: 0 }, id)
    ).toBeUndefined()
    expect(gap({ ...complete, [property]: 120 }, id)).toBeUndefined()
    expect(gap({ ...complete, [property]: 240 }, id)).toBeUndefined()
    expect(
      codes(gap({ ...complete, [property]: -1, distr_default_total: null }, id))
    ).toEqual(expect.arrayContaining(['invalid-output', 'baseline-missing']))
    expect(
      codes(gap({ ...complete, [property]: null, distr_default_total: 0 }, id))
    ).toEqual(
      expect.arrayContaining(['reference-output', 'baseline-nonpositive'])
    )
    expect(
      codes(gap({ ...complete, [property]: null, distr_default_total: -1 }, id))
    ).toContain('baseline-nonpositive')
  }
)

it('retains apartment pellet price context independently of reference Energy coverage', () => {
  const properties = {
    ...complete,
    main_purpose: '06',
    heating_energy_source: '07',
    wood_default_heat: 100,
    wood_default_elec: 20,
    wood_default_total: 120,
  }
  const item = gap(properties, 'energyConsumption.cost')!
  expect(codes(item)).toContain('apartment-pellet-price')
  expect(item.evidence.calculation).toMatchObject({
    reason: 'incomplete-component',
    cause: 'unsupported-reference-value',
    field: 'factorPerMwh',
    component: 'heating',
    referenceReason: 'not-supplied',
    context: { buildingClass: 'apartmentBuilding', heatingCarrier: 'pellet' },
    causes: [
      expect.objectContaining({
        field: 'factorPerMwh',
        referenceReason: 'not-supplied',
      }),
    ],
  })
  expect(
    codes(gap(properties, 'energyConsumption.heating.annualTotal'))
  ).toContain('unsupported-heating')
  expect(gap(properties, 'energyConsumption.co2')).toBeUndefined()
  expect(
    gap({ ...properties, wood_default_heat: 0 }, 'energyConsumption.cost')
  ).toBeUndefined()
  const failed = gap(
    {
      ...complete,
      floor_area: -1,
      distr_default_heat: null,
      distr_default_elec: -1,
    },
    'energyConsumption.cost'
  )
  expect(reasons(failed).map((reason) => reason.field)).toEqual(
    expect.arrayContaining(['floorArea', 'default.heat', 'default.elec'])
  )
})

it('enumerates all standard certificate gaps and both intensity operands without inventing optional slots', () => {
  const properties = {
    ...complete,
    distr_default_heat: null,
    energy_certificate_consumption: certificate(),
  }
  const gaps = items(properties).filter((item) =>
    /^energyConsumption\.(purchasedElectricity|districtHeat|districtCooling|fossilFuel|renewableFuel|total)\./.test(
      item.id
    )
  )
  expect(gaps).toHaveLength(9) // four absent carriers and five intensities; retained reference total is available
  expect(gaps.some((item) => item.id.includes('Other'))).toBe(false)
  expect(
    gap(properties, 'energyConsumption.purchasedElectricity.annualTotal')
  ).toBeUndefined()
  expect(
    codes(gap(properties, 'energyConsumption.districtHeat.perSquareMeter'))
  ).toEqual(
    expect.arrayContaining(['certificate-carrier', 'certificate-area-absent'])
  )
  expect(
    gap(
      {
        ...properties,
        energy_certificate_consumption: certificate({ heated_net_area_m2: 50 }),
      },
      'energyConsumption.purchasedElectricity.perSquareMeter'
    )
  ).toBeUndefined()
  expect(
    codes(
      gap(
        {
          ...properties,
          energy_certificate_consumption: certificate({
            heated_net_area_m2: 0,
          }),
        },
        'energyConsumption.purchasedElectricity.perSquareMeter'
      )
    )
  ).toContain('certificate-area-invalid')
  expect(
    items({ ...complete, energy_certificate_consumption: 'malformed' })
  ).toEqual([])
})

it.each([
  ['oil', '02', '01'],
  ['wood', '07', '01'],
  ['elecb', '04', '01'],
  ['delec', '04', '03'],
])(
  'keeps %s heating separate from certificate district-heat conversion diagnostics',
  (prefix, heatingEnergySource, heatingMethod) => {
    const model = present({
      ...complete,
      heating_energy_source: heatingEnergySource,
      heating_method: heatingMethod,
      [`${prefix}_default_heat`]: 75,
      energy_certificate_consumption: certificate({
        components: [
          { carrier: 'electricity', annual_kwh: 2000 },
          { carrier: 'district_heat', annual_kwh: 7000 },
        ],
      }),
    })
    const controls = model.panels!
      .find((panel) => panel.id === 'energyConsumption')!
      .sections.find((section) => section.id === 'estimatedConsumption')!
      .consumptionControls!
    expect(
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: ['heating'],
      }).values.map(({ id, amount }) => ({ id, amount }))
    ).toEqual([
      { id: 'annualTotal', amount: 7500 },
      { id: 'perSquareMeter', amount: 75 },
    ])
    expect(
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: ['districtHeat'],
      }).values.map(({ id, amount }) => ({ id, amount }))
    ).toEqual([{ id: 'annualTotal', amount: 7000 }])

    const { items, inventory } = model.missingData!
    const missingIntensity = items.find(
      (item) => item.id === 'energyConsumption.districtHeat.perSquareMeter'
    )
    expect(missingIntensity?.evidence).toMatchObject({
      source: 'energyCertificateRegister',
      code: 'certificate-intensity',
      dependencies: [
        {
          source: 'energyCertificateRegister',
          field: 'certificateArea',
          code: 'certificate-area-absent',
        },
      ],
    })
    expect(
      inventory.filter((item) =>
        /^energyConsumption\.(heating|districtHeat)\./.test(item.id)
      )
    ).toEqual([
      { id: 'energyConsumption.heating.annualTotal', status: 'available' },
      { id: 'energyConsumption.heating.perSquareMeter', status: 'available' },
      { id: 'energyConsumption.districtHeat.annualTotal', status: 'available' },
      { id: 'energyConsumption.districtHeat.perSquareMeter', status: 'missing' },
    ])
  }
)

it.each([75, null])(
  'keeps compatible district-heat diagnostics aligned with effective controls (reference intensity %s)',
  (referenceHeat) => {
    const model = present({
      ...complete,
      distr_default_heat: referenceHeat,
      distr_default_elec: null,
      distr_default_total: null,
      energy_certificate_consumption: certificate({
        components: [
          { carrier: 'electricity', annual_kwh: 2000 },
          { carrier: 'district_heat', annual_kwh: 7000 },
        ],
      }),
    })
    const controls = model.panels!
      .find((panel) => panel.id === 'energyConsumption')!
      .sections.find((section) => section.id === 'estimatedConsumption')!
      .consumptionControls!
    const heatId = referenceHeat == null ? 'districtHeat' : 'heating'
    expect(
      controls.energySubmetrics
        ?.filter(({ id }) => ['heating', 'districtHeat'].includes(id))
        .map(({ id }) => id)
    ).toEqual([heatId])
    expect(
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: [heatId],
      }).values.map(({ id, amount }) => ({ id, amount }))
    ).toEqual(
      referenceHeat == null
        ? [{ id: 'annualTotal', amount: 7000 }]
        : [
            { id: 'annualTotal', amount: 7500 },
            { id: 'perSquareMeter', amount: 75 },
          ]
    )
    expect(
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: ['purchasedElectricity'],
      }).values.map(({ id, amount }) => ({ id, amount }))
    ).toEqual([{ id: 'annualTotal', amount: 2000 }])
    expect(
      model.missingData!.inventory.filter((item) =>
        /^energyConsumption\.(heating|districtHeat)\./.test(item.id)
      )
    ).toEqual([
      { id: `energyConsumption.${heatId}.annualTotal`, status: 'available' },
      {
        id: `energyConsumption.${heatId}.perSquareMeter`,
        status: referenceHeat == null ? 'missing' : 'available',
      },
    ])
  }
)

it.each([
  'electricity',
  'district_heat',
  'district_cooling',
  'fossil_fuel',
  'renewable_fuel',
] as const)(
  'explains omitted %s as legacy normalization uncertainty',
  (carrier) => {
    const components = [
      'electricity',
      'district_heat',
      'district_cooling',
      'fossil_fuel',
      'renewable_fuel',
    ]
      .filter((value) => value !== carrier)
      .map((value) => ({ carrier: value, annual_kwh: 0 }))
    const gaps = items({
      ...complete,
      distr_default_heat: null,
      energy_certificate_consumption: certificate({
        components,
        heated_net_area_m2: 20,
      }),
    })
    const carrierGaps = gaps.filter((item) => item.evidence.field === carrier)
    expect(carrierGaps).toHaveLength(1)
    expect(carrierGaps[0].evidence.kind).toBe('legacy-cause-unestablished')
    expect(carrierGaps[0].reason).toEqual({
      type: 'translation',
      keyName: `sidebar.building_info.missing_reason.carriers.${carrier}`,
    })
  }
)

it('retains used optional slots and keeps unnamed rejected slots at total-level uncertainty', () => {
  const components = [
    'electricity',
    'district_heat',
    'district_cooling',
    'fossil_fuel',
    'renewable_fuel',
  ].map((carrier) => ({ carrier, annual_kwh: 0 }))
  const properties = {
    ...complete,
    distr_default_heat: null,
    energy_certificate_consumption: certificate({
      components: [
        ...components,
        {
          carrier: 'other',
          source_slot: 1,
          name: '<b>Source name</b>',
          annual_kwh: 0,
        },
      ],
    }),
  }
  const result = items(properties)
  expect(result).toContainEqual(
    expect.objectContaining({
      id: 'energyConsumption.other1.perSquareMeter',
      label: expect.objectContaining({
        parts: expect.arrayContaining([
          { type: 'plain', text: '<b>Source name</b>' },
        ]),
      }),
    })
  )
  expect(
    result.some(
      (item) => item.id.includes('Other0') || item.id.includes('Other2')
    )
  ).toBe(false)
  expect(
    gap(properties, 'energyConsumption.total.annualTotal')?.evidence
      .dependencies
  ).toBeUndefined()
})

it('keeps the reported office certificate and class independently of unsupported reference/area', () => {
  const components = [
    { carrier: 'electricity', annual_kwh: 1196074 },
    { carrier: 'district_heat', annual_kwh: 2994881 },
    { carrier: 'district_cooling', annual_kwh: 197293 },
    { carrier: 'fossil_fuel', annual_kwh: 0 },
    { carrier: 'renewable_fuel', annual_kwh: 0 },
  ]
  const properties = {
    ...complete,
    building_key: '1752c0cc-65e2-45d5-938a-b47f09349ae4',
    permanent_building_identifier: '1036581819',
    main_purpose: '02',
    completion_date: '1993-03-08',
    floor_area: 0,
    energy_class: 'C',
    distr_default_total: null,
    distr_default_heat: null,
    distr_default_elec: null,
    energy_certificate_consumption: certificate({
      building_identifier: '1036581819',
      certificate_id: '318510',
      certificate_version: 2018,
      signed_at: '2023-04-13T11:37:42.080327',
      valid_until: '2033-04-14T00:00:00',
      heated_net_area_m2: 22707.2,
      completeness: 'complete',
      components,
      total_kwh_year: 4388248,
    }),
  }
  expect(
    items(properties).some((item) =>
      item.id.startsWith('energyConsumption.certificate')
    )
  ).toBe(false)
  const metrics = present(properties).panels!.flatMap((panel) =>
    panel.sections.flatMap(
      (section) =>
        section.consumptionControls?.energySubmetrics?.map(
          ({ metric }) => metric
        ) ??
        section.metrics ??
        []
    )
  )
  expect(
    metrics.find((metric) => metric.id === 'total')?.values[0].text
  ).toEqual({ type: 'plain', text: '4,388,248' })
  expect(
    metrics.find((metric) => metric.id === 'fossilFuel')?.values[0].text
  ).toEqual({ type: 'plain', text: '0' })
  expect(gap(properties, 'buildingDetails.energyClass')).toBeUndefined()
  expect(
    gap(properties, 'energyConsumption.heating.annualTotal')
  ).toBeUndefined()
})

it('uses effective semantic availability independent of section IDs for F099', () => {
  const properties = { ...complete, distr_default_heat: null }
  const panels = present(properties).panels!.map((panel) => ({
    ...panel,
    sections: panel.sections.map((section) => ({
      ...section,
      id: 'renamed-layout-section',
    })),
  }))
  const result = collectMissingBuildingInfo({
    candidates: panels,
    properties,
    prefix: 'distr',
    certificateOutcome: parseEnergyCertificateConsumptionOutcome(properties),
    effectiveAvailability: {
      'energyConsumption.total.annualTotal': 'excluded',
      'energyConsumption.heating.annualTotal': 'available',
    },
  })
  expect(
    result.items.some(
      (item) =>
        item.id === 'energyConsumption.total.annualTotal' ||
        item.id === 'energyConsumption.heating.annualTotal'
    )
  ).toBe(false)
})

it('rebuilds immutable diagnostics and resolves every emitted label/reason in FI/EN', () => {
  const keys = (text: EnergymapBuildingInfoText): string[] =>
    text.type === 'translation'
      ? [text.keyName]
      : text.type === 'sequence'
        ? text.parts.flatMap(keys)
        : []
  const samples = [
    complete,
    {},
    {
      ...complete,
      floor_area: -1,
      property_identifier: 'invalid',
      energy_certificate_valid_until: 'invalid',
    },
    {
      ...complete,
      distr_default_heat: null,
      energy_certificate_consumption: certificate(),
    },
    { ...complete, energy_class: null, modeled_energy_class_reason: 'unknown' },
  ]
  for (const properties of samples) {
    const first = present(Object.freeze(properties), 'fi'),
      snapshot = JSON.stringify(first)
    const result = present(properties, 'en')
    expect(JSON.stringify(first)).toBe(snapshot)
    const resultItems = result.missingData!.items
    expect(new Set(resultItems.map((item) => item.id)).size).toBe(
      resultItems.length
    )
    const order = resultItems.map((item) =>
      [
        'buildingDetails',
        'energyConsumption',
        'renovationRecommendations',
      ].indexOf(item.panelId)
    )
    expect(order).toEqual([...order].sort())
    for (const item of resultItems) {
      expect(item.evidence.source).toBeTruthy()
      expect(item.evidence.kind).toBeTruthy()
      expect(keys(item.reason).length).toBeGreaterThan(0)
      for (const translations of [fiTranslations, enTranslations])
        for (const key of [...keys(item.label), ...keys(item.reason)]) {
          const value = key
            .split('.')
            .reduce<unknown>(
              (node, part) =>
                (node as Record<string, unknown> | undefined)?.[part],
              translations
            )
          expect(typeof value).toBe('string')
          expect(value).not.toBe('')
        }
    }
  }
})

it.each(['05', '06'])(
  'covers every documented %s reference/scenario combination, including AWHP without inventing a Ryhti route',
  (purpose) => {
    for (const prefix of [
      'awhp',
      'delec',
      'distr',
      'elecb',
      'gshp',
      'oil',
      'wood',
    ] as const) {
      const properties = {
        main_purpose: purpose,
        completion_date: '1990-01-01',
        heating_energy_source: '01',
        floor_area: 100,
      }
      const candidates: import('./buildingInfo').EnergymapBuildingInfoPanel[] =
        [
          {
            id: 'energyConsumption',
            title: { type: 'plain', text: 'Energy' },
            sections: [
              {
                id: 'any-layout',
                metrics: [
                  {
                    id: 'total',
                    label: { type: 'plain', text: 'Total' },
                    values: [
                      {
                        id: 'perSquareMeter',
                        label: { type: 'plain', text: 'Intensity' },
                        status: 'missing',
                        text: { type: 'plain', text: '' },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            id: 'renovationRecommendations',
            title: { type: 'plain', text: 'Renovations' },
            sections: [
              {
                id: 'any-renovation-layout',
                scenarios: (['aahp', 'solar', 'windows'] as const).map(
                  (id) => ({
                    id,
                    label: { type: 'plain', text: id },
                    values: [
                      {
                        id: 'perSquareMeter',
                        label: { type: 'plain', text: 'Intensity' },
                        status: 'missing',
                        text: { type: 'plain', text: '' },
                      },
                    ],
                  })
                ),
              },
            ],
          },
        ]
      const result = collectMissingBuildingInfo({
        properties,
        candidates,
        prefix,
        certificateOutcome: { status: 'absent' },
      })
      const resultCodes = (id: string) =>
        codes(result.items.find((item) => item.id === id))
      const unsupportedHeating =
        purpose === '06' && ['wood', 'elecb'].includes(prefix)
      for (const id of [
        'energyConsumption.total',
        'renovationRecommendations.solar',
        'renovationRecommendations.windows',
      ]) {
        expect(
          resultCodes(`${id}.perSquareMeter`).includes('unsupported-heating')
        ).toBe(unsupportedHeating)
      }
      expect(
        resultCodes('renovationRecommendations.aahp.perSquareMeter').includes(
          'unsupported-aahp'
        )
      ).toBe(purpose === '06' || ['awhp', 'gshp'].includes(prefix))
    }
  }
)
