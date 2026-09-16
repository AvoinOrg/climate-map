import { execFileSync } from 'node:child_process'
import {
  composeEnergymapBuildingAddress,
  createEnergymapBuildingInfoPanels,
  formatCalendarDate,
  formatYearFromDate,
  getSelectedEnergyConsumption,
  isEnergymapBuildingInfoValueAvailable,
  normalizeEnergySubmetricSelection,
  normalizeEnergymapBuildingInfoText,
  resolveCurrentEnergyScenarioPrefix,
} from './buildingInfo'
import enTranslations from '@i18n/energiakartta/en.json'
import fiTranslations from '@i18n/energiakartta/fi.json'
import type {
  EnergymapBuildingInfoConsumptionControls,
  EnergymapBuildingInfoEnergySubmetricId,
  EnergymapBuildingInfoMetric,
  EnergymapBuildingInfoMetricValue,
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoPanelId,
  EnergymapBuildingInfoPrimaryMetric,
  EnergymapBuildingInfoPrimaryMetricId,
  EnergymapBuildingInfoRow,
  EnergymapBuildingInfoScenario,
  EnergymapBuildingInfoSection,
  EnergymapBuildingInfoText,
  EnergymapBuildingInfoValue,
} from './buildingInfo'
import {
  ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS,
} from './buildingInfoProvenance'
import type { EnergymapSelectedBuilding } from './types'

const translationPrefix = 'sidebar.building_info'

const translation = (
  keyName: string,
  params?: Record<string, string | number>
): EnergymapBuildingInfoText => ({
  type: 'translation',
  keyName,
  ...(params == null ? {} : { params }),
})

const plain = (text: string): EnergymapBuildingInfoText => ({
  type: 'plain',
  text,
})

const createSelectedBuilding = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapSelectedBuilding => ({
  id: String(properties.building_key ?? 'selected-building'),
  buildingKey: String(properties.building_key ?? 'selected-building'),
  source: 'energymap_building_polygons',
  sourceLayer: 'energymap_building_polygons',
  layerId: 'energymap_building_polygons-fill',
  properties,
})

const districtHeatingProperties = {
  building_key: '9da63bcd-bb54-447c-b991-8eec8f8c5666',
  permanent_building_identifier: '101614422K',
  address_fin: 'Mikkolantie 34a',
  postal_code: '00640',
  postal_office_fin: 'HELSINKI',
  main_purpose: '05',
  completion_date: '1967-01-01',
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 454,
  energy_class: 'D',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2031-12-31 00:00:00.0',
  energy_certificate_heated_net_area: 1355,
  distr_default_total: 367.7884615,
  distr_default_heat: 343.6634615,
  distr_default_elec: 24.125,
  distr_aahp_total: 289.7019231,
  distr_solar_total: 334.2980769,
  distr_windows_total: 332.6442308,
} satisfies EnergymapSelectedBuilding['properties']

const districtHeatingBuilding = createSelectedBuilding(
  districtHeatingProperties
)

const completeBuilding = createSelectedBuilding({
  ...districtHeatingProperties,
  building_key: 'complete-building',
  energy_certificate_previous_class: 'E',
  energy_certificate_ventilation_description_fi:
    '  Painovoimainen ilmanvaihto.  ',
  energy_certificate_recommendations_fi:
    '  Tiivistä yläpohjan lämmöneristystä.  ',
})

const createCertificateConsumptionProperties = ({
  properties,
  payload = {},
}: {
  properties: EnergymapSelectedBuilding['properties']
  payload?: Record<string, unknown>
}): EnergymapSelectedBuilding['properties'] => {
  const buildingIdentifier = String(
    properties.permanent_building_identifier ?? 'CERTIFICATE-BUILDING'
  )
  const components = [
    { carrier: 'electricity', annual_kwh: 10 },
    { carrier: 'district_heat', annual_kwh: 20 },
    { carrier: 'district_cooling', annual_kwh: 30 },
    { carrier: 'fossil_fuel', annual_kwh: 40 },
    { carrier: 'renewable_fuel', annual_kwh: 50 },
  ]

  return {
    ...properties,
    permanent_building_identifier: buildingIdentifier,
    energy_certificate_consumption: JSON.stringify({
      schema_version: 1,
      basis: 'standardized_calculation',
      unit: 'kWh/year',
      certificate_version: 2018,
      certificate_id: 'CERT-2024-001',
      building_identifier: buildingIdentifier,
      completeness: 'complete',
      components,
      total_kwh_year: 150,
      signed_at: '2024-01-02T00:00:00Z',
      valid_until: '2034-01-02T00:00:00Z',
      heated_net_area_m2: 50,
      ...payload,
    }),
  }
}

const getPanel = (
  panels: EnergymapBuildingInfoPanel[],
  panelId: EnergymapBuildingInfoPanelId
) => {
  const panel = panels.find((candidate) => candidate.id === panelId)
  if (panel == null) throw new Error(`Panel not found: ${panelId}`)
  return panel
}

const findPanel = (
  panels: EnergymapBuildingInfoPanel[],
  panelId: EnergymapBuildingInfoPanelId
) => panels.find((candidate) => candidate.id === panelId)

const getSection = (panel: EnergymapBuildingInfoPanel, sectionId: string) => {
  const section = panel.sections.find((candidate) => candidate.id === sectionId)
  if (section == null) throw new Error(`Section not found: ${sectionId}`)
  return section
}

const findSection = (panel: EnergymapBuildingInfoPanel, sectionId: string) =>
  panel.sections.find((candidate) => candidate.id === sectionId)

const getRows = (panel: EnergymapBuildingInfoPanel) =>
  panel.sections.flatMap((section) => section.rows ?? [])

const getRow = (
  panel: EnergymapBuildingInfoPanel,
  rowId: string
): EnergymapBuildingInfoRow => {
  const result = getRows(panel).find((candidate) => candidate.id === rowId)
  if (result == null) throw new Error(`Row not found: ${rowId}`)
  return result
}

const findRow = (panel: EnergymapBuildingInfoPanel, rowId: string) =>
  getRows(panel).find((candidate) => candidate.id === rowId)

const getMetrics = (panel: EnergymapBuildingInfoPanel) =>
  panel.sections.flatMap((section) => section.metrics ?? [])

const getMetric = (
  panel: EnergymapBuildingInfoPanel,
  metricId: EnergymapBuildingInfoMetric['id']
) => {
  const metric = getMetrics(panel).find(
    (candidate) => candidate.id === metricId
  )
  if (metric == null) throw new Error(`Metric not found: ${metricId}`)
  return metric
}

const getMetricValue = (
  metric: EnergymapBuildingInfoMetric,
  valueId: EnergymapBuildingInfoMetricValue['id']
) => {
  const value = metric.values.find((candidate) => candidate.id === valueId)
  if (value == null) throw new Error(`Metric value not found: ${valueId}`)
  return value
}

const getControls = (
  panel: EnergymapBuildingInfoPanel
): EnergymapBuildingInfoConsumptionControls => {
  const controls = panel.sections.find(
    (section) => section.id === 'estimatedConsumption'
  )?.consumptionControls
  if (controls == null) throw new Error('Consumption controls not found')
  return controls
}

const getPrimaryMetric = (
  controls: EnergymapBuildingInfoConsumptionControls,
  metricId: EnergymapBuildingInfoPrimaryMetricId
): EnergymapBuildingInfoPrimaryMetric => {
  const metric = controls.primaryMetrics.find(
    (candidate) => candidate.id === metricId
  )
  if (metric == null) throw new Error(`Primary metric not found: ${metricId}`)
  return metric
}

const getScenario = (
  panel: EnergymapBuildingInfoPanel,
  scenarioId: EnergymapBuildingInfoScenario['id']
) => {
  const scenario = panel.sections
    .flatMap((section) => section.scenarios ?? [])
    .find((candidate) => candidate.id === scenarioId)
  if (scenario == null) throw new Error(`Scenario not found: ${scenarioId}`)
  return scenario
}

const expectPlainText = (text: EnergymapBuildingInfoText, expected: string) =>
  expect(text).toEqual({ type: 'plain', text: expected })

const expectTranslation = (
  text: EnergymapBuildingInfoText,
  keyName: string,
  params?: Record<string, string | number>
) =>
  expect(text).toEqual({
    type: 'translation',
    keyName,
    ...(params == null ? {} : { params }),
  })

const expectAvailableText = (text: EnergymapBuildingInfoText) => {
  expect(normalizeEnergymapBuildingInfoText(text)).not.toBeNull()
  if (text.type === 'sequence') {
    expect(text.parts.length).toBeGreaterThan(0)
    text.parts.forEach(expectAvailableText)
  }
}

const expectAvailableValue = (value: EnergymapBuildingInfoValue) => {
  expect(isEnergymapBuildingInfoValueAvailable(value)).toBe(true)
  expect(['real', 'estimate']).toContain(value.status)
  expectAvailableText(value.text)
  if (value.note != null) expectAvailableText(value.note)
}

const expectAvailableSection = (section: EnergymapBuildingInfoSection) => {
  if (section.title != null) expectAvailableText(section.title)
  if (section.description != null) expectAvailableText(section.description)

  const collections = [section.rows, section.metrics, section.scenarios]
  for (const collection of collections) {
    if (collection != null) expect(collection.length).toBeGreaterThan(0)
  }

  for (const row of section.rows ?? []) {
    expectAvailableText(row.label)
    expectAvailableValue(row)
  }

  for (const metric of section.metrics ?? []) {
    expectAvailableText(metric.label)
    expect(metric.values.length).toBeGreaterThan(0)
    for (const value of metric.values) {
      expectAvailableText(value.label)
      expectAvailableValue(value)
    }
  }

  for (const scenario of section.scenarios ?? []) {
    expectAvailableText(scenario.label)
    expect(scenario.values.length).toBeGreaterThan(0)
    for (const value of scenario.values) {
      expectAvailableText(value.label)
      expectAvailableValue(value)
    }
  }

  for (const item of section.notes ?? []) {
    expect(['real', 'estimate']).toContain(item.status)
    expectAvailableText(item.text)
  }

  const controls = section.consumptionControls
  if (controls != null) {
    expect(controls.primaryMetrics.length).toBeGreaterThan(0)
    expect(
      controls.primaryMetrics.some(
        (metric) => metric.id === controls.defaultPrimaryMetricId
      )
    ).toBe(true)
    expect(controls.primaryMetrics.every((metric) => metric.supported)).toBe(
      true
    )
    for (const metric of controls.primaryMetrics) {
      expectAvailableText(metric.label)
      if (metric.id === 'energy') {
        expect(controls.energySubmetrics?.length).toBeGreaterThan(0)
      } else {
        expect(metric.value).toBeDefined()
        expectAvailableValue(metric.value as EnergymapBuildingInfoValue)
      }
      expect(metric.unavailableNote).toBeUndefined()
      if (metric.residentCountControl != null) {
        expect(metric.id).toBe('water')
        expectAvailableText(metric.residentCountControl.label)
        expectAvailableText(metric.residentCountControl.toggleLabel)
        expectAvailableText(metric.residentCountControl.description)
        expectAvailableText(metric.residentCountControl.unavailableText)
      }
    }

    if (controls.energySubmetrics != null) {
      expect(controls.energySubmetrics.length).toBeGreaterThan(0)
      expect(controls.defaultEnergySubmetricIds?.length).toBeGreaterThan(0)
      const defaultIds = new Set(controls.defaultEnergySubmetricIds)
      for (const submetric of controls.energySubmetrics) {
        expect(submetric.supported).toBe(true)
        expect(submetric.defaultSelected).toBe(defaultIds.has(submetric.id))
        expect(submetric.unavailableNote).toBeUndefined()
        expect(submetric.metric.values.length).toBeGreaterThan(0)
        submetric.metric.values.forEach(expectAvailableValue)
      }
      expect(
        getSelectedEnergyConsumption({
          controls,
          selectedSubmetricIds: controls.defaultEnergySubmetricIds ?? [],
        }).values.length
      ).toBeGreaterThan(0)
    } else {
      expect(controls.defaultEnergySubmetricIds).toBeUndefined()
      expect(controls.combinedEnergyMetric).toBeUndefined()
    }

    if (controls.combinedEnergyMetric != null) {
      expect(controls.combinedEnergyMetric.values.length).toBeGreaterThan(0)
      controls.combinedEnergyMetric.values.forEach(expectAvailableValue)
    }
    expect(controls.emptyEnergyMetric).toBeUndefined()
  }

  expect(
    (section.rows?.length ?? 0) +
      (section.metrics?.length ?? 0) +
      (section.scenarios?.length ?? 0) +
      (section.consumptionControls == null ? 0 : 1)
  ).toBeGreaterThan(0)
}

const expectAvailableGraph = (panels: EnergymapBuildingInfoPanel[]) => {
  for (const panel of panels) {
    expectAvailableText(panel.title)
    if (panel.description != null) expectAvailableText(panel.description)
    expect(panel.sections.length).toBeGreaterThan(0)
    panel.sections.forEach(expectAvailableSection)
  }
}

describe('Energiakartta building info availability model', () => {
  it('distinguishes no selection from a selected building with no content', () => {
    expect(
      createEnergymapBuildingInfoPanels({
        selectedBuilding: null,
        locale: 'en-US',
      })
    ).toBeNull()

    expect(
      createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({ building_key: 'empty' }),
        locale: 'en-US',
      })
    ).toEqual([])
  })

  it('uses one status-and-structured-text availability contract', () => {
    const value = (
      status: EnergymapBuildingInfoValue['status'],
      text = plain('0')
    ) => ({ status, text })

    expect(isEnergymapBuildingInfoValueAvailable(value('real'))).toBe(true)
    expect(isEnergymapBuildingInfoValueAvailable(value('estimate'))).toBe(true)
    expect(isEnergymapBuildingInfoValueAvailable(value('missing'))).toBe(false)
    expect(isEnergymapBuildingInfoValueAvailable(value('placeholder'))).toBe(
      false
    )
    expect(
      isEnergymapBuildingInfoValueAvailable(value('real', plain(' \n\t ')))
    ).toBe(false)
    expect(
      isEnergymapBuildingInfoValueAvailable(value('real', translation('  ')))
    ).toBe(false)
    expect(
      isEnergymapBuildingInfoValueAvailable({
        status: 'estimate',
        text: {
          type: 'sequence',
          separator: ' / ',
          parts: [plain(' '), translation('')],
        },
      })
    ).toBe(false)
    expect(isEnergymapBuildingInfoValueAvailable(null)).toBe(false)
    expect(isEnergymapBuildingInfoValueAvailable(undefined)).toBe(false)
  })

  it('normalizes sequences recursively without rewriting surviving source text', () => {
    const sourceText = plain('  literal source prose  ')
    const translatedText = translation('valid.key')
    const normalized = normalizeEnergymapBuildingInfoText({
      type: 'sequence',
      separator: ' | ',
      parts: [
        plain('  '),
        sourceText,
        {
          type: 'sequence',
          separator: ', ',
          parts: [translation('\t'), translatedText],
        },
      ],
    })

    expect(normalized).toEqual({
      type: 'sequence',
      separator: ' | ',
      parts: [
        sourceText,
        { type: 'sequence', separator: ', ', parts: [translatedText] },
      ],
    })
    expect(normalizeEnergymapBuildingInfoText(plain(''))).toBeNull()
    expect(normalizeEnergymapBuildingInfoText(null)).toBeNull()
  })

  it('recursively returns only available content for a complete building', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: completeBuilding,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]

    expect(panels.map((panel) => panel.id)).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    expectAvailableGraph(panels)

    const rowIds = panels.flatMap((panel) =>
      panel.sections.flatMap((section) =>
        (section.rows ?? []).map(({ id }) => id)
      )
    )
    for (const unsupportedRowId of [
      'renovationRecommendations',
      'energyRecommendations',
      'energyClassMeasures',
      'plannedMeasures',
      'plotTenure',
      'residentCount',
      'waterHeatingSplit',
    ]) {
      expect(rowIds).not.toContain(unsupportedRowId)
    }
    expect(
      panels.flatMap((panel) => getMetrics(panel).map(({ id }) => id))
    ).not.toContain('waterHeating')
    expect(
      getControls(getPanel(panels, 'energyConsumption')).energySubmetrics?.map(
        ({ id }) => id
      )
    ).not.toContain('waterHeating')

    const serialized = JSON.stringify(panels)
    expect(serialized).not.toContain('"status":"missing"')
    expect(serialized).not.toContain('"status":"placeholder"')
  })

  it('preserves real building identity, formatting, language, and strict modeled evidence', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        ...completeBuilding.properties,
        energy_class: 'C',
        is_energy_class_modeled: true,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const building = getPanel(panels, 'buildingDetails')

    expect(building.sections.map((section) => section.id)).toEqual([
      'buildingSubheader',
      'identity',
      'energyCertificate',
      'previousEnergyClass',
      'technicalDetails',
    ])
    expectPlainText(
      getRow(building, 'address').text,
      'Mikkolantie 34a, 00640 HELSINKI'
    )
    expect(getRow(building, 'address').sourceProperties).toEqual([
      'address_fin',
      'postal_code',
      'postal_office_fin',
    ])
    expectPlainText(getRow(building, 'constructionYear').text, '1967')
    expectTranslation(
      getRow(building, 'buildingType').text,
      `${translationPrefix}.codes.main_purpose.05`
    )
    expectPlainText(getRow(building, 'heatedNetArea').text, '1,355')
    expect(getRow(building, 'heatedNetArea').unitKey).toBe(
      `${translationPrefix}.units.square_meters`
    )

    const ventilation = getRow(building, 'ventilation')
    expectPlainText(ventilation.text, 'Painovoimainen ilmanvaihto.')
    expect(ventilation.sourceLanguage).toBe('fi')
    expect(ventilation.sourceProperties).toEqual([
      'energy_certificate_ventilation_description_fi',
    ])

    const energyClass = getRow(building, 'energyClass')
    expectPlainText(energyClass.text, 'C')
    expect(energyClass.sourceProperties).toEqual([
      'energy_class',
      'is_energy_class_modeled',
      'main_purpose',
      'completion_date',
      'heating_energy_source',
    ])
    const modeledIndicator = energyClass.modeledIndicator
    expect(modeledIndicator).toBeDefined()
    if (modeledIndicator == null) {
      throw new Error('Expected modeled energy-class evidence')
    }
    expectTranslation(
      modeledIndicator.label,
      `${translationPrefix}.panels.building.energy_class_modeled.label`
    )
    expectTranslation(
      modeledIndicator.tooltip,
      `${translationPrefix}.panels.building.energy_class_modeled.tooltip`
    )
    expect(modeledIndicator.sourceProperties).toEqual([
      'is_energy_class_modeled',
      'main_purpose',
      'completion_date',
      'heating_energy_source',
    ])
    expect(modeledIndicator.ariaLabelKey).toBe(
      `${translationPrefix}.panels.building.energy_class_modeled.help_aria_label`
    )
    expect(modeledIndicator.provenance).toEqual({
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_MODELED,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_BUILDING_TYPE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_COMPLETION_DATE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_HEATING_SOURCE,
      ],
    })
  })

  it.each([
    {
      state: 'literal false',
      originProperties: { is_energy_class_modeled: false },
      sourceProperties: ['energy_class', 'is_energy_class_modeled'],
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_OFFICIAL,
    },
    {
      state: 'absent',
      originProperties: {},
      sourceProperties: ['energy_class'],
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
    },
    ...([undefined, null, 'true', 1, 0] as const).map((modeled) => ({
      state: `present ${String(modeled)}`,
      originProperties: { is_energy_class_modeled: modeled },
      sourceProperties: ['energy_class', 'is_energy_class_modeled'],
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
    })),
  ])(
    'keeps the ordinary class label and omits modeled help when origin is $state',
    ({ state, originProperties, sourceProperties, provenanceId }) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `modeled-${state}`,
          energy_class: 'B',
          ...originProperties,
        }),
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const energyClass = getRow(
        getPanel(panels, 'buildingDetails'),
        'energyClass'
      )

      expectTranslation(
        energyClass.label,
        `${translationPrefix}.panels.building.rows.energy_class`
      )
      expect(energyClass.modeledIndicator).toBeUndefined()
      expect(energyClass.sourceProperties).toEqual(sourceProperties)
      expect(energyClass.provenance?.id).toBe(provenanceId)
    }
  )

  it('does not let modeled evidence keep a missing class or infer a fallback class', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'modeled-without-effective-class',
        energy_certificate_class: 'A',
        is_energy_class_modeled: true,
      }),
      locale: 'en-US',
    })

    expect(panels).toEqual([])
  })

  it('keeps unknown source codes as real values', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'unknown-building-code',
        main_purpose: '98',
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const buildingType = getRow(
      getPanel(panels, 'buildingDetails'),
      'buildingType'
    )

    expect(buildingType.status).toBe('real')
    expectTranslation(
      buildingType.text,
      `${translationPrefix}.placeholders.unknown_code`,
      { code: '98' }
    )
    expect(buildingType.sourceProperties).toEqual(['main_purpose'])
  })

  it('falls back to a nonblank source language and preserves literal prose', () => {
    const sourceProse =
      'Ensimmäinen kappale säilyy.\n\n<script>ei HTML:ää</script> **ei Markdownia**'
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'source-language-fallback',
        energy_certificate_recommendations_fi: ' \n ',
        energy_certificate_recommendations_sv: `  ${sourceProse}  `,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const recommendation = getRow(
      getPanel(panels, 'renovationRecommendations'),
      'energyCertificateRecommendations'
    )

    expect(recommendation.status).toBe('real')
    expect(recommendation.presentation).toBe('expandableSourceText')
    expect(recommendation.sourceLanguage).toBe('sv')
    expect(recommendation.sourceProperties).toEqual([
      'energy_certificate_recommendations_sv',
    ])
    expectPlainText(recommendation.text, sourceProse)
  })

  it('preserves complete energy estimate and calculation metadata', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: districtHeatingBuilding,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const energy = getPanel(panels, 'energyConsumption')
    const total = getMetric(energy, 'total')
    const annual = getMetricValue(total, 'annualTotal')
    const intensity = getMetricValue(total, 'perSquareMeter')

    expect(annual.status).toBe('estimate')
    expectPlainText(annual.text, '166,976')
    expect(annual.unitKey).toBe(`${translationPrefix}.units.kwh_per_year`)
    expect(annual.sourceProperties).toEqual([
      'distr_default_total',
      'floor_area',
    ])
    expect(annual.note).toMatchObject({
      type: 'translation',
      keyName: `${translationPrefix}.panels.energy.note.estimated`,
    })
    expectPlainText(intensity.text, '367.8')
    expect(intensity.sourceProperties).toEqual(['distr_default_total'])
    expect(intensity.unitKey).toBe(
      `${translationPrefix}.units.kwh_per_square_meter_year`
    )
  })

  it('keeps numeric zero as an available formatted estimate', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'zero-estimates',
        main_purpose: '05',
        heating_method: '01',
        heating_energy_source: '01',
        floor_area: 100,
        distr_default_total: 0,
        distr_default_heat: 0,
        distr_default_elec: 0,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const total = getMetric(getPanel(panels, 'energyConsumption'), 'total')

    expectPlainText(getMetricValue(total, 'annualTotal').text, '0')
    expectPlainText(getMetricValue(total, 'perSquareMeter').text, '0')
    expectAvailableGraph(panels)
  })

  it.each([
    ['an empty string', 'distr_default_total', 'total', ''],
    ['a whitespace-only string', 'distr_default_heat', 'heating', ' \t\n '],
    ['null', 'distr_default_elec', 'electricity', null],
  ] as const)(
    'does not coerce %s numeric estimate input to zero',
    (_caseName, propertyName, metricId, input) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          ...districtHeatingProperties,
          building_key: `blank-numeric-${metricId}`,
          [propertyName]: input,
        }),
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const energy = getPanel(panels, 'energyConsumption')

      expect(getMetrics(energy).map(({ id }) => id)).not.toContain(metricId)
      expectAvailableGraph(panels)
    }
  )

  it('normalizes complete controls, defaults, estimates, and resident input metadata', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: districtHeatingBuilding,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const energy = getPanel(panels, 'energyConsumption')
    const controls = getControls(energy)

    expect(controls.defaultPrimaryMetricId).toBe('energy')
    expect(controls.primaryMetrics.map((metric) => metric.id)).toEqual([
      'energy',
      'water',
      'cost',
      'co2',
    ])
    expect(controls.energySubmetrics?.map((metric) => metric.id)).toEqual([
      'electricity',
      'heating',
    ])
    expect(controls.defaultEnergySubmetricIds).toEqual([
      'electricity',
      'heating',
    ])
    expect(controls.emptyEnergyMetric).toBeUndefined()

    const water = getPrimaryMetric(controls, 'water')
    expectPlainText(water.value?.text as EnergymapBuildingInfoText, '481.8')
    expect(water.value?.unitKey).toBe(
      `${translationPrefix}.units.cubic_meters_per_year`
    )
    expect(water.value?.sourceProperties).toEqual(['floor_area'])
    expect(water.residentCountControl).toMatchObject({
      defaultValue: 11,
      minValue: 1,
      maxValue: 10000,
    })

    const cost = getPrimaryMetric(controls, 'cost')
    expectPlainText(cost.value?.text as EnergymapBuildingInfoText, '19,613')
    expect(cost.value?.unitKey).toBe(`${translationPrefix}.units.eur_per_year`)
    expect(cost.value?.sourceProperties).toEqual([
      'main_purpose',
      'floor_area',
      'distr_default_elec',
      'distr_default_heat',
      'heating_energy_source',
    ])

    const co2 = getPrimaryMetric(controls, 'co2')
    expectPlainText(co2.value?.text as EnergymapBuildingInfoText, '18,436')
    expect(co2.value?.unitKey).toBe(
      `${translationPrefix}.units.kg_co2_per_year`
    )
    expect(
      getSection(energy, 'calculationContext').rows?.map(({ id }) => id)
    ).toEqual(['costMode', 'co2Mode'])
  })

  it('retains only Water and makes it the default when it is the sole output', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'water-only',
        floor_area: 100,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]

    expect(panels.map((panel) => panel.id)).toEqual(['energyConsumption'])
    const energy = getPanel(panels, 'energyConsumption')
    const controls = getControls(energy)
    expect(controls.primaryMetrics.map(({ id }) => id)).toEqual(['water'])
    expect(controls.defaultPrimaryMetricId).toBe('water')
    expect(controls.energySubmetrics).toBeUndefined()
    expect(controls.defaultEnergySubmetricIds).toBeUndefined()
    expect(controls.combinedEnergyMetric).toBeUndefined()
    expect(findSection(energy, 'calculationContext')).toBeUndefined()
    expect(getSection(energy, 'estimatedConsumption').notes).toBeUndefined()
    expect(
      getPrimaryMetric(controls, 'water').residentCountControl
    ).toBeDefined()
    expectAvailableGraph(panels)
  })

  it('prunes unavailable submetrics and recomputes their defaults', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        ...districtHeatingProperties,
        building_key: 'heating-only',
        distr_default_elec: undefined,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const controls = getControls(getPanel(panels, 'energyConsumption'))

    expect(controls.energySubmetrics?.map(({ id }) => id)).toEqual(['heating'])
    expect(controls.defaultEnergySubmetricIds).toEqual(['heating'])
    expect(controls.energySubmetrics?.[0].defaultSelected).toBe(true)
    expect(controls.combinedEnergyMetric).toBeUndefined()
    expect(controls.primaryMetrics.map(({ id }) => id)).toEqual([
      'energy',
      'water',
    ])
    expectAvailableGraph(panels)
  })

  it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'removes Water and its resident control for invalid floor area %p',
    (floorArea) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          ...districtHeatingProperties,
          building_key: `invalid-water-${String(floorArea)}`,
          floor_area: floorArea,
        }),
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const controls = getControls(getPanel(panels, 'energyConsumption'))

      expect(controls.primaryMetrics.map(({ id }) => id)).not.toContain('water')
      expect(
        controls.primaryMetrics.some(
          (metric) => metric.residentCountControl != null
        )
      ).toBe(false)
      expectAvailableGraph(panels)
    }
  )

  it('omits controls when no primary choice can produce output', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'total-only',
        heating_method: '01',
        heating_energy_source: '01',
        distr_default_total: 10,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const estimated = getSection(
      getPanel(panels, 'energyConsumption'),
      'estimatedConsumption'
    )

    expect(estimated.consumptionControls).toBeUndefined()
    expect(estimated.metrics?.map(({ id }) => id)).toEqual(['total'])
    expect(estimated.metrics?.[0].values.map(({ id }) => id)).toEqual([
      'perSquareMeter',
    ])
    expectAvailableGraph(panels)
  })

  it('derives selected energy output without absent choices or fallback placeholders', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: districtHeatingBuilding,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const controls = getControls(getPanel(panels, 'energyConsumption'))
    const annualText = (
      ids: EnergymapBuildingInfoEnergySubmetricId[]
    ): EnergymapBuildingInfoText | undefined =>
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: ids,
      }).values.find(({ id }) => id === 'annualTotal')?.text

    expectPlainText(
      annualText(['electricity']) as EnergymapBuildingInfoText,
      '10,953'
    )
    expectPlainText(
      annualText(['heating']) as EnergymapBuildingInfoText,
      '156,023'
    )
    expectPlainText(
      annualText(['heating', 'electricity']) as EnergymapBuildingInfoText,
      '166,976'
    )

    const staleSelection = getSelectedEnergyConsumption({
      controls,
      selectedSubmetricIds: ['waterHeating', 'electricity'],
    })
    expectPlainText(
      staleSelection.values.find(({ id }) => id === 'annualTotal')
        ?.text as EnergymapBuildingInfoText,
      '10,953'
    )
    expect(staleSelection.notes).toEqual([])
    expect(
      getSelectedEnergyConsumption({ controls, selectedSubmetricIds: [] })
    ).toEqual({ values: [], notes: [] })
  })

  it('does not fabricate combined output when the retained total is absent', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        ...districtHeatingProperties,
        building_key: 'submetrics-without-combined-total',
        distr_default_total: undefined,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const controls = getControls(getPanel(panels, 'energyConsumption'))
    const electricity = controls.energySubmetrics?.find(
      ({ id }) => id === 'electricity'
    )
    const heating = controls.energySubmetrics?.find(
      ({ id }) => id === 'heating'
    )

    expect(controls.combinedEnergyMetric).toBeUndefined()
    expect(controls.defaultEnergySubmetricIds).toEqual(['electricity'])
    expect(
      controls.energySubmetrics?.map(({ id, defaultSelected }) => ({
        id,
        defaultSelected,
      }))
    ).toEqual([
      { id: 'electricity', defaultSelected: true },
      { id: 'heating', defaultSelected: false },
    ])
    expect(
      normalizeEnergySubmetricSelection({
        controls,
        selectedSubmetricIds: ['electricity', 'heating'],
      })
    ).toEqual(['electricity'])
    expect(
      normalizeEnergySubmetricSelection({
        controls,
        selectedSubmetricIds: ['heating', 'electricity'],
      })
    ).toEqual(['heating'])
    expect(
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: ['electricity', 'heating'],
      }).values
    ).toEqual(electricity?.metric.values)
    expect(
      getSelectedEnergyConsumption({
        controls,
        selectedSubmetricIds: ['heating', 'electricity'],
      }).values
    ).toEqual(heating?.metric.values)
  })

  it('gates Cost and CO2 context rows independently', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        ...districtHeatingProperties,
        building_key: 'unsupported-cost-class',
        main_purpose: '07',
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const energy = getPanel(panels, 'energyConsumption')
    const controls = getControls(energy)

    expect(controls.primaryMetrics.map(({ id }) => id)).toEqual([
      'energy',
      'water',
      'co2',
    ])
    expect(findRow(energy, 'costMode')).toBeUndefined()
    expect(getRow(energy, 'co2Mode').status).toBe('estimate')
    expect(
      getSection(energy, 'calculationContext').rows?.map(({ id }) => id)
    ).toEqual(['co2Mode'])
  })

  it.each([
    ['missing electricity', { distr_default_elec: undefined }],
    ['missing heating', { distr_default_heat: undefined }],
    ['missing area', { floor_area: undefined }],
    ['negative heating', { distr_default_heat: -1 }],
    ['invalid electricity type', { distr_default_elec: '24.125' }],
    ['non-finite area', { floor_area: Number.NaN }],
    ['infinite heating', { distr_default_heat: Number.POSITIVE_INFINITY }],
  ])(
    'removes unsupported current-reference outputs for %s',
    (_name, overrides) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          ...districtHeatingProperties,
          ...overrides,
          building_key: `invalid-${_name}`,
        }),
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const energy = getPanel(panels, 'energyConsumption')
      const controls = getControls(energy)

      expect(controls.primaryMetrics.map(({ id }) => id)).not.toContain('cost')
      expect(controls.primaryMetrics.map(({ id }) => id)).not.toContain('co2')
      expect(findRow(energy, 'costMode')).toBeUndefined()
      expect(findRow(energy, 'co2Mode')).toBeUndefined()
      expect(findSection(energy, 'calculationContext')).toBeUndefined()
      expectAvailableGraph(panels)
    }
  )

  it('keeps partial metrics and scenarios while pruning unavailable siblings', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        ...districtHeatingProperties,
        building_key: 'partial-without-area',
        floor_area: undefined,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const energy = getPanel(panels, 'energyConsumption')
    const renovation = getPanel(panels, 'renovationRecommendations')

    expect(getMetric(energy, 'total').values.map(({ id }) => id)).toEqual([
      'perSquareMeter',
    ])
    expect(getScenario(renovation, 'aahp').values.map(({ id }) => id)).toEqual([
      'perSquareMeter',
      'savingsPercent',
    ])
    expect(findSection(renovation, 'publishedRecommendations')).toBeUndefined()
    expectAvailableGraph(panels)
  })

  it('removes an entirely unpublished scenario but retains published siblings', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'geothermal',
        heating_method: '01',
        heating_energy_source: '09',
        floor_area: 262,
        gshp_default_total: 155.8557692,
        gshp_default_heat: 128.1442307,
        gshp_default_elec: 27.71153846,
        gshp_solar_total: 132.6634615,
        gshp_windows_total: 147.2788462,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const renovation = getPanel(panels, 'renovationRecommendations')
    const scenarios = getSection(renovation, 'scenarioComparison').scenarios

    expect(scenarios?.map(({ id }) => id)).toEqual(['solar', 'windows'])
    expectAvailableGraph(panels)
  })

  it('drops empty sections and panels without orphaning their copy', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'address-only',
        address_fin: 'Testitie 1',
        energy_certificate_recommendations_fi: '  ',
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]

    expect(panels.map(({ id }) => id)).toEqual(['buildingDetails'])
    const building = getPanel(panels, 'buildingDetails')
    expect(building.sections.map(({ id }) => id)).toEqual(['buildingSubheader'])
    expect(building.sections[0].rows?.map(({ id }) => id)).toEqual(['address'])
    expectAvailableGraph(panels)
  })

  describe('registry location property identifier', () => {
    it.each(['fi', 'en'])('preserves valid opaque strings in %s', (locale) => {
      for (const value of [
        '09102000040003',
        '26044100030032',
        '00000000000001',
      ]) {
        const properties = Object.freeze({
          building_key: '213215b0-b333-4275-9400-9bcb087aba8d',
          permanent_building_identifier: '101614422K',
          address_fin: 'Testitie 1',
          property_identifier: value,
        })
        const panels = createEnergymapBuildingInfoPanels({
          selectedBuilding: createSelectedBuilding(properties),
          locale,
        }) as EnergymapBuildingInfoPanel[]
        const building = getPanel(panels, 'buildingDetails')
        expect(
          getSection(building, 'identity').rows?.map(({ id }) => id)
        ).toEqual(['buildingIdentifier', 'propertyIdentifier'])
        expect(getRow(building, 'propertyIdentifier')).toEqual({
          id: 'propertyIdentifier',
          label: translation(
            'sidebar.building_info.panels.building.rows.property_identifier'
          ),
          status: 'real',
          text: plain(value),
          sourceProperties: ['property_identifier'],
          provenance: {
            id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.PROPERTY_IDENTIFIER,
            inputIds: [
              ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_PROPERTY_IDENTIFIER,
            ],
          },
        })
        expectPlainText(getRow(building, 'buildingIdentifier').text, '101614422K')
        expect(properties.property_identifier).toBe(value)
        expectAvailableGraph(panels)
      }
    })

    it.each(
      [
        undefined,
        null,
        '',
        '   ',
        '00000000000000',
        9102000040003,
        true,
        ['09102000040003'],
        { value: '09102000040003' },
        '0910200004000',
        '091020000400030',
        '091-416-0011-0023',
        '0910200004000a',
        '091020000400.3',
        '+9102000040003',
        '9.102000040e12',
        '０９１０２００００４０００３',
        ' 09102000040003',
        '09102000040003 ',
        '09102000040003\n',
      ].map((value) => [value])
    )('omits invalid value %p without hiding other facts', (value) => {
      const properties = {
        building_key: 'invalid-property',
        property_identifier: value,
      }
      expect(
        createEnergymapBuildingInfoPanels({
          selectedBuilding: createSelectedBuilding(properties),
          locale: 'en',
        })
      ).toEqual([])
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          ...properties,
          permanent_building_identifier: '101614422K',
          address_fin: 'Testitie 1',
        }),
        locale: 'fi',
      }) as EnergymapBuildingInfoPanel[]
      expect(
        getRows(getPanel(panels, 'buildingDetails')).map(({ id }) => id)
      ).toEqual(['address', 'buildingIdentifier'])
      expectAvailableGraph(panels)
    })

    it('does not infer a property identifier from other identifiers', () => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: '09102000040003',
          permanent_building_identifier: '09102000040003',
          address_fin: '09102000040003',
          parcel_identifier: '09102000040003',
        }),
        locale: 'en',
      }) as EnergymapBuildingInfoPanel[]
      expect(
        findRow(getPanel(panels, 'buildingDetails'), 'propertyIdentifier')
      ).toBeUndefined()
    })

    it('supports property-only identity and rederives each selected building', () => {
      for (const [building_key, property_identifier] of [
        ['a', '09102000040003'],
        ['b', undefined],
        ['b', '00000000000000'],
        ['c', '26044100030032'],
        ['a', '09102000040003'],
      ]) {
        const panels = createEnergymapBuildingInfoPanels({
          selectedBuilding: createSelectedBuilding({
            building_key,
            property_identifier,
          }),
          locale: 'fi',
        }) as EnergymapBuildingInfoPanel[]
        if (building_key === 'b') {
          expect(panels).toEqual([])
        } else {
          expect(panels.map(({ id }) => id)).toEqual(['buildingDetails'])
          expect(panels[0].sections.map(({ id }) => id)).toEqual(['identity'])
          expect(panels[0].sections[0].rows?.map(({ id }) => id)).toEqual([
            'propertyIdentifier',
          ])
          expect(getRow(panels[0], 'propertyIdentifier').text).toEqual(
            plain(property_identifier!)
          )
        }
      }
      expect(
        createEnergymapBuildingInfoPanels({
          selectedBuilding: null,
          locale: 'en',
        })
      ).toBeNull()
    })
  })

  it('ignores raw properties for deliberately unsupported fields', () => {
    const properties = {
      building_key: 'unsupported-raw-fields',
      renovation_recommendations: 'raw renovation recommendation',
      energy_recommendations: 'raw energy recommendation',
      energy_class_measures: 'raw class measures',
      planned_measures: 'raw planned measures',
      plot_tenure: 'owned',
      resident_count: 4,
      water_heating_split: 0.2,
      water_heating: 10,
    }
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding(properties),
      locale: 'en-US',
    })

    expect(panels).toEqual([])
    expect(JSON.stringify(panels)).not.toContain('raw planned measures')
  })

  it('drops whitespace-only values but preserves supported alternate fields', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'blank-values',
        permanent_building_identifier: ' \n\t ',
        address_fin: '  ',
        postal_code: '00640',
        postal_office_fin: '  HELSINKI  ',
        energy_certificate_ventilation_description_fi: '\t',
        energy_certificate_ventilation_description_sv: '  Självdrag  ',
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const building = getPanel(panels, 'buildingDetails')

    expect(findRow(building, 'buildingIdentifier')).toBeUndefined()
    expectPlainText(getRow(building, 'address').text, '00640 HELSINKI')
    const ventilation = getRow(building, 'ventilation')
    expectPlainText(ventilation.text, 'Självdrag')
    expect(ventilation.sourceLanguage).toBe('sv')
    expectAvailableGraph(panels)
  })

  it('formats dates and addresses without changing their source contracts', () => {
    expect(formatYearFromDate('1967-01-01')).toBe('1967')
    expect(formatYearFromDate('2023-08-29T00:00:00Z')).toBe('2023')
    expect(formatYearFromDate('not a date')).toBeNull()
    expect(
      formatCalendarDate({ value: '2031-12-31 00:00:00.0', locale: 'en-US' })
    ).toBe('12/31/2031')
    expect(
      formatCalendarDate({ value: '2023-02-29', locale: 'en-US' })
    ).toBeNull()
    expect(
      composeEnergymapBuildingAddress(districtHeatingBuilding.properties)
    ).toBe('Mikkolantie 34a, 00640 HELSINKI')
  })

  it('formats a fractional certificate heated net area with locale rounding', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'fractional-heated-net-area',
        energy_certificate_heated_net_area: '1234.56',
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const heatedNetArea = getRow(
      getPanel(panels, 'buildingDetails'),
      'heatedNetArea'
    )

    expect(heatedNetArea.status).toBe('real')
    expectPlainText(heatedNetArea.text, '1,234.6')
    expect(heatedNetArea.unitKey).toBe(
      `${translationPrefix}.units.square_meters`
    )
    expect(heatedNetArea.sourceProperties).toEqual([
      'energy_certificate_heated_net_area',
    ])
  })

  it.each([
    ['en-US', '2031-12-31 00:00:00.0', '12/31/2031'],
    ['fi-FI', '2031-12-31T00:00:00', '31.12.2031'],
  ])(
    'formats certificate validity as a timezone-stable calendar date for %s',
    (locale, sourceValue, expectedDate) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `certificate-validity-${locale}-${sourceValue}`,
          energy_certificate_valid_until: sourceValue,
        }),
        locale,
      }) as EnergymapBuildingInfoPanel[]
      const validity = getRow(
        getPanel(panels, 'buildingDetails'),
        'energyCertificateValidity'
      )

      expect(validity.status).toBe('real')
      expectPlainText(validity.text, expectedDate)
      expect(validity.sourceProperties).toEqual([
        'energy_certificate_valid_until',
      ])
    }
  )

  it('preserves a DST-boundary calendar date west of UTC', () => {
    const previousTimezone = process.env.TZ

    try {
      process.env.TZ = 'America/Los_Angeles'
      const result = JSON.parse(
        execFileSync(
          process.execPath,
          [
            '--import',
            'tsx',
            '--input-type=module',
            '--eval',
            `
              const buildingInfo = (
                await import('./src/applets/energy/common/buildingInfo.ts')
              ).default
              const localDate = new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
              }).format(new Date(Date.UTC(2025, 2, 9)))
              const validityDate = buildingInfo.formatCalendarDate({
                value: '2025-03-09 00:00:00.0',
                locale: 'en-US',
              })

              process.stdout.write(JSON.stringify({ localDate, validityDate }))
            `,
          ],
          {
            cwd: process.cwd(),
            encoding: 'utf8',
            env: process.env,
          }
        )
      )

      expect(result.localDate).toBe('3/8/2025')
      expect(result.validityDate).toBe('3/9/2025')
    } finally {
      if (previousTimezone == null) {
        delete process.env.TZ
      } else {
        process.env.TZ = previousTimezone
      }
    }
  })

  it.each([
    ['absent', {}],
    ['undefined', { energy_certificate_valid_until: undefined }],
    ['null', { energy_certificate_valid_until: null }],
    ['empty', { energy_certificate_valid_until: '' }],
    ['whitespace', { energy_certificate_valid_until: '   ' }],
    ['non-string', { energy_certificate_valid_until: 20311231 }],
    ['malformed separators', { energy_certificate_valid_until: '2031/12/31' }],
    [
      'malformed timestamp',
      { energy_certificate_valid_until: '2031-12-31 midnight' },
    ],
    [
      'invalid clock time',
      { energy_certificate_valid_until: '2031-12-31 99:99:99' },
    ],
    [
      'invalid clock minute',
      { energy_certificate_valid_until: '2031-12-31 23:60:00' },
    ],
    [
      'invalid clock second',
      { energy_certificate_valid_until: '2031-12-31 23:59:60' },
    ],
    [
      'invalid offset hour',
      { energy_certificate_valid_until: '2031-12-31T23:59:59+14:01' },
    ],
    [
      'invalid offset minute',
      { energy_certificate_valid_until: '2031-12-31T23:59:59+12:60' },
    ],
    ['non-leap day', { energy_certificate_valid_until: '2025-02-29' }],
    ['invalid month', { energy_certificate_valid_until: '2031-13-01' }],
    ['invalid day', { energy_certificate_valid_until: '2031-12-00' }],
  ])('omits %s certificate validity', (_caseName, validityProperties) => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: `certificate-validity-${_caseName}`,
        energy_class: 'D',
        ...validityProperties,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const building = getPanel(panels, 'buildingDetails')

    expect(findRow(building, 'energyCertificateValidity')).toBeUndefined()
    expect(
      getSection(building, 'energyCertificate').rows?.map(({ id }) => id)
    ).toEqual(['energyClass'])
  })

  it('does not infer certificate validity from other certificate or building dates', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'certificate-validity-no-fallback',
        energy_class: 'D',
        energy_certificate_class_year: 2018,
        energy_certificate_signed_at: '2021-12-31 00:00:00',
        completion_date: '1967-01-01',
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const building = getPanel(panels, 'buildingDetails')

    expect(findRow(building, 'energyCertificateValidity')).toBeUndefined()
    expect(getRow(building, 'energyClass').sourceProperties).toEqual([
      'energy_class',
    ])
  })

  it.each([
    ['standalone', undefined, 'B'],
    ['same as current', 'D', 'D'],
    ['different from current', 'D', 'F'],
  ])(
    'preserves a %s previous certificate class with exact provenance',
    (_caseName, currentClass, previousClass) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `previous-class-${_caseName}`,
          energy_class: currentClass,
          energy_certificate_previous_class: ` ${previousClass} `,
        }),
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const previousEnergyClass = getRow(
        getPanel(panels, 'buildingDetails'),
        'previousEnergyClass'
      )

      expect(previousEnergyClass.status).toBe('real')
      expectPlainText(previousEnergyClass.text, previousClass)
      expect(previousEnergyClass.sourceProperties).toEqual([
        'energy_certificate_previous_class',
      ])
    }
  )

  it.each([
    ['absent', {}],
    ['null', { energy_certificate_previous_class: null }],
    ['empty', { energy_certificate_previous_class: '' }],
    ['whitespace', { energy_certificate_previous_class: '   ' }],
  ])(
    'omits %s previous certificate history without falling back to the current class',
    (_caseName, previousClassProperties) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `previous-class-${_caseName}`,
          energy_class: 'D',
          ...previousClassProperties,
        }),
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const building = getPanel(panels, 'buildingDetails')

      expectPlainText(getRow(building, 'energyClass').text, 'D')
      expect(findRow(building, 'previousEnergyClass')).toBeUndefined()
      expect(findSection(building, 'previousEnergyClass')).toBeUndefined()
    }
  )

  it('composes heating from translation-backed code labels and exact evidence', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: districtHeatingBuilding,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const heating = getRow(getPanel(panels, 'buildingDetails'), 'heating')

    expect(heating.status).toBe('real')
    expect(heating.text).toEqual({
      type: 'sequence',
      separator: ', ',
      parts: [
        {
          type: 'translation',
          keyName: `${translationPrefix}.codes.heating_energy_source.01`,
        },
        {
          type: 'translation',
          keyName: `${translationPrefix}.codes.heating_method.01`,
        },
      ],
    })
    expect(heating.sourceProperties).toEqual([
      'heating_energy_source',
      'heating_method',
    ])
  })

  it.each([
    [
      'Finnish prefers Finnish',
      'fi-FI',
      {
        energy_certificate_ventilation_description_fi:
          '  Koneellinen ilmanvaihto  ',
        energy_certificate_ventilation_description_sv: 'Mekanisk ventilation',
      },
      'Koneellinen ilmanvaihto',
      'fi',
      'energy_certificate_ventilation_description_fi',
    ],
    [
      'Finnish falls back from blank Finnish to Swedish',
      'fi',
      {
        energy_certificate_ventilation_description_fi: ' \n ',
        energy_certificate_ventilation_description_sv:
          '  Mekanisk ventilation  ',
      },
      'Mekanisk ventilation',
      'sv',
      'energy_certificate_ventilation_description_sv',
    ],
    [
      'English presents Finnish as Finnish source text',
      'en-US',
      {
        energy_certificate_ventilation_description_fi:
          'Painovoimainen ilmanvaihto',
        energy_certificate_ventilation_description_sv: 'Självdragsventilation',
      },
      'Painovoimainen ilmanvaihto',
      'fi',
      'energy_certificate_ventilation_description_fi',
    ],
    [
      'English falls back to Swedish source text',
      'en',
      {
        energy_certificate_ventilation_description_sv:
          'Från- och tilluftsventilation',
      },
      'Från- och tilluftsventilation',
      'sv',
      'energy_certificate_ventilation_description_sv',
    ],
    [
      'long source prose is preserved',
      'en',
      {
        energy_certificate_ventilation_description_fi:
          '  Koneellinen tulo- ja poistoilmanvaihto lämmöntalteenotolla. Kuvaus sisältää pitkän teknisen selosteen, välimerkkejä sekä Unicode-merkkejä: ääkköset säilyvät muuttumattomina.  ',
      },
      'Koneellinen tulo- ja poistoilmanvaihto lämmöntalteenotolla. Kuvaus sisältää pitkän teknisen selosteen, välimerkkejä sekä Unicode-merkkejä: ääkköset säilyvät muuttumattomina.',
      'fi',
      'energy_certificate_ventilation_description_fi',
    ],
    [
      'HTML-like source text stays plain',
      'en',
      {
        energy_certificate_ventilation_description_fi:
          '  <strong data-injected="true">Painovoimainen</strong><script>alert("unsafe")</script>  ',
      },
      '<strong data-injected="true">Painovoimainen</strong><script>alert("unsafe")</script>',
      'fi',
      'energy_certificate_ventilation_description_fi',
    ],
  ] as const)(
    'selects one ventilation description with exact provenance: %s',
    (_caseName, locale, properties, text, sourceLanguage, sourceProperty) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `ventilation-${sourceLanguage}`,
          ...properties,
        }),
        locale,
      }) as EnergymapBuildingInfoPanel[]
      const ventilation = getRow(
        getPanel(panels, 'buildingDetails'),
        'ventilation'
      )

      expect(ventilation.status).toBe('real')
      expectPlainText(ventilation.text, text)
      expect(ventilation.sourceLanguage).toBe(sourceLanguage)
      expect(ventilation.sourceProperties).toEqual([sourceProperty])
    }
  )

  it.each([
    { caseName: 'all fields missing', properties: {}, hiddenText: undefined },
    {
      caseName: 'descriptions blank',
      properties: {
        energy_certificate_ventilation_description_fi: ' \n ',
        energy_certificate_ventilation_description_sv: '\t',
      },
      hiddenText: undefined,
    },
    {
      caseName: 'descriptions are not strings',
      properties: {
        energy_certificate_ventilation_description_fi: 42,
        energy_certificate_ventilation_description_sv: Number.POSITIVE_INFINITY,
      },
      hiddenText: undefined,
    },
    {
      caseName: 'only an unmapped type code exists',
      properties: { energy_certificate_ventilation_type_id: '03' },
      hiddenText: '03',
    },
  ])(
    'omits ventilation when $caseName',
    ({ caseName, properties, hiddenText }) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `ventilation-missing-${caseName}`,
          energy_class: 'D',
          ...properties,
        }),
        locale: 'fi',
      }) as EnergymapBuildingInfoPanel[]
      const building = getPanel(panels, 'buildingDetails')

      expect(findRow(building, 'ventilation')).toBeUndefined()
      if (hiddenText != null) {
        expect(JSON.stringify(panels)).not.toContain(hiddenText)
      }
    }
  )

  it.each([
    [
      'Finnish prefers Finnish',
      'fi-FI',
      {
        energy_certificate_recommendations_fi:
          '  Tiivistä yläpohjan lämmöneristystä.  ',
        energy_certificate_recommendations_sv:
          'Förbättra vindsbjälklagets värmeisolering.',
      },
      'Tiivistä yläpohjan lämmöneristystä.',
      'fi',
      'energy_certificate_recommendations_fi',
    ],
    [
      'English presents Finnish as Finnish source text',
      'en-US',
      {
        energy_certificate_recommendations_fi:
          'Uusi lämmöntalteenottojärjestelmä.',
        energy_certificate_recommendations_sv: 'Installera värmeåtervinning.',
      },
      'Uusi lämmöntalteenottojärjestelmä.',
      'fi',
      'energy_certificate_recommendations_fi',
    ],
    [
      'Finnish-only source text',
      'en',
      { energy_certificate_recommendations_fi: 'Vaihda ikkunat.' },
      'Vaihda ikkunat.',
      'fi',
      'energy_certificate_recommendations_fi',
    ],
    [
      'Swedish-only source text',
      'fi',
      { energy_certificate_recommendations_sv: 'Byt fönster.' },
      'Byt fönster.',
      'sv',
      'energy_certificate_recommendations_sv',
    ],
    [
      'blank Finnish falls back to Swedish',
      'fi',
      {
        energy_certificate_recommendations_fi: ' \n ',
        energy_certificate_recommendations_sv: '  Täta ytterdörrarna.  ',
      },
      'Täta ytterdörrarna.',
      'sv',
      'energy_certificate_recommendations_sv',
    ],
    [
      'paragraph breaks survive outer trimming',
      'en',
      {
        energy_certificate_recommendations_fi:
          '  Ensimmäinen pitkä suosituskappale säilyttää lähteen sanamuodon.\n\nToinen kappale sisältää lisätietoja ja ääkkösiä muuttumattomina.  ',
      },
      'Ensimmäinen pitkä suosituskappale säilyttää lähteen sanamuodon.\n\nToinen kappale sisältää lisätietoja ja ääkkösiä muuttumattomina.',
      'fi',
      'energy_certificate_recommendations_fi',
    ],
    [
      'HTML and Markdown-looking source stays plain',
      'en',
      {
        energy_certificate_recommendations_fi:
          '  <script>alert("unsafe")</script> **Ei Markdownia**  ',
      },
      '<script>alert("unsafe")</script> **Ei Markdownia**',
      'fi',
      'energy_certificate_recommendations_fi',
    ],
  ] as const)(
    'selects one certificate recommendation source with exact provenance: %s',
    (_caseName, locale, properties, text, sourceLanguage, sourceProperty) => {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: createSelectedBuilding({
          building_key: `certificate-recommendation-${sourceLanguage}`,
          ...properties,
        }),
        locale,
      }) as EnergymapBuildingInfoPanel[]
      const recommendation = getRow(
        getPanel(panels, 'renovationRecommendations'),
        'energyCertificateRecommendations'
      )

      expect(recommendation.status).toBe('real')
      expect(recommendation.presentation).toBe('expandableSourceText')
      expectPlainText(recommendation.text, text)
      expect(recommendation.sourceLanguage).toBe(sourceLanguage)
      expect(recommendation.sourceProperties).toEqual([sourceProperty])
    }
  )

  it.each([
    ['both fields missing', {}],
    [
      'both fields blank',
      {
        energy_certificate_recommendations_fi: ' \n ',
        energy_certificate_recommendations_sv: '\t',
      },
    ],
    [
      'both fields invalid',
      {
        energy_certificate_recommendations_fi: 42,
        energy_certificate_recommendations_sv: Number.POSITIVE_INFINITY,
      },
    ],
  ])('omits certificate recommendations when %s', (_caseName, properties) => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: `certificate-recommendation-${_caseName}`,
        energy_class: 'D',
        ...properties,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]

    expect(findPanel(panels, 'renovationRecommendations')).toBeUndefined()
    expect(
      findRow(
        getPanel(panels, 'buildingDetails'),
        'energyCertificateRecommendations'
      )
    ).toBeUndefined()
  })

  it('keeps apartment-pellet Cost complete-only while preserving scoped pellet CO2', () => {
    const apartmentPellet = createSelectedBuilding({
      building_key: 'apartment-pellet',
      main_purpose: '06',
      heating_method: '01',
      heating_energy_source: '07',
      floor_area: 100,
      wood_default_total: 30,
      wood_default_elec: 10,
      wood_default_heat: 20,
    })
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: apartmentPellet,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const energy = getPanel(panels, 'energyConsumption')
    const controls = getControls(energy)

    expect(controls.primaryMetrics.map(({ id }) => id)).toEqual([
      'energy',
      'water',
      'co2',
    ])
    expectPlainText(
      getPrimaryMetric(controls, 'co2').value
        ?.text as EnergymapBuildingInfoText,
      '45'
    )
    expect(getPrimaryMetric(controls, 'co2').value?.unitKey).toBe(
      `${translationPrefix}.units.kg_co2_per_year`
    )
    expect(findRow(energy, 'costMode')).toBeUndefined()
    expect(getRow(energy, 'co2Mode').status).toBe('estimate')

    const zeroHeatPanels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        ...apartmentPellet.properties,
        building_key: 'apartment-pellet-zero-heat',
        wood_default_heat: 0,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const zeroHeatEnergy = getPanel(zeroHeatPanels, 'energyConsumption')
    const zeroHeatControls = getControls(zeroHeatEnergy)
    const zeroHeatCost = getPrimaryMetric(zeroHeatControls, 'cost')

    expect(zeroHeatControls.primaryMetrics.map(({ id }) => id)).toContain(
      'cost'
    )
    expectPlainText(
      zeroHeatCost.value?.text as EnergymapBuildingInfoText,
      '263'
    )
    expect(zeroHeatCost.value?.provenance?.id).toBe(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL
    )
    expect(zeroHeatCost.value?.provenance?.inputIds).toContain(
      'referenceFactor.cost.apartmentBuilding.electricity'
    )
    expect(zeroHeatCost.value?.provenance?.inputIds).not.toContain(
      'referenceFactor.cost.apartmentBuilding.pellet'
    )
    expect(getRow(zeroHeatEnergy, 'costMode').provenance).toEqual({
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_MODE_CONTEXT,
      inputIds: zeroHeatCost.value?.provenance?.inputIds,
    })
  })

  it('keeps generated current-reference and building copy exact in both locales', () => {
    const enEnergy = enTranslations.sidebar.building_info.panels.energy
    const fiEnergy = fiTranslations.sidebar.building_info.panels.energy
    const enBuilding = enTranslations.sidebar.building_info.panels.building
    const fiBuilding = fiTranslations.sidebar.building_info.panels.building

    expect(enEnergy.context.cost_current_reference).toMatch(
      /Average current-reference estimate.*not a bill.*contract price.*market-price forecast/i
    )
    expect(fiEnergy.context.cost_current_reference).toMatch(
      /keskimääräinen arvio.*ei ole lasku.*sopimushinta.*markkinahinnasta/i
    )
    expect(enEnergy.context.co2_current_reference).toMatch(
      /not measured building emissions.*renewable energy.*Light fuel oil uses a fossil factor.*pellet factor is zero only within the supplied fossil-accounting boundary.*does not prove zero lifecycle or biogenic emissions/i
    )
    expect(fiEnergy.context.co2_current_reference).toMatch(
      /ei rakennuksen mitattuihin päästöihin.*uusiutuva energia.*Kevyen polttoöljyn kerroin on fossiilinen.*Pelletin kerroin on nolla vain toimitetun fossiililaskennan rajauksen sisällä.*elinkaaripäästöjä tai biogeenisiä päästöjä nollaksi/i
    )
    expect(enBuilding.rows.heated_net_area).toBe(
      'Heated net area on energy certificate'
    )
    expect(fiBuilding.rows.heated_net_area).toBe(
      'Energiatodistuksen lämmitetty nettoala'
    )
    expect(enBuilding.rows.energy_certificate_validity).toBe(
      'Latest energy certificate valid until'
    )
    expect(fiBuilding.rows.energy_certificate_validity).toBe(
      'Uusimman energiatodistuksen voimassaolo päättyy'
    )
    expect(enBuilding.energy_class_modeled).toEqual({
      label: 'modeled',
      tooltip:
        "The energy class is modeled from the building's available data. It is an estimate and less accurate than an official energy certificate.",
      help_aria_label: 'More information about the modeled energy class',
    })
    expect(fiBuilding.energy_class_modeled).toEqual({
      label: 'mallinnettu',
      tooltip:
        'Energialuokka on mallinnettu rakennuksen saatavilla olevien tietojen perusteella. Se on arvio eikä yhtä tarkka kuin virallinen energiatodistus.',
      help_aria_label: 'Lisätietoja mallinnetusta energialuokasta',
    })
    expect(
      `${enBuilding.rows.energy_class} (${enBuilding.energy_class_modeled.label})`
    ).toBe('Energy class (modeled)')
    expect(
      `${fiBuilding.rows.energy_class} (${fiBuilding.energy_class_modeled.label})`
    ).toBe('Energialuokka (mallinnettu)')
    expect(enTranslations.sidebar.building_info.units.square_meters).toBe('m²')
    expect(fiTranslations.sidebar.building_info.units.square_meters).toBe('m²')
  })

  it('preserves renovation calculation values and source metadata', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: districtHeatingBuilding,
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    const renovation = getPanel(panels, 'renovationRecommendations')
    const scenario = getScenario(renovation, 'aahp')
    const annualTotal = getMetricValue(
      { id: 'total', label: scenario.label, values: scenario.values },
      'annualTotal'
    )
    const perSquareMeter = getMetricValue(
      { id: 'total', label: scenario.label, values: scenario.values },
      'perSquareMeter'
    )
    const savingsPercent = getMetricValue(
      { id: 'total', label: scenario.label, values: scenario.values },
      'savingsPercent'
    )

    expect(renovation.sections.map(({ id }) => id)).toEqual([
      'scenarioComparison',
    ])
    expect(scenario.values.map(({ id }) => id)).toEqual([
      'annualTotal',
      'perSquareMeter',
      'savingsPercent',
    ])
    expect(annualTotal.status).toBe('estimate')
    expectPlainText(annualTotal.text, '131,525')
    expect(annualTotal.unitKey).toBe(`${translationPrefix}.units.kwh_per_year`)
    expect(annualTotal.sourceProperties).toEqual([
      'distr_aahp_total',
      'floor_area',
    ])
    expect(annualTotal.note).toMatchObject({
      type: 'translation',
      keyName: `${translationPrefix}.panels.energy.note.estimated`,
    })
    expectPlainText(perSquareMeter.text, '289.7')
    expect(perSquareMeter.unitKey).toBe(
      `${translationPrefix}.units.kwh_per_square_meter_year`
    )
    expect(perSquareMeter.sourceProperties).toEqual(['distr_aahp_total'])
    expectTranslation(
      savingsPercent.text,
      `${translationPrefix}.panels.renovation.savings_less`,
      { percent: '-21%' }
    )
    expect(savingsPercent.sourceProperties).toEqual([
      'distr_default_total',
      'distr_aahp_total',
    ])
    expectAvailableGraph(panels)
  })

  it('does not choose an arbitrary scenario for unsupported heating data', () => {
    expect(
      resolveCurrentEnergyScenarioPrefix({
        heatingEnergySource: '99',
        heatingMethod: '07',
      })
    ).toBeNull()

    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({
        building_key: 'unsupported-heating',
        heating_method: '07',
        heating_energy_source: '99',
        floor_area: 384,
      }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]

    const energy = getPanel(panels, 'energyConsumption')
    expect(getMetrics(energy)).toEqual([])
    expect(getControls(energy).primaryMetrics.map(({ id }) => id)).toEqual([
      'water',
    ])
    expect(findPanel(panels, 'renovationRecommendations')).toBeUndefined()
    expectAvailableGraph(panels)
  })
})

describe('energy certificate consumption fallback model', () => {
  const createCertificatePanels = ({
    properties,
    payload,
    locale = 'en-US',
  }: {
    properties: EnergymapSelectedBuilding['properties']
    payload?: Record<string, unknown>
    locale?: string
  }) =>
    createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding(
        createCertificateConsumptionProperties({ properties, payload })
      ),
      locale,
    }) as EnergymapBuildingInfoPanel[]

  it('suppresses the certificate group only when all six reference Energy slots are available', () => {
    const completePanels = createCertificatePanels({
      properties: districtHeatingProperties,
    })
    expect(
      findSection(
        getPanel(completePanels, 'energyConsumption'),
        'certificateConsumption'
      )
    ).toBeUndefined()

    const partialPanels = createCertificatePanels({
      properties: {
        ...districtHeatingProperties,
        building_key: 'partial-reference',
        floor_area: undefined,
      },
    })
    const energy = getPanel(partialPanels, 'energyConsumption')
    const reference = getSection(energy, 'estimatedConsumption')
    expect(reference.metrics?.map(({ id }) => id)).toEqual([
      'total',
      'heating',
      'electricity',
    ])
    expect(
      reference.metrics?.flatMap(({ values }) =>
        values.map(({ id }) => id)
      )
    ).toEqual(['perSquareMeter', 'perSquareMeter', 'perSquareMeter'])
    expect(getSection(energy, 'certificateConsumption').variant).toBe(
      'energyCertificateConsumption'
    )
  })

  it('retains certificate-only and Water-plus-certificate Energy panels independently of purpose and registry area', () => {
    const certificateOnly = createCertificatePanels({
      properties: {
        building_key: 'certificate-only',
        permanent_building_identifier: 'CERTIFICATE-ONLY',
        main_purpose: '03',
        floor_area: 0,
      },
    })
    expect(
      getSection(
        getPanel(certificateOnly, 'energyConsumption'),
        'certificateConsumption'
      ).metrics
    ).toHaveLength(6)

    const waterAndCertificate = createCertificatePanels({
      properties: {
        building_key: 'water-and-certificate',
        permanent_building_identifier: 'WATER-CERTIFICATE',
        floor_area: 100,
      },
    })
    const energy = getPanel(waterAndCertificate, 'energyConsumption')
    expect(getControls(energy).primaryMetrics.map(({ id }) => id)).toEqual([
      'water',
    ])
    expect(getSection(energy, 'estimatedConsumption').notes).toBeUndefined()
    expect(findSection(energy, 'certificateConsumption')).toBeDefined()

    const neither = createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding({ building_key: 'neither' }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    expect(findPanel(neither, 'energyConsumption')).toBeUndefined()
  })

  it('preserves all carriers, stable other slots, zeroes, complete-only total, and same-certificate area evidence', () => {
    const dangerousName = '<b>{{untranslated-source}}</b>'
    const components = [
      { carrier: 'electricity', annual_kwh: 0 },
      { carrier: 'district_heat', annual_kwh: 10 },
      { carrier: 'district_cooling', annual_kwh: 20 },
      { carrier: 'fossil_fuel', annual_kwh: 30 },
      { carrier: 'renewable_fuel', annual_kwh: 40 },
      {
        carrier: 'other',
        source_slot: 0,
        name: dangerousName,
        annual_kwh: 5,
      },
      { carrier: 'other', source_slot: 1, name: '   ', annual_kwh: 0 },
      { carrier: 'other', source_slot: 2, name: null, annual_kwh: 15 },
    ]
    const panels = createCertificatePanels({
      properties: {
        building_key: 'all-certificate-carriers',
        permanent_building_identifier: 'ALL-CARRIERS',
      },
      payload: {
        components,
        total_kwh_year: 120,
        heated_net_area_m2: 10,
        valid_until: '2020-01-02T00:00:00Z',
      },
    })
    const section = getSection(
      getPanel(panels, 'energyConsumption'),
      'certificateConsumption'
    )
    expect(section.metrics?.map(({ id }) => id)).toEqual([
      'certificateElectricity',
      'certificateDistrictHeat',
      'certificateDistrictCooling',
      'certificateFossilFuel',
      'certificateRenewableFuel',
      'certificateOther0',
      'certificateOther1',
      'certificateOther2',
      'certificateTotal',
    ])
    expect(section.metrics?.every(({ values }) => values.length === 2)).toBe(
      true
    )
    expect(section.metrics?.[0].values[0]).toMatchObject({
      status: 'real',
      text: { type: 'plain', text: '0' },
      unitKey: `${translationPrefix}.units.kwh_per_year`,
    })
    expect(section.metrics?.[0].values[1]).toMatchObject({
      status: 'estimate',
      text: { type: 'plain', text: '0' },
      unitKey: `${translationPrefix}.units.kwh_per_square_meter_year`,
    })
    expect(section.metrics?.[5].label).toEqual({
      type: 'plain',
      text: dangerousName,
    })
    expect(section.metrics?.[6].label).toMatchObject({
      type: 'translation',
      keyName: `${translationPrefix}.panels.energy.certificate.carriers.other_2`,
    })
    const electricityRateEvidence = section.metrics?.[0].values[1].provenance
    expect(electricityRateEvidence?.runtimeValues).toMatchObject({
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CONSUMPTION_ELECTRICITY]:
        0,
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CONSUMPTION_HEATED_AREA]:
        10,
    })
    expect(electricityRateEvidence?.inputIds).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA
    )
    expect(
      getRow(getPanel(panels, 'energyConsumption'), 'validUntil').text
    ).toEqual({ type: 'plain', text: '1/2/2020' })

    const zeroPanels = createCertificatePanels({
      properties: {
        building_key: 'zero-certificate',
        permanent_building_identifier: 'ZERO-CERTIFICATE',
      },
      payload: {
        components: [
          { carrier: 'electricity', annual_kwh: 0 },
          { carrier: 'district_heat', annual_kwh: 0 },
          { carrier: 'district_cooling', annual_kwh: 0 },
          { carrier: 'fossil_fuel', annual_kwh: 0 },
          { carrier: 'renewable_fuel', annual_kwh: 0 },
        ],
        total_kwh_year: 0,
      },
    })
    const zeroTotal = getSection(
      getPanel(zeroPanels, 'energyConsumption'),
      'certificateConsumption'
    ).metrics?.find(({ id }) => id === 'certificateTotal')
    expect(zeroTotal?.values.map(({ text }) => text)).toEqual([
      { type: 'plain', text: '0' },
      { type: 'plain', text: '0' },
    ])
  })

  it('never synthesizes a total for partial records and omits area-derived items without certificate area', () => {
    const panels = createCertificatePanels({
      properties: {
        building_key: 'partial-certificate',
        permanent_building_identifier: 'PARTIAL-CERTIFICATE',
      },
      payload: {
        completeness: 'partial',
        components: [
          { carrier: 'electricity', annual_kwh: 0 },
          { carrier: 'district_heat', annual_kwh: 25 },
          { carrier: 'district_cooling', annual_kwh: 25 },
          { carrier: 'fossil_fuel', annual_kwh: 25 },
          { carrier: 'renewable_fuel', annual_kwh: 25 },
        ],
        total_kwh_year: null,
        heated_net_area_m2: undefined,
        signed_at: undefined,
        valid_until: undefined,
      },
    })
    const section = getSection(
      getPanel(panels, 'energyConsumption'),
      'certificateConsumption'
    )
    expect(section.metrics?.map(({ id }) => id)).not.toContain(
      'certificateTotal'
    )
    expect(
      section.metrics?.every(({ values }) =>
        values.every(({ id }) => id === 'annualTotal')
      )
    ).toBe(true)
    expect(section.rows?.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining(['signedAt', 'validUntil', 'heatedNetArea'])
    )
    expect(section.notes?.map(({ id }) => id)).toContain('partialRecord')
  })

  it('keeps registry and certificate rate pairs isolated and rebuilds localized display with stable evidence', () => {
    const properties = {
      ...districtHeatingProperties,
      building_key: 'isolated-area-sources',
      permanent_building_identifier: 'ISOLATED-AREAS',
      floor_area: 1000,
      distr_default_total: undefined,
      energy_certificate_heated_net_area: 9999,
    }
    const enPanels = createCertificatePanels({ properties, locale: 'en-US' })
    const fiPanels = createCertificatePanels({ properties, locale: 'fi-FI' })
    const getCertificateElectricity = (panels: EnergymapBuildingInfoPanel[]) =>
      getSection(
        getPanel(panels, 'energyConsumption'),
        'certificateConsumption'
      ).metrics?.find(({ id }) => id === 'certificateElectricity')

    const enMetric = getCertificateElectricity(enPanels)
    const fiMetric = getCertificateElectricity(fiPanels)
    expect(enMetric?.values[1].text).toEqual({ type: 'plain', text: '0.2' })
    expect(fiMetric?.values[1].text).toEqual({ type: 'plain', text: '0,2' })
    expect(enMetric?.id).toBe(fiMetric?.id)
    expect(enMetric?.values[1].provenance?.runtimeValues).toEqual(
      fiMetric?.values[1].provenance?.runtimeValues
    )
    expect(enMetric?.values[1].provenance?.runtimeValues).toMatchObject({
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CONSUMPTION_HEATED_AREA]:
        50,
    })
    expect(enMetric?.values[1].sourceProperties).toEqual([
      'energy_certificate_consumption',
    ])
  })

  it('has truthful Finnish and English certificate descriptors', () => {
    for (const translations of [enTranslations, fiTranslations]) {
      const certificate =
        translations.sidebar.building_info.panels.energy.certificate
      expect(certificate.title.trim()).not.toBe('')
      expect(Object.values(certificate.carriers).every((value) => value.trim()))
        .toBe(true)
      expect(Object.values(certificate.context).every((value) => value.trim()))
        .toBe(true)
      expect(Object.values(certificate.metric).every((value) => value.trim()))
        .toBe(true)
      expect(Object.values(certificate.note).every((value) => value.trim()))
        .toBe(true)
    }

    expect(
      enTranslations.sidebar.building_info.panels.energy.certificate.note
        .historical_not_measured
    ).toMatch(/not measured or current consumption/i)
    expect(
      fiTranslations.sidebar.building_info.panels.energy.certificate.note
        .historical_not_measured
    ).toMatch(/eivät ole mitattua tai nykyhetken kulutusta/i)
  })
})

describe('published ventilation facts', () => {
  const I = ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS
  const IDS = ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS
  const rowsFor = (properties: Record<string, unknown>, locale = 'en') =>
    createEnergymapBuildingInfoPanels({
      selectedBuilding: createSelectedBuilding(properties),
      locale,
    })
      ?.flatMap((panel) =>
        panel.sections.flatMap((section) => section.rows ?? [])
      )
      .filter(({ id }) => id.startsWith('ventilation')) ?? []

  // Published-contract examples from the mounted reference/ventilation.md.
  // These are pass-through fixtures, never a frontend classification table.
  it.each([
    ['0', 'Painovoimainen ilmanvaihtojärjestelmä'],
    ['1', 'Koneellinen poistoilmanvaihtojärjestelmä'],
    ['2', 'Koneellinen tulo- ja poistoilmanvaihtojärjestelmä'],
    ['3', 'Poistoilmalämpöpumppu (vain käyttötarkoitusluokka 1)'],
    ['4', 'Painovoimainen/koneellinen poisto'],
    ['5', 'Painovoimainen/koneellinen tulo- ja poisto'],
    ['6', 'Muu ilmanvaihtojärjestelmä'],
    ['7', 'Koneellinen poistoilmanvaihtojärjestelmä lämmöntalteenotolla'],
    [
      '8',
      'Koneellinen tulo- ja poistoilmanvaihtojärjestelmä lämmöntalteenotolla',
    ],
    ['0', 'Updated service label, not a frontend lookup'],
    ['future-code', 'Future published label'],
  ])(
    'displays only the supplied label with exact code evidence %s',
    (code, label) => {
      expect(
        rowsFor({
          energy_certificate_ventilation_type_id: code,
          energy_certificate_ventilation_type_label_fi: label,
        })
      ).toEqual([
        expect.objectContaining({
          id: 'ventilationType',
          text: plain(label),
          sourceLanguage: 'fi',
          sourceProperties: [
            'energy_certificate_ventilation_type_label_fi',
            'energy_certificate_ventilation_type_id',
          ],
          status: 'real',
          provenance: {
            id: IDS.VENTILATION_TYPE,
            inputIds: [I.VENTILATION_LABEL_FI, I.CERTIFICATE_VENTILATION_CODE],
            runtimeValues: { [I.CERTIFICATE_VENTILATION_CODE]: code },
          },
        }),
      ])
    }
  )

  it.each([undefined, null, '', ' \n ', 0, 8, false, {}, []])(
    'keeps a supplied label without invalid code evidence %p',
    (code) => {
      const rows = rowsFor({
        energy_certificate_ventilation_type_id: code,
        energy_certificate_ventilation_type_label_sv: 'Synthetic SV label',
      })
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        id: 'ventilationType',
        text: plain('Synthetic SV label'),
        sourceLanguage: 'sv',
        sourceProperties: ['energy_certificate_ventilation_type_label_sv'],
        provenance: {
          id: IDS.VENTILATION_TYPE,
          inputIds: [I.VENTILATION_LABEL_SV],
        },
      })
      expect(rows[0].provenance?.runtimeValues).toBeUndefined()
    }
  )

  it.each(['0', '8', 'unknown', undefined])(
    'never invents a label for code %p',
    (code) => {
      expect(rowsFor({ energy_certificate_ventilation_type_id: code })).toEqual(
        []
      )
      expect(
        rowsFor({
          energy_certificate_ventilation_type_id: code,
          energy_certificate_ventilation_description_fi:
            'Original description only',
        }).map(({ id }) => id)
      ).toEqual(['ventilation'])
    }
  )

  it.each([undefined, null, '', ' \t\n ', 0, 42, true, {}, []])(
    'removes invalid labels and descriptions independently: %p',
    (value) => {
      const properties = {
        energy_certificate_ventilation_type_label_fi: value,
        energy_certificate_ventilation_type_label_sv: value,
        energy_certificate_ventilation_description_fi: value,
        energy_certificate_ventilation_description_sv: value,
      }
      expect(rowsFor(properties)).toEqual([])
      expect(
        rowsFor({
          ...properties,
          energy_certificate_ventilation_type_label_fi: 'Type',
        }).map(({ id }) => id)
      ).toEqual(['ventilationType'])
      expect(
        rowsFor({
          ...properties,
          energy_certificate_ventilation_description_sv: 'Description',
        }).map(({ id }) => id)
      ).toEqual(['ventilation'])
    }
  )

  it.each(['fi', 'fi-FI', 'en', 'en-GB'])(
    'selects FI then SV independently without translating source content in %s',
    (locale) => {
      for (const labelLanguage of ['fi', 'sv']) {
        for (const descriptionLanguage of ['fi', 'sv']) {
          const rows = rowsFor(
            {
              energy_certificate_ventilation_type_label_fi:
                labelLanguage === 'fi' ? '  Synthetic FI label  ' : 123,
              energy_certificate_ventilation_type_label_sv:
                '  Synthetic SV label  ',
              energy_certificate_ventilation_description_fi:
                descriptionLanguage === 'fi' ? '  FI source prose  ' : ' \n ',
              energy_certificate_ventilation_description_sv:
                '  Suomenkielinen teksti SV-kentässä  ',
            },
            locale
          )
          expect(rows).toHaveLength(2)
          expect(rows[0]).toMatchObject({
            id: 'ventilationType',
            text: plain(`Synthetic ${labelLanguage.toUpperCase()} label`),
            sourceLanguage: labelLanguage,
            sourceProperties: [
              `energy_certificate_ventilation_type_label_${labelLanguage}`,
            ],
          })
          expect(rows[1]).toMatchObject({
            id: 'ventilation',
            text: plain(
              descriptionLanguage === 'fi'
                ? 'FI source prose'
                : 'Suomenkielinen teksti SV-kentässä'
            ),
            sourceLanguage: descriptionLanguage,
            sourceProperties: [
              `energy_certificate_ventilation_description_${descriptionLanguage}`,
            ],
          })
        }
      }
    }
  )

  it('preserves internal whitespace, Unicode and markup-looking source text literally', () => {
    const text =
      'Ää Ö – <script>window.bad = true</script>\n  {count, plural, other {#}} **source**'
    const rows = rowsFor({
      energy_certificate_ventilation_type_label_fi: ` \n${text}  `,
      energy_certificate_ventilation_description_sv: `  ${text}\n`,
    })
    expect(rows.map((row) => row.text)).toEqual([plain(text), plain(text)])
  })

  it.each(['mechanical', 'gravity', 'other'])(
    'uses the exact informative published category %s independently',
    (category) => {
      expect(rowsFor({ ventilation_category: category })).toEqual([
        expect.objectContaining({
          id: 'ventilationCategory',
          text: translation(
            `sidebar.front_page.ventilation.legend.${category}`
          ),
          sourceProperties: ['ventilation_category'],
          provenance: {
            id: IDS.VENTILATION_CATEGORY,
            inputIds: [I.VENTILATION_CATEGORY],
            runtimeValues: { [I.VENTILATION_CATEGORY]: category },
          },
        }),
      ])
    }
  )

  it.each([
    'no_info',
    undefined,
    null,
    '',
    '0',
    'MECHANICAL',
    ' gravity',
    'other ',
    'stale',
    0,
    true,
    {},
    [],
  ])(
    'does not reconstruct an unavailable category %p from code or text',
    (category) => {
      expect(rowsFor({ ventilation_category: category })).toEqual([])
      expect(
        rowsFor({
          ventilation_category: category,
          energy_certificate_ventilation_type_id: '0',
          energy_certificate_ventilation_type_label_fi: 'Supplied label',
          energy_certificate_ventilation_description_sv:
            'Mechanical ventilation',
        }).map(({ id }) => id)
      ).toEqual(['ventilationType', 'ventilation'])
    }
  )

  it.each([true, false, undefined])(
    'keeps conflicting facts certificate-derived regardless of energy class origin %p',
    (origin) => {
      for (const validity of [undefined, '2010-01-01', '2035-01-01']) {
        const rows = rowsFor({
          energy_class: origin == null ? undefined : 'D',
          is_energy_class_modeled: origin,
          energy_certificate_valid_until: validity,
          energy_certificate_ventilation_type_id: '0',
          energy_certificate_ventilation_type_label_fi:
            'Painovoimainen ilmanvaihtojärjestelmä',
          energy_certificate_ventilation_description_fi: 'Koneellinen poisto',
          ventilation_category: 'other',
        })
        expect(
          rows.map(({ id, status, text }) => ({ id, status, text }))
        ).toEqual([
          {
            id: 'ventilationType',
            status: 'real',
            text: plain('Painovoimainen ilmanvaihtojärjestelmä'),
          },
          {
            id: 'ventilation',
            status: 'real',
            text: plain('Koneellinen poisto'),
          },
          {
            id: 'ventilationCategory',
            status: 'real',
            text: translation('sidebar.front_page.ventilation.legend.other'),
          },
        ])
      }
    }
  )
})
