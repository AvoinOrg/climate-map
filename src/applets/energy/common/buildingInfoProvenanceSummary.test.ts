import enTranslations from '@i18n/energiakartta/en.json'
import fiTranslations from '@i18n/energiakartta/fi.json'
import {
  createEnergymapBuildingInfoPanels,
  type EnergymapBuildingInfoPanel,
} from './buildingInfo'
import {
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS,
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS,
  ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  ENERGYMAP_MODELED_CLASS_DOCUMENTED_METHOD_INPUT_IDS,
  ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  getEnergymapEffectiveWaterProjection,
  type EnergymapEffectiveWaterProjection,
} from './buildingInfoProvenance'
import {
  deriveEnergymapBuildingInfoProvenanceSummary,
  type EnergymapBuildingInfoProvenanceSummary,
  type EnergymapBuildingInfoProvenanceSummaryItem,
  type EnergymapBuildingInfoProvenanceSummaryResult,
} from './buildingInfoProvenanceSummary'
import type { EnergymapSelectedBuilding } from './types'

const createSelectedBuilding = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapSelectedBuilding => ({
  id: String(properties.building_key ?? 'summary-building'),
  buildingKey: String(properties.building_key ?? 'summary-building'),
  source: 'energymap_building_polygons',
  sourceLayer: 'energymap_building_polygons',
  layerId: 'energymap_building_polygons-fill',
  properties,
})

const completeDistrictHeatingProperties = {
  building_key: 'complete-summary-building',
  permanent_building_identifier: '101614422K',
  address_fin: 'Mikkolantie 34a',
  postal_code: '00640',
  postal_office_fin: 'HELSINKI',
  main_purpose: '05',
  completion_date: '1967-01-01',
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 454,
  total_area: 470,
  gross_floor_area: 500,
  number_of_storeys: 2,
  energy_class: 'D',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2031-12-31 00:00:00.0',
  energy_certificate_previous_class: 'E',
  energy_certificate_heated_net_area: 1355,
  energy_certificate_ventilation_description_fi:
    'Painovoimainen ilmanvaihto.',
  energy_certificate_recommendations_fi:
    'Tiivistä yläpohjan lämmöneristystä.',
  distr_default_total: 367.7884615,
  distr_default_heat: 343.6634615,
  distr_default_elec: 24.125,
  distr_aahp_total: 289.7019231,
  distr_solar_total: 334.2980769,
  distr_windows_total: 332.6442308,
} satisfies EnergymapSelectedBuilding['properties']

const createCertificateProperties = ({
  certificateId = 'SUMMARY-CERT-A',
  buildingIdentifier = 'SUMMARY-BUILDING-A',
  completeness = 'complete',
  heatedArea = 10,
}: {
  certificateId?: string
  buildingIdentifier?: string
  completeness?: 'complete' | 'partial'
  heatedArea?: number | null
} = {}): EnergymapSelectedBuilding['properties'] => ({
  building_key: buildingIdentifier,
  permanent_building_identifier: buildingIdentifier,
  energy_certificate_consumption: JSON.stringify({
    schema_version: 1,
    basis: 'standardized_calculation',
    unit: 'kWh/year',
    certificate_version: 2018,
    certificate_id: certificateId,
    building_identifier: buildingIdentifier,
    completeness,
    components: [
      { carrier: 'electricity', annual_kwh: 0 },
      { carrier: 'district_heat', annual_kwh: 10 },
      { carrier: 'district_cooling', annual_kwh: 20 },
      { carrier: 'fossil_fuel', annual_kwh: 30 },
      { carrier: 'renewable_fuel', annual_kwh: 40 },
    ],
    total_kwh_year: completeness === 'complete' ? 100 : null,
    signed_at: '2015-01-02T00:00:00Z',
    valid_until: '2025-01-02T00:00:00Z',
    ...(heatedArea == null ? {} : { heated_net_area_m2: heatedArea }),
  }),
})

const createPanels = ({
  properties = completeDistrictHeatingProperties,
  locale = 'en',
}: {
  properties?: EnergymapSelectedBuilding['properties']
  locale?: string
} = {}): EnergymapBuildingInfoPanel[] => {
  const panels = createEnergymapBuildingInfoPanels({
    selectedBuilding: createSelectedBuilding(properties),
    locale,
  })
  if (panels == null) throw new Error('Expected building-info panels')
  return panels
}

const clonePanels = (
  panels: readonly EnergymapBuildingInfoPanel[]
): EnergymapBuildingInfoPanel[] =>
  JSON.parse(JSON.stringify(panels)) as EnergymapBuildingInfoPanel[]

const getResolvedSummary = (
  result: EnergymapBuildingInfoProvenanceSummaryResult | null
): EnergymapBuildingInfoProvenanceSummary => {
  if (result?.status !== 'resolved') {
    throw new Error(`Expected resolved summary: ${JSON.stringify(result)}`)
  }
  return result.summary
}

const deriveSummary = ({
  properties = completeDistrictHeatingProperties,
  locale = 'en',
  effectiveWaterProjection,
}: {
  properties?: EnergymapSelectedBuilding['properties']
  locale?: string
  effectiveWaterProjection?: EnergymapEffectiveWaterProjection
} = {}) =>
  getResolvedSummary(
    deriveEnergymapBuildingInfoProvenanceSummary({
      panels: createPanels({ properties, locale }),
      locale,
      effectiveWaterProjection,
    })
  )

const getItem = ({
  summary,
  provenanceId,
}: {
  summary: EnergymapBuildingInfoProvenanceSummary
  provenanceId: string
}) => {
  const item = summary.items.find(
    (candidate) => candidate.provenanceId === provenanceId
  )
  if (item == null) throw new Error(`Expected summary item: ${provenanceId}`)
  return item
}

const getItemById = ({
  summary,
  id,
}: {
  summary: EnergymapBuildingInfoProvenanceSummary
  id: string
}) => {
  const item = summary.items.find((candidate) => candidate.id === id)
  if (item == null) throw new Error(`Expected summary item path: ${id}`)
  return item
}

const getWaterParts = (panels: readonly EnergymapBuildingInfoPanel[]) => {
  const waterMetric = panels
    .find(({ id }) => id === 'energyConsumption')
    ?.sections.find(({ id }) => id === 'estimatedConsumption')
    ?.consumptionControls?.primaryMetrics.find(({ id }) => id === 'water')
  if (waterMetric?.value == null || waterMetric.residentCountControl == null) {
    throw new Error('Expected normalized Water value and resident control')
  }

  return {
    value: waterMetric.value,
    residentCountControl: waterMetric.residentCountControl,
  }
}

const createWaterProjection = ({
  panels,
  isOverrideEnabled,
  manualResidentCount,
}: {
  panels: readonly EnergymapBuildingInfoPanel[]
  isOverrideEnabled: boolean
  manualResidentCount: number | null
}) =>
  getEnergymapEffectiveWaterProjection({
    ...getWaterParts(panels),
    isOverrideEnabled,
    manualResidentCount,
  })

const getTranslation = (translations: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((value, part) => {
    if (value == null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[part]
  }, translations)

const metadataValueForItem = ({
  item,
  metadataId,
}: {
  item: EnergymapBuildingInfoProvenanceSummaryItem
  metadataId: string
}) => {
  switch (metadataId) {
    case 'sourceLanguage':
      return item.sourceLanguage
    case 'referenceVersion':
      return item.referenceVersion
    case 'referenceLastReviewed':
      return item.referenceLastReviewed
    case 'modeledClass2018':
      return item.modelYear
    default:
      return undefined
  }
}

const COMPLETE_ITEM_SEQUENCE = [
  ['energyConsumption/estimatedConsumption/metric/total/value/annualTotal', 'metricValue'],
  ['energyConsumption/estimatedConsumption/metric/total/value/annualTotal/note', 'metricValueNote'],
  ['energyConsumption/estimatedConsumption/metric/total/value/perSquareMeter', 'metricValue'],
  ['energyConsumption/estimatedConsumption/metric/total/value/perSquareMeter/note', 'metricValueNote'],
  ['energyConsumption/estimatedConsumption/metric/heating/value/annualTotal', 'metricValue'],
  ['energyConsumption/estimatedConsumption/metric/heating/value/annualTotal/note', 'metricValueNote'],
  ['energyConsumption/estimatedConsumption/metric/heating/value/perSquareMeter', 'metricValue'],
  ['energyConsumption/estimatedConsumption/metric/heating/value/perSquareMeter/note', 'metricValueNote'],
  ['energyConsumption/estimatedConsumption/metric/electricity/value/annualTotal', 'metricValue'],
  ['energyConsumption/estimatedConsumption/metric/electricity/value/annualTotal/note', 'metricValueNote'],
  ['energyConsumption/estimatedConsumption/metric/electricity/value/perSquareMeter', 'metricValue'],
  ['energyConsumption/estimatedConsumption/metric/electricity/value/perSquareMeter/note', 'metricValueNote'],
  ['energyConsumption/estimatedConsumption/primaryMetric/water/value', 'primaryMetricValue'],
  ['energyConsumption/estimatedConsumption/primaryMetric/water/residentCountControl', 'residentCountControl'],
  ['energyConsumption/estimatedConsumption/primaryMetric/cost/value', 'primaryMetricValue'],
  ['energyConsumption/estimatedConsumption/primaryMetric/co2/value', 'primaryMetricValue'],
  ['energyConsumption/estimatedConsumption/energySubmetric/electricity/metric/electricity/value/annualTotal', 'energySubmetricValue'],
  ['energyConsumption/estimatedConsumption/energySubmetric/electricity/metric/electricity/value/annualTotal/note', 'energySubmetricValueNote'],
  ['energyConsumption/estimatedConsumption/energySubmetric/electricity/metric/electricity/value/perSquareMeter', 'energySubmetricValue'],
  ['energyConsumption/estimatedConsumption/energySubmetric/electricity/metric/electricity/value/perSquareMeter/note', 'energySubmetricValueNote'],
  ['energyConsumption/estimatedConsumption/energySubmetric/heating/metric/heating/value/annualTotal', 'energySubmetricValue'],
  ['energyConsumption/estimatedConsumption/energySubmetric/heating/metric/heating/value/annualTotal/note', 'energySubmetricValueNote'],
  ['energyConsumption/estimatedConsumption/energySubmetric/heating/metric/heating/value/perSquareMeter', 'energySubmetricValue'],
  ['energyConsumption/estimatedConsumption/energySubmetric/heating/metric/heating/value/perSquareMeter/note', 'energySubmetricValueNote'],
  ['energyConsumption/estimatedConsumption/combinedEnergyMetric/total/value/annualTotal', 'combinedEnergyValue'],
  ['energyConsumption/estimatedConsumption/combinedEnergyMetric/total/value/annualTotal/note', 'combinedEnergyValueNote'],
  ['energyConsumption/estimatedConsumption/combinedEnergyMetric/total/value/perSquareMeter', 'combinedEnergyValue'],
  ['energyConsumption/estimatedConsumption/combinedEnergyMetric/total/value/perSquareMeter/note', 'combinedEnergyValueNote'],
  ['energyConsumption/estimatedConsumption/note/estimatedConsumption', 'sectionNote'],
  ['energyConsumption/calculationContext/row/costMode', 'row'],
  ['energyConsumption/calculationContext/row/co2Mode', 'row'],
  ['renovationRecommendations/publishedRecommendations/row/energyCertificateRecommendations', 'row'],
  ['renovationRecommendations/scenarioComparison/scenario/aahp/value/annualTotal', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/aahp/value/annualTotal/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/aahp/value/perSquareMeter', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/aahp/value/perSquareMeter/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/aahp/value/savingsPercent', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/aahp/value/savingsPercent/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/solar/value/annualTotal', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/solar/value/annualTotal/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/solar/value/perSquareMeter', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/solar/value/perSquareMeter/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/solar/value/savingsPercent', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/solar/value/savingsPercent/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/windows/value/annualTotal', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/windows/value/annualTotal/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/windows/value/perSquareMeter', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/windows/value/perSquareMeter/note', 'scenarioValueNote'],
  ['renovationRecommendations/scenarioComparison/scenario/windows/value/savingsPercent', 'scenarioValue'],
  ['renovationRecommendations/scenarioComparison/scenario/windows/value/savingsPercent/note', 'scenarioValueNote'],
  ['buildingDetails/buildingSubheader/row/address', 'row'],
  ['buildingDetails/identity/row/buildingIdentifier', 'row'],
  ['buildingDetails/identity/row/constructionYear', 'row'],
  ['buildingDetails/identity/row/buildingType', 'row'],
  ['buildingDetails/energyCertificate/row/energyClass', 'row'],
  ['buildingDetails/energyCertificate/row/energyCertificateValidity', 'row'],
  ['buildingDetails/previousEnergyClass/row/previousEnergyClass', 'row'],
  ['buildingDetails/technicalDetails/row/heating', 'row'],
  ['buildingDetails/technicalDetails/row/heatedNetArea', 'row'],
  ['buildingDetails/technicalDetails/row/ventilation', 'row'],
] as const

describe('Energiakartta building-info provenance summary', () => {
  it('visits the complete normalized graph in fixed model order', () => {
    const summary = deriveSummary()

    expect(summary.items.map(({ id, kind }) => [id, kind])).toEqual(
      COMPLETE_ITEM_SEQUENCE
    )
    expect(new Set(summary.items.map(({ id }) => id)).size).toBe(
      summary.items.length
    )
    expect(
      summary.items.filter(
        ({ provenanceId }) =>
          provenanceId ===
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_VALUE_NOTE
      ).length
    ).toBeGreaterThan(10)
    expect(
      new Set(
        summary.items
          .filter(
            ({ provenanceId }) =>
              provenanceId ===
              ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_VALUE_NOTE
          )
          .map(({ id }) => id)
      ).size
    ).toBeGreaterThan(10)
  })

  it('deduplicates descriptors while preserving direct, complete, and reverse associations', () => {
    const summary = deriveSummary()
    const itemById = new Map(summary.items.map((item) => [item.id, item]))

    expect(new Set(summary.categories.map(({ id }) => id)).size).toBe(
      summary.categories.length
    )
    expect(new Set(summary.sources.map(({ id }) => id)).size).toBe(
      summary.sources.length
    )
    expect(new Set(summary.providers.map(({ id }) => id)).size).toBe(
      summary.providers.length
    )
    expect(new Set(summary.calculations.map(({ id }) => id)).size).toBe(
      summary.calculations.length
    )
    expect(new Set(summary.inputs.map(({ id }) => id)).size).toBe(
      summary.inputs.length
    )
    expect(
      new Set(
        summary.metadata.map(({ id, value }) => JSON.stringify([id, value]))
      ).size
    ).toBe(summary.metadata.length)

    for (const item of summary.items) {
      expect(
        summary.categories.find(({ id }) => id === item.categoryId)?.itemIds
      ).toContain(item.id)
      for (const sourceId of item.sourceIds) {
        expect(
          summary.sources.find(({ id }) => id === sourceId)?.itemIds
        ).toContain(item.id)
      }
      for (const sourceId of item.valueSourceIds) {
        expect(
          summary.sources.find(({ id }) => id === sourceId)
            ?.directValueItemIds
        ).toContain(item.id)
      }
      for (const providerId of item.providerIds) {
        expect(
          summary.providers.find(({ id }) => id === providerId)?.itemIds
        ).toContain(item.id)
      }
      for (const providerId of item.valueProviderIds) {
        expect(
          summary.providers.find(({ id }) => id === providerId)
            ?.directValueItemIds
        ).toContain(item.id)
      }
      for (const calculationId of item.calculationIds) {
        expect(
          summary.calculations.find(({ id }) => id === calculationId)?.itemIds
        ).toContain(item.id)
      }
      for (const calculationId of item.valueCalculationIds) {
        expect(
          summary.calculations.find(({ id }) => id === calculationId)
            ?.directValueItemIds
        ).toContain(item.id)
      }
      for (const inputId of item.selectedEvidenceInputIds) {
        expect(
          summary.inputs.find(({ id }) => id === inputId)
            ?.selectedEvidenceItemIds
        ).toContain(item.id)
      }
      for (const inputId of item.documentedMethodInputIds) {
        expect(
          summary.inputs.find(({ id }) => id === inputId)
            ?.documentedMethodItemIds
        ).toContain(item.id)
      }
      for (const metadataId of item.metadataIds) {
        const value = metadataValueForItem({ item, metadataId })
        expect(
          summary.metadata.find(
            (entry) => entry.id === metadataId && entry.value === value
          )?.itemIds
        ).toContain(item.id)
      }
    }

    for (const category of summary.categories) {
      for (const itemId of category.itemIds) {
        expect(itemById.get(itemId)?.categoryId).toBe(category.id)
      }
    }
    for (const source of summary.sources) {
      for (const itemId of source.itemIds) {
        expect(itemById.get(itemId)?.sourceIds).toContain(source.id)
      }
      for (const itemId of source.directValueItemIds) {
        expect(itemById.get(itemId)?.valueSourceIds).toContain(source.id)
      }
    }
    for (const provider of summary.providers) {
      for (const itemId of provider.itemIds) {
        expect(itemById.get(itemId)?.providerIds).toContain(provider.id)
      }
      for (const itemId of provider.directValueItemIds) {
        expect(itemById.get(itemId)?.valueProviderIds).toContain(provider.id)
      }
    }
    for (const calculation of summary.calculations) {
      for (const itemId of calculation.itemIds) {
        expect(itemById.get(itemId)?.calculationIds).toContain(calculation.id)
      }
      for (const itemId of calculation.directValueItemIds) {
        expect(itemById.get(itemId)?.valueCalculationIds).toContain(
          calculation.id
        )
      }
    }
    for (const input of summary.inputs) {
      for (const itemId of input.selectedEvidenceItemIds) {
        expect(itemById.get(itemId)?.selectedEvidenceInputIds).toContain(
          input.id
        )
      }
      for (const itemId of input.documentedMethodItemIds) {
        expect(itemById.get(itemId)?.documentedMethodInputIds).toContain(
          input.id
        )
      }
    }
    for (const metadata of summary.metadata) {
      for (const itemId of metadata.itemIds) {
        const item = itemById.get(itemId)
        expect(item?.metadataIds).toContain(metadata.id)
        expect(
          item == null
            ? undefined
            : metadataValueForItem({ item, metadataId: metadata.id })
        ).toBe(metadata.value)
      }
    }

    expect(
      summary.sources.filter(({ id }) => id === 'energyMapConsumptionModel')
    ).toHaveLength(1)
    expect(
      summary.sources.find(({ id }) => id === 'energyMapConsumptionModel')
        ?.itemIds.length
    ).toBeGreaterThan(20)
    expect(
      summary.providers.filter(({ id }) => id === 'energyMap')
    ).toHaveLength(1)
  })

  it('preserves composite calculations and direct versus complete attribution', () => {
    const summary = deriveSummary()
    const annualTotal = getItemById({
      summary,
      id: 'energyConsumption/estimatedConsumption/metric/total/value/annualTotal',
    })
    expect(annualTotal).toMatchObject({
      categoryId: 'compositeCalculation',
      valueSourceIds: ['energyMapConsumptionModel', 'ryhtiBuildingData'],
      valueProviderIds: ['energyMap'],
      providerIds: ['energyMap', 'ryhti'],
      valueCalculationIds: ['intensityTimesArea'],
    })
    expect(annualTotal.selectedEvidenceInputIds).toEqual([
      'modelOutput.energyIntensity.distr_default_total',
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.INTENSITY_TIMES_AREA,
    ])

    for (const [provenanceId, sourceId, calculationId] of [
      [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL,
        'currentReferencePrices',
        'currentReferenceCost',
      ],
      [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CO2_ANNUAL,
        'currentReferenceEmissionFactors',
        'currentReferenceCo2',
      ],
    ] as const) {
      const item = getItem({ summary, provenanceId })
      expect(item.categoryId).toBe('compositeCalculation')
      expect(item.valueSourceIds).toContain(sourceId)
      expect(item.valueCalculationIds).toEqual(
        expect.arrayContaining([
          calculationId,
          'intensityTimesArea',
          'componentFactorMultiplication',
          'completeOnlyAggregation',
        ])
      )
      expect(item.metadataIds).toEqual(
        expect.arrayContaining([
          'referenceVersion',
          'referenceLastReviewed',
        ])
      )
    }

    const water = getItem({
      summary,
      provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
    })
    expect(water.valueSourceIds).toEqual(['currentReferenceWater'])
    expect(water.sourceIds).toEqual([
      'currentReferenceWater',
      'ryhtiBuildingData',
      'currentReferenceOccupancy',
    ])
    expect(water.valueCalculationIds).toEqual(['annualWater'])
    expect(water.calculationIds).toEqual(['annualWater', 'residentEstimate'])
    expect(water.referenceVersion).toBeDefined()
    expect(
      summary.metadata.find(
        ({ id, value }) =>
          id === 'referenceVersion' && value === water.referenceVersion
      )?.itemIds.length
    ).toBeGreaterThan(3)

    const scenarioSavings = getItem({
      summary,
      provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_SAVINGS,
    })
    expect(scenarioSavings.categoryId).toBe('compositeCalculation')
    expect(scenarioSavings.valueCalculationIds).toEqual(['scenarioSavings'])
    expect(scenarioSavings.selectedEvidenceInputIds).toEqual([
      'modelOutput.energyIntensity.distr_default_total',
      'modelOutput.energyIntensity.distr_aahp_total',
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SCENARIO_SAVINGS,
    ])
  })

  it('uses only the sparse normalized graph and omits the Water-only modeled note', () => {
    const summary = deriveSummary({
      properties: {
        building_key: 'water-only-summary',
        floor_area: 100,
        energy_certificate_recommendations_fi: ' ',
        distr_default_total: null,
        unsupported_field: 'must-not-appear',
      },
    })

    expect(summary.items.map(({ id, provenanceId }) => [id, provenanceId])).toEqual([
      [
        'energyConsumption/estimatedConsumption/primaryMetric/water/value',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
      ],
      [
        'energyConsumption/estimatedConsumption/primaryMetric/water/residentCountControl',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
      ],
    ])
    expect(
      summary.items.some(
        ({ provenanceId }) =>
          provenanceId ===
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_CONSUMPTION_NOTE
      )
    ).toBe(false)
    expect(JSON.stringify(summary)).not.toContain('unsupported_field')
    expect(JSON.stringify(summary)).not.toContain('must-not-appear')
  })

  it('keeps official, modeled, and origin-unavailable class semantics distinct', () => {
    const official = getItem({
      summary: deriveSummary(),
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_OFFICIAL,
    })
    expect(official).toMatchObject({
      categoryId: 'officialCertificate',
      valueSourceIds: ['energyCertificateRegister'],
      selectedEvidenceInputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CURRENT_CLASS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_OFFICIAL,
      ],
    })

    const modeledSummary = deriveSummary({
      properties: {
        building_key: 'minimal-modeled-class',
        energy_class: 'D',
        is_energy_class_modeled: true,
      },
    })
    const modeled = getItem({
      summary: modeledSummary,
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
    })
    const indicator = getItem({
      summary: modeledSummary,
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
    })
    expect(modeled.categoryId).toBe('modeledOutput')
    expect(modeled.selectedEvidenceInputIds).toEqual(
      ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS
    )
    expect(modeled.documentedMethodInputIds).toEqual(
      ENERGYMAP_MODELED_CLASS_DOCUMENTED_METHOD_INPUT_IDS
    )
    expect(modeled.selectedEvidenceInputIds).not.toEqual(
      expect.arrayContaining([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_BUILDING_TYPE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_COMPLETION_DATE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_HEATING_SOURCE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_FLOOR_AREA,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_STOREYS,
      ])
    )
    expect(indicator.kind).toBe('modeledIndicator')
    expect(indicator.selectedEvidenceInputIds).toEqual([
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_MODELED,
    ])
    expect(modeled.modelYear).toBe(2018)

    const missingOriginProperties: EnergymapSelectedBuilding['properties'] = {
      building_key: 'missing-origin-class',
      energy_class: 'C',
    }
    const originCases = [
      missingOriginProperties,
      ...([null, undefined, 'true', 1, 0] as const).map((origin) => ({
        building_key: `invalid-origin-${String(origin)}`,
        energy_class: 'C',
        is_energy_class_modeled: origin,
      })),
    ]
    for (const properties of originCases) {
      const originSummary = deriveSummary({ properties })
      const item = getItem({
        summary: originSummary,
        provenanceId:
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
      })
      expect(item.categoryId).toBe('originUnavailable')
      expect(item.sourceIds).toEqual(['energyMapSelectedBuildingDataset'])
      expect(item.providerIds).toEqual([])
      expect(item.calculationIds).toEqual([])
      expect(item.metadataIds).toEqual(['energyClassOriginUnavailable'])
      expect(item.modelYear).toBeUndefined()
      expect(item.referenceVersion).toBeUndefined()
      expect(
        originSummary.items.some(({ kind }) => kind === 'modeledIndicator')
      ).toBe(false)
    }
  })

  it('preserves registry facts and certificate source language independently of UI locale', () => {
    const properties = {
      ...completeDistrictHeatingProperties,
      energy_certificate_recommendations_fi: 'Paranna eristystä.',
      energy_certificate_ventilation_description_fi: ' ',
      energy_certificate_ventilation_description_sv: 'Självdrag.',
    }
    const englishSummary = deriveSummary({ properties, locale: 'en' })
    const finnishSummary = deriveSummary({ properties, locale: 'fi' })

    expect(englishSummary.locale).toBe('en')
    expect(finnishSummary.locale).toBe('fi')
    const recommendation = getItem({
      summary: englishSummary,
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_RECOMMENDATIONS,
    })
    const ventilation = getItem({
      summary: englishSummary,
      provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.VENTILATION,
    })
    expect(recommendation.sourceLanguage).toBe('fi')
    expect(ventilation.sourceLanguage).toBe('sv')
    expect(
      englishSummary.metadata
        .filter(({ id }) => id === 'sourceLanguage')
        .map(({ value }) => value)
    ).toEqual(['fi', 'sv'])
    expect(
      getItem({
        summary: finnishSummary,
        provenanceId:
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_RECOMMENDATIONS,
      }).sourceLanguage
    ).toBe('fi')
    expect(
      getItem({
        summary: finnishSummary,
        provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.VENTILATION,
      }).sourceLanguage
    ).toBe('sv')

    expect(
      getItem({
        summary: englishSummary,
        provenanceId:
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
      }).categoryId
    ).toBe('buildingRegistry')
    expect(
      getItem({
        summary: englishSummary,
        provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_TYPE,
      }).categoryId
    ).toBe('buildingRegistry')
    expect(
      getItem({
        summary: englishSummary,
        provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS,
      }).categoryId
    ).toBe('frontendDerived')
    expect(
      getItem({
        summary: englishSummary,
        provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.HEATING,
      }).categoryId
    ).toBe('frontendDerived')
  })

  it('replaces Water evidence for valid edits and restores default evidence on disable/reset', () => {
    const panels = createPanels({
      properties: { building_key: 'water-state', floor_area: 100 },
    })
    const deriveFromPanels = (
      effectiveWaterProjection?: EnergymapEffectiveWaterProjection
    ) =>
      getResolvedSummary(
        deriveEnergymapBuildingInfoProvenanceSummary({
          panels,
          locale: 'en',
          effectiveWaterProjection,
        })
      )
    const withoutProjection = deriveFromPanels()
    const defaultProjection = createWaterProjection({
      panels,
      isOverrideEnabled: false,
      manualResidentCount: null,
    })
    const disabled = deriveFromPanels(defaultProjection)

    expect(disabled).toEqual(withoutProjection)
    expect(disabled).not.toBe(withoutProjection)
    expect(disabled.items).not.toBe(withoutProjection.items)
    const defaultWater = getItem({
      summary: withoutProjection,
      provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
    })
    const defaultControl = getItem({
      summary: withoutProjection,
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
    })
    expect(defaultWater.selectedEvidenceInputIds).toEqual(
      ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS
    )
    expect(defaultControl.selectedEvidenceInputIds).toEqual(
      ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS
    )

    const firstProjection = createWaterProjection({
      panels,
      isOverrideEnabled: true,
      manualResidentCount: 2,
    })
    const firstProjectionBefore = JSON.parse(JSON.stringify(firstProjection))
    const firstOverride = deriveFromPanels(firstProjection)
    const editedOverride = deriveFromPanels(
      createWaterProjection({
        panels,
        isOverrideEnabled: true,
        manualResidentCount: 3,
      })
    )
    const overrideWater = getItem({
      summary: editedOverride,
      provenanceId: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
    })
    const overrideControl = getItem({
      summary: editedOverride,
      provenanceId:
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
    })
    expect(firstOverride).toEqual(editedOverride)
    expect(firstOverride).not.toBe(editedOverride)
    expect(firstProjection).toEqual(firstProjectionBefore)
    expect(overrideWater.id).toBe(defaultWater.id)
    expect(overrideControl.id).toBe(defaultControl.id)
    expect(editedOverride.items).toHaveLength(2)
    expect(overrideWater.selectedEvidenceInputIds).toEqual(
      ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS
    )
    expect(overrideControl.selectedEvidenceInputIds).toEqual(
      ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS
    )
    expect(overrideWater.selectedEvidenceInputIds).not.toEqual(
      expect.arrayContaining([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.OCCUPANCY_REFERENCE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RESIDENT_ESTIMATE,
      ])
    )
    expect(editedOverride.inputs.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.OCCUPANCY_REFERENCE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RESIDENT_ESTIMATE,
      ])
    )

    const reset = deriveFromPanels(defaultProjection)
    expect(reset).toEqual(withoutProjection)
  })

  it.each([
    ['null', null],
    ['below range', 0],
    ['above range', 10_001],
  ] as const)(
    'removes invalid active Water output for %s while retaining user control',
    (_name, manualResidentCount) => {
      const panels = createPanels({
        properties: { building_key: 'invalid-water-state', floor_area: 100 },
      })
      const projection = createWaterProjection({
        panels,
        isOverrideEnabled: true,
        manualResidentCount,
      })
      const summary = getResolvedSummary(
        deriveEnergymapBuildingInfoProvenanceSummary({
          panels,
          locale: 'en',
          effectiveWaterProjection: projection,
        })
      )

      expect(summary.items).toHaveLength(1)
      expect(summary.items[0]).toMatchObject({
        id: 'energyConsumption/estimatedConsumption/primaryMetric/water/residentCountControl',
        provenanceId:
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
        selectedEvidenceInputIds:
          ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
      })
      expect(
        summary.items.some(
          ({ provenanceId }) =>
            provenanceId ===
            ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL
        )
      ).toBe(false)
      expect(summary.inputs.map(({ id }) => id)).toEqual([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.USER_RESIDENT_COUNT,
      ])
    }
  )

  it('fails deterministically for unresolved items, duplicate paths, and invalid Water targets', () => {
    const malformedPanels = clonePanels(createPanels())
    const identitySection = malformedPanels
      .find(({ id }) => id === 'buildingDetails')
      ?.sections.find(({ id }) => id === 'identity')
    if (identitySection?.rows == null) {
      throw new Error('Expected normalized identity rows')
    }
    identitySection.rows[0] = {
      ...identitySection.rows[0],
      provenance: undefined,
    }
    const unresolved = deriveEnergymapBuildingInfoProvenanceSummary({
      panels: malformedPanels,
      locale: 'en',
    })
    expect(unresolved).toEqual({
      status: 'contractFailure',
      locale: 'en',
      failures: [
        {
          failureType: 'catalogResolution',
          location: {
            panelId: 'buildingDetails',
            sectionId: 'identity',
            path: 'buildingDetails/identity/row/buildingIdentifier',
          },
          itemKind: 'row',
          reason: 'missing-provenance',
        },
      ],
    })
    expect(unresolved).not.toHaveProperty('summary')

    const unknownIdentityPanels = clonePanels(createPanels())
    const unknownIdentityRow = unknownIdentityPanels
      .find(({ id }) => id === 'buildingDetails')
      ?.sections.find(({ id }) => id === 'identity')?.rows?.[0]
    if (unknownIdentityRow == null) {
      throw new Error('Expected normalized building identifier row')
    }
    unknownIdentityRow.provenance = { id: 'unknown.identity' } as never
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: unknownIdentityPanels,
        locale: 'en',
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        {
          failureType: 'catalogResolution',
          reason: 'unknown-identity',
          id: 'unknown.identity',
        },
      ],
    })

    const unknownInputPanels = clonePanels(createPanels())
    const unknownInputRow = unknownInputPanels
      .find(({ id }) => id === 'buildingDetails')
      ?.sections.find(({ id }) => id === 'identity')?.rows?.[0]
    if (unknownInputRow?.provenance == null) {
      throw new Error('Expected building identifier provenance')
    }
    unknownInputRow.provenance = {
      ...unknownInputRow.provenance,
      inputIds: ['unknown.input'],
    } as never
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: unknownInputPanels,
        locale: 'en',
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        {
          failureType: 'catalogResolution',
          reason: 'unknown-input',
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
          inputId: 'unknown.input',
        },
      ],
    })

    const duplicatePanels = clonePanels(createPanels())
    const duplicateIdentitySection = duplicatePanels
      .find(({ id }) => id === 'buildingDetails')
      ?.sections.find(({ id }) => id === 'identity')
    if (duplicateIdentitySection?.rows == null) {
      throw new Error('Expected normalized identity rows')
    }
    duplicateIdentitySection.rows.push(duplicateIdentitySection.rows[0])
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: duplicatePanels,
        locale: 'fi',
      })
    ).toEqual({
      status: 'contractFailure',
      locale: 'fi',
      failures: [
        {
          failureType: 'duplicatePath',
          location: {
            panelId: 'buildingDetails',
            sectionId: 'identity',
            path: 'buildingDetails/identity/row/buildingIdentifier',
          },
          itemKind: 'row',
          reason: 'duplicate-item-path',
        },
      ],
    })

    const waterPanels = createPanels({
      properties: { building_key: 'water-target', floor_area: 100 },
    })
    const projection = createWaterProjection({
      panels: waterPanels,
      isOverrideEnabled: true,
      manualResidentCount: 2,
    })
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: [],
        locale: 'en',
        effectiveWaterProjection: projection,
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        {
          failureType: 'effectiveWaterTarget',
          reason: 'missing-effective-water-target',
          targetCount: 0,
          valueTargetCount: 0,
          residentCountControlTargetCount: 0,
        },
      ],
    })
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: [...waterPanels, ...clonePanels(waterPanels)],
        locale: 'en',
        effectiveWaterProjection: projection,
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        {
          failureType: 'effectiveWaterTarget',
          reason: 'ambiguous-effective-water-target',
          targetCount: 2,
          valueTargetCount: 2,
          residentCountControlTargetCount: 2,
        },
      ],
    })
  })

  it('returns fresh selection- and locale-specific summaries without mutating inputs', () => {
    const panelsA = createPanels()
    const panelsABefore = clonePanels(panelsA)
    const summaryA = getResolvedSummary(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: panelsA,
        locale: 'en',
      })
    )
    const summaryB = deriveSummary({
      properties: {
        building_key: 'building-b',
        permanent_building_identifier: 'B-only',
      },
      locale: 'fi',
    })
    const summaryAAgain = getResolvedSummary(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: panelsA,
        locale: 'en',
      })
    )

    expect(summaryB.locale).toBe('fi')
    expect(summaryB.items.map(({ id }) => id)).toEqual([
      'buildingDetails/identity/row/buildingIdentifier',
    ])
    expect(summaryB.sources).toHaveLength(1)
    expect(summaryB.sources[0].itemIds).toEqual([
      'buildingDetails/identity/row/buildingIdentifier',
    ])
    expect(summaryAAgain).toEqual(summaryA)
    expect(summaryAAgain).not.toBe(summaryA)
    expect(summaryAAgain.items).not.toBe(summaryA.items)
    expect(summaryAAgain.items[0]).not.toBe(summaryA.items[0])
    expect(summaryAAgain.items[0].sourceIds).not.toBe(
      summaryA.items[0].sourceIds
    )
    expect(summaryAAgain.sources[0].itemIds).not.toBe(
      summaryA.sources[0].itemIds
    )
    expect(panelsA).toEqual(panelsABefore)

    const finnishA = getResolvedSummary(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: createPanels({ locale: 'fi' }),
        locale: 'fi',
      })
    )
    expect(finnishA.locale).toBe('fi')
    expect(finnishA.items.map(({ id }) => id)).toEqual(
      summaryA.items.map(({ id }) => id)
    )
  })

  it('handles no selection and selected empty graphs explicitly', () => {
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: null,
        locale: 'en',
      })
    ).toBeNull()
    expect(
      getResolvedSummary(
        deriveEnergymapBuildingInfoProvenanceSummary({
          panels: [],
          locale: 'fi',
        })
      )
    ).toEqual({
      locale: 'fi',
      items: [],
      categories: [],
      sources: [],
      providers: [],
      calculations: [],
      inputs: [],
      metadata: [],
    })
  })

  it('retains translation keys that exist for both supported UI locales', () => {
    const summaries = [
      deriveSummary(),
      deriveSummary({
        locale: 'fi',
        properties: {
          energy_class: 'D',
          is_energy_class_modeled: true,
        },
      }),
      deriveSummary({
        properties: {
          energy_class: 'D',
          is_energy_class_modeled: 'true',
        },
      }),
    ]
    const keys = summaries.flatMap((summary) => [
      ...summary.items.map(({ fieldKey }) => fieldKey),
      ...summary.categories.map(({ key }) => key),
      ...summary.sources.map(({ key }) => key),
      ...summary.providers.map(({ key }) => key),
      ...summary.calculations.map(({ key }) => key),
      ...summary.inputs.map(({ labelKey }) => labelKey),
      ...summary.metadata.map(({ key }) => key),
    ])

    for (const key of keys) {
      for (const translations of [enTranslations, fiTranslations]) {
        const value = getTranslation(translations, key)
        expect(typeof value).toBe('string')
        expect((value as string).trim()).not.toBe('')
      }
    }
  })
})

describe('energy certificate consumption provenance summary', () => {
  const certificateSummary = ({
    properties = createCertificateProperties(),
    locale = 'en-US',
  }: {
    properties?: EnergymapSelectedBuilding['properties']
    locale?: string
  } = {}) => deriveSummary({ properties, locale })

  it('traverses certificate group, context, carrier labels and values, total, and notes in deterministic graph order', () => {
    const summary = certificateSummary()
    const itemIds = summary.items
      .filter(({ location }) => location.sectionId === 'certificateConsumption')
      .map(({ id }) => id)

    expect(itemIds).toEqual([
      'energyConsumption/certificateConsumption/title',
      'energyConsumption/certificateConsumption/row/sourceRegister',
      'energyConsumption/certificateConsumption/row/basis',
      'energyConsumption/certificateConsumption/row/certificateId',
      'energyConsumption/certificateConsumption/row/certificateVersion',
      'energyConsumption/certificateConsumption/row/signedAt',
      'energyConsumption/certificateConsumption/row/validUntil',
      'energyConsumption/certificateConsumption/row/annualUnit',
      'energyConsumption/certificateConsumption/row/completeness',
      'energyConsumption/certificateConsumption/row/heatedNetArea',
      'energyConsumption/certificateConsumption/metric/certificateElectricity/label',
      'energyConsumption/certificateConsumption/metric/certificateElectricity/value/annualTotal',
      'energyConsumption/certificateConsumption/metric/certificateElectricity/value/perSquareMeter',
      'energyConsumption/certificateConsumption/metric/certificateElectricity/value/perSquareMeter/note',
      'energyConsumption/certificateConsumption/metric/certificateDistrictHeat/label',
      'energyConsumption/certificateConsumption/metric/certificateDistrictHeat/value/annualTotal',
      'energyConsumption/certificateConsumption/metric/certificateDistrictHeat/value/perSquareMeter',
      'energyConsumption/certificateConsumption/metric/certificateDistrictHeat/value/perSquareMeter/note',
      'energyConsumption/certificateConsumption/metric/certificateDistrictCooling/label',
      'energyConsumption/certificateConsumption/metric/certificateDistrictCooling/value/annualTotal',
      'energyConsumption/certificateConsumption/metric/certificateDistrictCooling/value/perSquareMeter',
      'energyConsumption/certificateConsumption/metric/certificateDistrictCooling/value/perSquareMeter/note',
      'energyConsumption/certificateConsumption/metric/certificateFossilFuel/label',
      'energyConsumption/certificateConsumption/metric/certificateFossilFuel/value/annualTotal',
      'energyConsumption/certificateConsumption/metric/certificateFossilFuel/value/perSquareMeter',
      'energyConsumption/certificateConsumption/metric/certificateFossilFuel/value/perSquareMeter/note',
      'energyConsumption/certificateConsumption/metric/certificateRenewableFuel/label',
      'energyConsumption/certificateConsumption/metric/certificateRenewableFuel/value/annualTotal',
      'energyConsumption/certificateConsumption/metric/certificateRenewableFuel/value/perSquareMeter',
      'energyConsumption/certificateConsumption/metric/certificateRenewableFuel/value/perSquareMeter/note',
      'energyConsumption/certificateConsumption/metric/certificateTotal/label',
      'energyConsumption/certificateConsumption/metric/certificateTotal/value/annualTotal',
      'energyConsumption/certificateConsumption/metric/certificateTotal/value/perSquareMeter',
      'energyConsumption/certificateConsumption/metric/certificateTotal/value/perSquareMeter/note',
      'energyConsumption/certificateConsumption/note/standardizedCalculation',
      'energyConsumption/certificateConsumption/note/historicalNotMeasured',
    ])
  })

  it('keeps complete/partial and area/no-area summary differences exact', () => {
    const complete = certificateSummary()
    const partial = certificateSummary({
      properties: createCertificateProperties({ completeness: 'partial' }),
    })
    const noArea = certificateSummary({
      properties: createCertificateProperties({ heatedArea: null }),
    })

    expect(
      complete.items.filter(({ provenanceId }) =>
        provenanceId.includes('.certificateTotal')
      )
    ).toHaveLength(3)
    expect(
      partial.items.filter(({ provenanceId }) =>
        provenanceId.includes('.certificateTotal')
      )
    ).toHaveLength(0)
    expect(partial.items.map(({ provenanceId }) => provenanceId)).toContain(
      ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_PARTIAL_NOTE
    )
    expect(
      noArea.items.some(({ calculationIds }) =>
        calculationIds.includes('certificateAnnualDividedByHeatedArea')
      )
    ).toBe(false)
    expect(
      noArea.inputs.some(
        ({ id }) =>
          id === ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.heatedNetArea
      )
    ).toBe(false)
  })

  it('retains exact per-building evidence and public-register associations without cross-source area inputs', () => {
    const summary = certificateSummary()
    const intensity = getItem({
      summary,
      provenanceId:
        ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_ELECTRICITY_PER_SQUARE_METER,
    })
    const selectedInputs = intensity.selectedEvidenceInputIds.map((id) =>
      summary.inputs.find((input) => input.id === id)
    )

    expect(
      selectedInputs.find(
        (input) =>
          input?.id ===
          ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.components.electricity
      )?.value
    ).toBe(0)
    expect(
      selectedInputs.find(
        (input) =>
          input?.id ===
          ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.heatedNetArea
      )?.value
    ).toBe(10)
    expect(intensity.selectedEvidenceInputIds).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA
    )
    expect(
      summary.sources.find(({ id }) => id === 'energyCertificateRegister')
        ?.directValueItemIds
    ).toContain(
      'energyConsumption/certificateConsumption/metric/certificateElectricity/value/annualTotal'
    )
    expect(
      summary.metadata.find(({ id }) => id === 'certificateId')?.value
    ).toBe('SUMMARY-CERT-A')
    expect(
      summary.metadata.find(({ id }) => id === 'certificateValidUntil')?.value
    ).toBe('1/2/2025')
    expect(
      summary.inputs.find(
        ({ id }) =>
          id === ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.validUntil
      )?.value
    ).toBe('2025-01-02T00:00:00Z')
  })

  it('suppresses all certificate summary evidence for complete reference Energy', () => {
    const summary = certificateSummary({
      properties: {
        ...completeDistrictHeatingProperties,
        energy_certificate_consumption:
          createCertificateProperties({
            buildingIdentifier: '101614422K',
          }).energy_certificate_consumption,
      },
    })

    expect(
      summary.items.some(
        ({ location }) => location.sectionId === 'certificateConsumption'
      )
    ).toBe(false)
    expect(
      summary.inputs.some(({ id }) => id.includes('certificateConsumption'))
    ).toBe(false)
  })

  it('skips absent or invalid certificate titles while resolving the remaining visible items', () => {
    const panels = createPanels({ properties: createCertificateProperties() })

    for (const title of [undefined, { type: 'plain', text: '   ' }] as const) {
      const titlePanels = clonePanels(panels)
      const certificateSection = titlePanels
        .find(({ id }) => id === 'energyConsumption')
        ?.sections.find(({ id }) => id === 'certificateConsumption')
      if (certificateSection == null) {
        throw new Error('Expected certificate section')
      }

      if (title == null) {
        delete certificateSection.title
      } else {
        certificateSection.title = title
      }

      const result = deriveEnergymapBuildingInfoProvenanceSummary({
        panels: titlePanels,
        locale: 'en-US',
      })
      expect(result.status).toBe('resolved')
      if (result.status !== 'resolved') continue

      expect(
        result.summary.items.some(
          ({ id }) =>
            id === 'energyConsumption/certificateConsumption/title'
        )
      ).toBe(false)
      expect(
        result.summary.items.some(
          ({ location }) =>
            location.sectionId === 'certificateConsumption'
        )
      ).toBe(true)
    }
  })

  it('fails closed for missing semantic-label provenance and conflicting per-building evidence', () => {
    const panels = createPanels({ properties: createCertificateProperties() })
    const missingLabelPanels = clonePanels(panels)
    const certificateSection = missingLabelPanels
      .find(({ id }) => id === 'energyConsumption')
      ?.sections.find(({ id }) => id === 'certificateConsumption')
    if (certificateSection == null) throw new Error('Expected certificate section')
    delete certificateSection.titleProvenance
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: missingLabelPanels,
        locale: 'en-US',
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        expect.objectContaining({
          itemKind: 'sectionTitle',
          reason: 'missing-provenance',
        }),
      ],
    })

    const missingCarrierLabelPanels = clonePanels(panels)
    const firstCertificateMetric = missingCarrierLabelPanels
      .find(({ id }) => id === 'energyConsumption')
      ?.sections.find(({ id }) => id === 'certificateConsumption')?.metrics?.[0]
    if (firstCertificateMetric == null) {
      throw new Error('Expected certificate metric')
    }
    delete firstCertificateMetric.labelProvenance
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: missingCarrierLabelPanels,
        locale: 'en-US',
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        expect.objectContaining({
          itemKind: 'metricLabel',
          reason: 'missing-provenance',
        }),
      ],
    })

    const conflictingPanels = clonePanels(panels)
    const conflictingSection = conflictingPanels
      .find(({ id }) => id === 'energyConsumption')
      ?.sections.find(({ id }) => id === 'certificateConsumption')
    const conflictingValue = conflictingSection?.metrics?.[1]?.values[0]
    if (conflictingValue?.provenance?.runtimeValues == null) {
      throw new Error('Expected certificate runtime evidence')
    }
    conflictingValue.provenance = {
      ...conflictingValue.provenance,
      runtimeValues: {
        ...conflictingValue.provenance.runtimeValues,
        [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId]:
          'CONFLICTING-CERTIFICATE',
      },
    }
    expect(
      deriveEnergymapBuildingInfoProvenanceSummary({
        panels: conflictingPanels,
        locale: 'en-US',
      })
    ).toMatchObject({
      status: 'contractFailure',
      failures: [
        expect.objectContaining({
          failureType: 'dynamicEvidenceConflict',
          reason: 'conflicting-dynamic-input-value',
          inputId: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId,
        }),
      ],
    })
  })

  it('rebuilds immutable selection and locale summaries without leaking certificate context', () => {
    const propertiesA = createCertificateProperties()
    const propertiesB = createCertificateProperties({
      certificateId: 'SUMMARY-CERT-B',
      buildingIdentifier: 'SUMMARY-BUILDING-B',
      heatedArea: 25,
    })
    const summaryA = certificateSummary({ properties: propertiesA })
    const snapshotA = JSON.stringify(summaryA)
    const summaryB = certificateSummary({ properties: propertiesB, locale: 'fi-FI' })
    const summaryAAgain = certificateSummary({ properties: propertiesA })

    expect(JSON.stringify(summaryA)).toBe(snapshotA)
    expect(summaryAAgain).toEqual(summaryA)
    expect(summaryA).not.toBe(summaryAAgain)
    expect(
      summaryB.inputs.find(
        ({ id }) => id === ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId
      )?.value
    ).toBe('SUMMARY-CERT-B')
    expect(JSON.stringify(summaryB)).not.toContain('SUMMARY-CERT-A')
    expect(summaryB.locale).toBe('fi-FI')
  })
})
