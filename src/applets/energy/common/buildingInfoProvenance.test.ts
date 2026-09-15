import {
  createEnergymapBuildingInfoPanels,
  isEnergymapBuildingInfoValueAvailable,
} from './buildingInfo'
import type {
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoValueNote,
} from './buildingInfo'
import {
  ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_CALCULATIONS,
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS,
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_CATALOG,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_CATEGORIES,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_METADATA,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_PROVIDERS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_SOURCES,
  ENERGYMAP_MODELED_CLASS_DOCUMENTED_METHOD_INPUT_IDS,
  ENERGYMAP_MODELED_CLASS_OPTIONAL_PROVENANCE_INPUT_IDS,
  ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  getEnergymapEffectiveWaterProjection,
  getEnergymapCurrentReferenceProvenanceInputIds,
  getEnergymapModeledClassProvenanceInputIds,
  getEnergymapModelOutputProvenanceInputId,
  resolveEnergymapBuildingInfoProvenance,
} from './buildingInfoProvenance'
import { CURRENT_REFERENCE_DATA } from './currentReferenceData'
import enTranslations from '@i18n/energiakartta/en.json'
import fiTranslations from '@i18n/energiakartta/fi.json'
import type { EnergymapSelectedBuilding } from './types'

const createSelectedBuilding = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapSelectedBuilding => ({
  id: String(properties.building_key ?? 'provenance-building'),
  buildingKey: String(properties.building_key ?? 'provenance-building'),
  source: 'energymap_building_polygons',
  sourceLayer: 'energymap_building_polygons',
  layerId: 'energymap_building_polygons-fill',
  properties,
})

const completeDistrictHeatingProperties = {
  building_key: 'complete-provenance-building',
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
  energy_certificate_ventilation_description_fi: 'Painovoimainen ilmanvaihto.',
  energy_certificate_recommendations_fi: 'Tiivistä yläpohjan lämmöneristystä.',
  distr_default_total: 367.7884615,
  distr_default_heat: 343.6634615,
  distr_default_elec: 24.125,
  distr_aahp_total: 289.7019231,
  distr_solar_total: 334.2980769,
  distr_windows_total: 332.6442308,
} satisfies EnergymapSelectedBuilding['properties']

const certificateConsumptionProperties = ({
  completeness = 'complete',
}: {
  completeness?: 'complete' | 'partial'
} = {}) => {
  const components = [
    { carrier: 'electricity', annual_kwh: 0 },
    { carrier: 'district_heat', annual_kwh: 10 },
    { carrier: 'district_cooling', annual_kwh: 20 },
    { carrier: 'fossil_fuel', annual_kwh: 30 },
    { carrier: 'renewable_fuel', annual_kwh: 40 },
    { carrier: 'other', source_slot: 0, name: 'Biokaasu', annual_kwh: 5 },
    { carrier: 'other', source_slot: 1, name: null, annual_kwh: 6 },
    { carrier: 'other', source_slot: 2, name: '', annual_kwh: 7 },
  ]

  return {
    building_key: `certificate-${completeness}`,
    permanent_building_identifier: `CERTIFICATE-${completeness}`,
    energy_certificate_consumption: JSON.stringify({
      schema_version: 1,
      basis: 'standardized_calculation',
      unit: 'kWh/year',
      certificate_version: 2018,
      certificate_id: `CERT-${completeness}`,
      building_identifier: `CERTIFICATE-${completeness}`,
      completeness,
      components,
      total_kwh_year: completeness === 'complete' ? 118 : null,
      signed_at: '2015-01-02T00:00:00Z',
      valid_until: '2025-01-02T00:00:00Z',
      heated_net_area_m2: 10,
    }),
  } satisfies EnergymapSelectedBuilding['properties']
}

const activeCurrentReferenceEnergyInput = {
  floorAreaSquareMeters: 1,
  defaultElectricityIntensityKwhPerSquareMeterYear: 1,
  defaultHeatingIntensityKwhPerSquareMeterYear: 1,
} as const

const createPanels = (
  properties: EnergymapSelectedBuilding['properties'] = completeDistrictHeatingProperties
) => {
  const panels = createEnergymapBuildingInfoPanels({
    selectedBuilding: createSelectedBuilding(properties),
    locale: 'en',
  })
  if (panels == null) throw new Error('Expected building-info panels')
  return panels
}

type ProvenanceCandidate = {
  path: string
  provenance?: {
    id: string
    inputIds?: readonly string[]
    runtimeValues?: Readonly<Record<string, string | number>>
  }
  sourceProperties?: readonly string[]
  sourceLanguage?: string
}

type ProvenanceValueCandidate = Omit<ProvenanceCandidate, 'path'> & {
  note?: EnergymapBuildingInfoValueNote
}

const collectProvenanceCandidates = (
  panels: EnergymapBuildingInfoPanel[]
): ProvenanceCandidate[] => {
  const candidates: ProvenanceCandidate[] = []
  const add = (path: string, candidate: Omit<ProvenanceCandidate, 'path'>) =>
    candidates.push({ path, ...candidate })
  const addValue = (path: string, candidate: ProvenanceValueCandidate) => {
    add(path, candidate)
    if (candidate.note != null) {
      add(`${path}.note`, candidate.note)
    }
  }

  for (const panel of panels) {
    for (const section of panel.sections) {
      const sectionPath = `${panel.id}.${section.id}`

      if (section.variant === 'energyCertificateConsumption') {
        add(`${sectionPath}.title`, {
          provenance: section.titleProvenance,
          sourceProperties: section.titleSourceProperties,
        })
      }

      for (const row of section.rows ?? []) {
        addValue(`${sectionPath}.row.${row.id}`, row)
        if (row.modeledIndicator != null) {
          add(`${sectionPath}.row.${row.id}.modeledIndicator`, {
            provenance: row.modeledIndicator.provenance,
            sourceProperties: row.modeledIndicator.sourceProperties,
          })
        }
      }

      for (const metric of section.metrics ?? []) {
        if (section.variant === 'energyCertificateConsumption') {
          add(`${sectionPath}.metric.${metric.id}.label`, {
            provenance: metric.labelProvenance,
            sourceProperties: metric.labelSourceProperties,
          })
        }
        for (const value of metric.values) {
          addValue(`${sectionPath}.metric.${metric.id}.${value.id}`, value)
        }
      }

      for (const scenario of section.scenarios ?? []) {
        for (const value of scenario.values) {
          addValue(`${sectionPath}.scenario.${scenario.id}.${value.id}`, value)
        }
      }

      for (const item of section.notes ?? []) {
        add(`${sectionPath}.note.${item.id}`, item)
      }

      const controls = section.consumptionControls
      if (controls == null) continue

      for (const primaryMetric of controls.primaryMetrics) {
        if (
          primaryMetric.value != null &&
          isEnergymapBuildingInfoValueAvailable(primaryMetric.value)
        ) {
          addValue(
            `${sectionPath}.primary.${primaryMetric.id}`,
            primaryMetric.value
          )
        }

        if (primaryMetric.residentCountControl != null) {
          add(`${sectionPath}.primary.${primaryMetric.id}.residentControl`, {
            provenance: primaryMetric.residentCountControl.provenance,
            sourceProperties:
              primaryMetric.residentCountControl.sourceProperties,
          })
        }
      }

      for (const submetric of controls.energySubmetrics ?? []) {
        for (const value of submetric.metric.values) {
          addValue(
            `${sectionPath}.submetric.${submetric.id}.${value.id}`,
            value
          )
        }
      }

      for (const value of controls.combinedEnergyMetric?.values ?? []) {
        addValue(`${sectionPath}.combinedEnergy.${value.id}`, value)
      }
    }
  }

  return candidates
}

const resolveCandidate = (candidate: ProvenanceCandidate) =>
  resolveEnergymapBuildingInfoProvenance({
    provenance: candidate.provenance,
    sourceProperties: candidate.sourceProperties,
    sourceLanguage: candidate.sourceLanguage,
  })

const getCandidate = ({
  panels,
  id,
}: {
  panels: EnergymapBuildingInfoPanel[]
  id: string
}) => {
  const candidate = collectProvenanceCandidates(panels).find(
    (item) => item.provenance?.id === id
  )
  if (candidate == null)
    throw new Error(`Provenance candidate not found: ${id}`)
  return candidate
}

const getTranslation = (translations: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((value, part) => {
    if (value == null || typeof value !== 'object') return undefined
    return (value as Record<string, unknown>)[part]
  }, translations)

describe('Energiakartta building-info provenance catalog', () => {
  it('has unique stable identities and internally resolvable evidence variants', () => {
    const declaredIds = Object.values(ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS)
    const catalogEntries = Object.entries(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_CATALOG
    )
    const inputDefinitions = Object.values(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS
    )

    expect(new Set(declaredIds).size).toBe(declaredIds.length)
    expect(catalogEntries).toHaveLength(declaredIds.length)
    expect(catalogEntries.map(([id]) => id).sort()).toEqual(declaredIds.sort())
    expect(new Set(inputDefinitions.map(({ id }) => id)).size).toBe(
      inputDefinitions.length
    )

    for (const [id, definition] of catalogEntries) {
      expect(definition.id).toBe(id)
      expect(definition.fieldKey).toMatch(
        /^sidebar\.building_info\.provenance\.fields\./
      )
      expect(definition.categoryKey).toBe(
        ENERGYMAP_BUILDING_INFO_PROVENANCE_CATEGORIES[definition.categoryId].key
      )
      expect(
        definition.sourceIds.length > 0 ||
          definition.evidenceVariants?.every(
            (evidence) =>
              'valueSourceIds' in evidence && evidence.valueSourceIds.length > 0
          )
      ).toBe(true)
      expect(
        Number(definition.evidenceVariants != null) +
          Number(definition.evidencePolicy != null)
      ).toBe(1)

      if (definition.evidenceVariants != null) {
        expect(definition.evidenceVariants.length).toBeGreaterThan(0)
        for (const evidence of definition.evidenceVariants) {
          expect(
            resolveEnergymapBuildingInfoProvenance({
              provenance: { id, inputIds: evidence.inputIds },
              sourceProperties: evidence.sourceProperties,
              sourceLanguage: evidence.sourceLanguage,
            })
          ).toMatchObject({ status: 'resolved' })
        }
      } else if (definition.evidencePolicy != null) {
        const { requiredInputIds, optionalInputIds } = definition.evidencePolicy
        expect(requiredInputIds.length).toBeGreaterThan(0)
        expect(new Set([...requiredInputIds, ...optionalInputIds]).size).toBe(
          requiredInputIds.length + optionalInputIds.length
        )
        const sourceProperties = [
          ...new Set(
            requiredInputIds.flatMap((inputId) => {
              const sourceProperty =
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS[inputId]
                  .sourceProperty
              return sourceProperty == null ? [] : [sourceProperty]
            })
          ),
        ]
        const runtimeValues = Object.fromEntries(
          requiredInputIds.flatMap((inputId) => {
            const input =
              ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS[inputId]
            const runtimeValueType = input.runtimeValueType
            if (runtimeValueType == null) return []

            const value =
              inputId ===
                ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.completeness &&
              definition.requiredCertificateCompleteness != null
                ? definition.requiredCertificateCompleteness
                : runtimeValueType === 'string'
                  ? 'runtime-value'
                  : 1
            return [[inputId, value]]
          })
        )
        expect(
          resolveEnergymapBuildingInfoProvenance({
            provenance: { id, inputIds: requiredInputIds, runtimeValues },
            sourceProperties,
          })
        ).toMatchObject({ status: 'resolved' })
      }

      for (const inputId of definition.documentedMethodInputIds ?? []) {
        expect(
          ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS[inputId]
        ).toBeDefined()
      }
    }
  })

  it('resolves every available production data item in a complete building graph', () => {
    const candidates = collectProvenanceCandidates(createPanels())

    expect(candidates.length).toBeGreaterThan(30)
    for (const candidate of candidates) {
      expect(candidate.provenance).toBeDefined()
      expect(resolveCandidate(candidate)).toMatchObject({ status: 'resolved' })
    }
  })

  it('resolves every retained item across zero-energy Cost and CO2 component paths', () => {
    const cases = [
      {
        name: 'district heating with zero electricity',
        properties: {
          ...completeDistrictHeatingProperties,
          building_key: 'district-zero-electricity',
          distr_default_elec: 0,
        },
        costFactorIds: [
          'referenceFactor.cost.detachedHouse.districtHeat',
        ],
        co2FactorIds: ['referenceFactor.co2.districtHeat'],
      },
      {
        name: 'district heating with zero heating',
        properties: {
          ...completeDistrictHeatingProperties,
          building_key: 'district-zero-heating',
          distr_default_heat: 0,
        },
        costFactorIds: [
          'referenceFactor.cost.detachedHouse.electricity',
        ],
        co2FactorIds: ['referenceFactor.co2.electricity'],
      },
      {
        name: 'district heating with both components zero',
        properties: {
          ...completeDistrictHeatingProperties,
          building_key: 'district-both-zero',
          distr_default_total: 0,
          distr_default_elec: 0,
          distr_default_heat: 0,
        },
        costFactorIds: [],
        co2FactorIds: [],
      },
      {
        name: 'apartment pellet with zero heating',
        properties: {
          ...completeDistrictHeatingProperties,
          building_key: 'apartment-pellet-zero-heating',
          main_purpose: '06',
          heating_energy_source: '07',
          wood_default_total: 10,
          wood_default_elec: 10,
          wood_default_heat: 0,
        },
        costFactorIds: [
          'referenceFactor.cost.apartmentBuilding.electricity',
        ],
        co2FactorIds: ['referenceFactor.co2.electricity'],
      },
      {
        name: 'apartment pellet with zero electricity',
        properties: {
          ...completeDistrictHeatingProperties,
          building_key: 'apartment-pellet-zero-electricity',
          main_purpose: '06',
          heating_energy_source: '07',
          wood_default_total: 20,
          wood_default_elec: 0,
          wood_default_heat: 20,
        },
        costFactorIds: null,
        co2FactorIds: ['referenceFactor.co2.pellet'],
      },
      {
        name: 'apartment pellet with both components zero',
        properties: {
          ...completeDistrictHeatingProperties,
          building_key: 'apartment-pellet-both-zero',
          main_purpose: '06',
          heating_energy_source: '07',
          wood_default_total: 0,
          wood_default_elec: 0,
          wood_default_heat: 0,
        },
        costFactorIds: [],
        co2FactorIds: [],
      },
    ] as const

    for (const testCase of cases) {
      const candidates = collectProvenanceCandidates(
        createPanels(testCase.properties)
      )

      for (const candidate of candidates) {
        expect(candidate.provenance).toBeDefined()
        expect(resolveCandidate(candidate)).toMatchObject({
          status: 'resolved',
        })
      }

      for (const [kind, expectedFactorIds, provenanceIds, factorSourceId] of [
        [
          'cost',
          testCase.costFactorIds,
          [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_MODE_CONTEXT,
          ],
          'currentReferencePrices',
        ],
        [
          'co2',
          testCase.co2FactorIds,
          [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CO2_ANNUAL,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CO2_MODE_CONTEXT,
          ],
          'currentReferenceEmissionFactors',
        ],
      ] as const) {
        const currentReferenceCandidates = candidates.filter(({ provenance }) =>
          provenanceIds.some((id) => provenance?.id === id)
        )

        if (expectedFactorIds == null) {
          expect(currentReferenceCandidates).toEqual([])
          continue
        }

        expect(currentReferenceCandidates).toHaveLength(2)
        for (const candidate of currentReferenceCandidates) {
          const resolution = resolveCandidate(candidate)
          expect(resolution.status).toBe('resolved')
          if (resolution.status !== 'resolved') continue

          expect(
            resolution.inputs
              .filter(({ role }) => role === 'reference-factor')
              .map(({ id }) => id)
          ).toEqual(expectedFactorIds)
          expect(resolution.inputs.map(({ id }) => id)).not.toContain(
            'referenceFactor.cost.apartmentBuilding.pellet'
          )

          for (const calculationIds of [
            resolution.valueCalculations.map(({ id }) => id),
            resolution.calculations.map(({ id }) => id),
          ]) {
            expect(calculationIds).toEqual(
              expect.arrayContaining([
                kind === 'cost'
                  ? 'currentReferenceCost'
                  : 'currentReferenceCo2',
                'intensityTimesArea',
                'completeOnlyAggregation',
              ])
            )
            expect(calculationIds).toEqual(
              expectedFactorIds.length === 0
                ? expect.not.arrayContaining([
                    'kwhToMwh',
                    'componentFactorMultiplication',
                  ])
                : expect.arrayContaining([
                    'kwhToMwh',
                    'componentFactorMultiplication',
                  ])
            )
          }
          expect(resolution.valueSources.map(({ id }) => id)).toEqual(
            expectedFactorIds.length === 0
              ? expect.not.arrayContaining([factorSourceId])
              : expect.arrayContaining([factorSourceId])
          )
        }
      }
    }
  })

  it('covers every declared identity across official, modeled, and origin-unavailable graphs', () => {
    const withoutOrigin: EnergymapSelectedBuilding['properties'] = {
      ...completeDistrictHeatingProperties,
    }
    delete withoutOrigin.is_energy_class_modeled
    const graphMatrix = [
      createPanels(),
      createPanels({
        ...completeDistrictHeatingProperties,
        is_energy_class_modeled: true,
      }),
      createPanels(withoutOrigin),
      createPanels(certificateConsumptionProperties()),
      createPanels(certificateConsumptionProperties({ completeness: 'partial' })),
    ]
    const attachedIds = new Set(
      graphMatrix.flatMap((panels) =>
        collectProvenanceCandidates(panels).flatMap(({ provenance }) =>
          provenance == null ? [] : [provenance.id]
        )
      )
    )

    expect([...attachedIds].sort()).toEqual(
      Object.values(ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS).sort()
    )
  })

  it('catalogs every attached estimate note retained with a value', () => {
    const attachedNotes = collectProvenanceCandidates(createPanels()).filter(
      ({ path }) => path.endsWith('.note')
    )

    expect(attachedNotes.length).toBeGreaterThan(0)
    for (const attachedNote of attachedNotes) {
      expect(attachedNote.provenance?.id).toBe(
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_VALUE_NOTE
      )
      expect(resolveCandidate(attachedNote)).toMatchObject({
        status: 'resolved',
      })
    }
  })

  it('keeps the modeled-consumption note only when a modeled energy output survives', () => {
    const waterOnlyCandidates = collectProvenanceCandidates(
      createPanels({
        building_key: 'water-only-provenance',
        floor_area: 100,
      })
    )

    expect(
      waterOnlyCandidates.some(
        ({ provenance }) =>
          provenance?.id ===
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_CONSUMPTION_NOTE
      )
    ).toBe(false)

    const modeledNote = getCandidate({
      panels: createPanels(),
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_CONSUMPTION_NOTE,
    })
    const resolution = resolveCandidate(modeledNote)

    expect(resolution.status).toBe('resolved')
    if (resolution.status === 'resolved') {
      expect(resolution.sources.map(({ id }) => id)).toEqual([
        'energyMapConsumptionModel',
      ])
      expect(resolution.inputs.map(({ id }) => id)).toEqual([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CONSUMPTION_REFERENCE,
      ])
    }
  })

  it.each([
    {
      name: 'street only',
      properties: {
        address_fin: 'Testitie 1',
        postal_code: ' ',
        postal_office_fin: null,
      },
      sourceProperties: ['address_fin'],
      inputIds: [ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS],
    },
    {
      name: 'postal code only',
      properties: { postal_code: '00640' },
      sourceProperties: ['postal_code'],
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_CODE,
      ],
    },
    {
      name: 'postal office only',
      properties: { postal_office_fin: 'HELSINKI' },
      sourceProperties: ['postal_office_fin'],
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_OFFICE,
      ],
    },
    {
      name: 'street and postal code',
      properties: { address_fin: 'Testitie 1', postal_code: '00640' },
      sourceProperties: ['address_fin', 'postal_code'],
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_CODE,
      ],
    },
    {
      name: 'street and postal office',
      properties: {
        address_fin: 'Testitie 1',
        postal_office_fin: 'HELSINKI',
      },
      sourceProperties: ['address_fin', 'postal_office_fin'],
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_OFFICE,
      ],
    },
    {
      name: 'postal code and postal office',
      properties: { postal_code: '00640', postal_office_fin: 'HELSINKI' },
      sourceProperties: ['postal_code', 'postal_office_fin'],
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_CODE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_OFFICE,
      ],
    },
    {
      name: 'complete address',
      properties: {
        address_fin: 'Testitie 1',
        postal_code: '00640',
        postal_office_fin: 'HELSINKI',
      },
      sourceProperties: ['address_fin', 'postal_code', 'postal_office_fin'],
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_CODE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_OFFICE,
      ],
    },
  ])(
    'attaches only the normalized address evidence for $name',
    ({ properties, sourceProperties, inputIds }) => {
      const address = getCandidate({
        panels: createPanels(properties),
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS,
      })
      const expectedInputIds = [
        ...inputIds,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.COMPOSE_ADDRESS,
      ]

      expect(address.sourceProperties).toEqual(sourceProperties)
      expect(address.provenance?.inputIds).toEqual(expectedInputIds)

      const resolution = resolveCandidate(address)
      expect(resolution).toMatchObject({ status: 'resolved' })
      if (resolution.status === 'resolved') {
        expect(resolution.selectedEvidence.map(({ id }) => id)).toEqual(
          expectedInputIds
        )
      }
    }
  )

  it('rejects mismatched and unrelated address evidence', () => {
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_CODE,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.COMPOSE_ADDRESS,
          ],
        },
        sourceProperties: ['address_fin'],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'source-property-mismatch',
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_BUILDING_IDENTIFIER,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.COMPOSE_ADDRESS,
          ],
        },
        sourceProperties: ['permanent_building_identifier'],
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-input-set' })
  })

  it('uses one identity for duplicate representations and distinct identities for different meanings', () => {
    const candidates = collectProvenanceCandidates(createPanels())
    const totalAnnual = candidates.filter(
      (candidate) =>
        candidate.provenance?.id ===
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_ANNUAL
    )

    expect(totalAnnual.map((candidate) => candidate.path).sort()).toEqual([
      'energyConsumption.estimatedConsumption.combinedEnergy.annualTotal',
      'energyConsumption.estimatedConsumption.metric.total.annualTotal',
    ])

    const comparedIds = [
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_ANNUAL,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_HEATING_ANNUAL,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_ELECTRICITY_ANNUAL,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_ANNUAL,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_SOLAR_ANNUAL,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_WINDOWS_ANNUAL,
    ]
    expect(new Set(comparedIds).size).toBe(comparedIds.length)
    for (const id of comparedIds) {
      expect(
        candidates.some((candidate) => candidate.provenance?.id === id)
      ).toBe(true)
    }
  })

  it('keeps modeled intensities, annual totals, and scenario savings exact', () => {
    const panels = createPanels()
    const perSquareMeter = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_PER_SQUARE_METER,
    })
    const annual = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_ANNUAL,
    })
    const savings = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_SAVINGS,
    })

    expect(perSquareMeter.provenance?.inputIds).toEqual([
      'modelOutput.energyIntensity.distr_default_total',
    ])
    expect(perSquareMeter.sourceProperties).toEqual(['distr_default_total'])
    expect(annual.provenance?.inputIds).toEqual([
      'modelOutput.energyIntensity.distr_default_total',
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.INTENSITY_TIMES_AREA,
    ])
    expect(annual.sourceProperties).toEqual([
      'distr_default_total',
      'floor_area',
    ])
    expect(savings.provenance?.inputIds).toEqual([
      'modelOutput.energyIntensity.distr_default_total',
      'modelOutput.energyIntensity.distr_aahp_total',
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SCENARIO_SAVINGS,
    ])
    expect(savings.sourceProperties).toEqual([
      'distr_default_total',
      'distr_aahp_total',
    ])

    const resolvedSavings = resolveCandidate(savings)
    expect(resolvedSavings.status).toBe('resolved')
    if (resolvedSavings.status === 'resolved') {
      expect(resolvedSavings.calculations.map(({ id }) => id)).toContain(
        'scenarioSavings'
      )
    }
  })

  it('records the consumed Water reference, user override, runtime arithmetic, and caveat', () => {
    const panels = createPanels()
    const waterCandidate = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
    })
    const water = resolveCandidate(waterCandidate)
    const residentControl = resolveCandidate(
      getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
      })
    )
    const overriddenWater = resolveEnergymapBuildingInfoProvenance({
      provenance: {
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
        inputIds: ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS,
      },
    })
    const overriddenResidentControl = resolveEnergymapBuildingInfoProvenance({
      provenance: {
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
        inputIds: [
          ...ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
        ],
      },
    })

    expect(waterCandidate.provenance?.inputIds).toEqual(
      ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS
    )
    expect(
      getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
      }).provenance?.inputIds
    ).toEqual(ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS)
    expect(water.status).toBe('resolved')
    expect(residentControl.status).toBe('resolved')
    expect(overriddenWater.status).toBe('resolved')
    expect(overriddenResidentControl.status).toBe('resolved')
    if (water.status === 'resolved') {
      expect(water.inputs.map(({ id }) => id)).toEqual(
        ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS
      )
      expect(water.sources.map(({ id }) => id)).not.toContain(
        'userResidentCount'
      )
      expect(water.providers.map(({ id }) => id)).not.toContain('user')
      expect(
        water.inputs.find(
          ({ id }) =>
            id ===
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.OCCUPANCY_REFERENCE
        )
      ).toMatchObject({
        value: 41.6,
        unit: 'm²/resident',
        details: {
          rounding: 'half-up',
          minimumResidents: 1,
          maximumResidents: 10000,
        },
      })
      expect(
        water.inputs.find(
          ({ id }) =>
            id ===
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.WATER_CUBIC_METERS_PER_YEAR
        )
      ).toMatchObject({ value: 43.8, unit: 'm³/resident/year' })
      expect(water.calculations.map(({ id }) => id)).toContain('annualWater')
      expect(water.calculations.map(({ id }) => id)).not.toContain(
        'annualizeWaterReference'
      )
      expect(water.metadata.descriptors.map(({ id }) => id)).toContain(
        'floorAreaProxyCaveat'
      )
    }
    if (overriddenWater.status === 'resolved') {
      expect(overriddenWater.inputs.map(({ id }) => id)).toEqual(
        ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS
      )
      expect(overriddenWater.sources.map(({ id }) => id)).toContain(
        'userResidentCount'
      )
      expect(overriddenWater.sources.map(({ id }) => id)).not.toContain(
        'ryhtiBuildingData'
      )
      expect(overriddenWater.sources.map(({ id }) => id)).not.toContain(
        'currentReferenceOccupancy'
      )
      expect(
        overriddenWater.metadata.descriptors.map(({ id }) => id)
      ).not.toContain('floorAreaProxyCaveat')
      expect(overriddenWater.calculations.map(({ id }) => id)).not.toContain(
        'residentEstimate'
      )
      expect(overriddenWater.calculations.map(({ id }) => id)).toEqual([
        'annualWater',
      ])
    }
    if (residentControl.status === 'resolved') {
      expect(residentControl.inputs.map(({ id }) => id)).toEqual(
        ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS
      )
      expect(residentControl.inputs.map(({ role }) => role)).toEqual(
        expect.arrayContaining([
          'source-field',
          'reference-factor',
          'frontend-arithmetic',
        ])
      )
      expect(residentControl.inputs.map(({ role }) => role)).not.toContain(
        'user-input'
      )
      expect(residentControl.sources.map(({ id }) => id)).not.toContain(
        'userResidentCount'
      )
      expect(residentControl.valueSources.map(({ id }) => id)).toEqual([
        'currentReferenceOccupancy',
      ])
      expect(residentControl.valueProviders.map(({ id }) => id)).toEqual([
        'energyMap',
      ])
    }
    if (overriddenResidentControl.status === 'resolved') {
      expect(overriddenResidentControl.inputs.map(({ id }) => id)).toEqual([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.USER_RESIDENT_COUNT,
      ])
      expect(overriddenResidentControl.inputs.map(({ role }) => role)).toEqual([
        'user-input',
      ])
      expect(
        overriddenResidentControl.selectedEvidence.map(
          ({ sourceProperty }) => sourceProperty
        )
      ).not.toContain('floor_area')
      expect(overriddenResidentControl.sources.map(({ id }) => id)).toEqual([
        'userResidentCount',
      ])
      expect(
        overriddenResidentControl.valueSources.map(({ id }) => id)
      ).toEqual(['userResidentCount'])
      expect(overriddenResidentControl.providers.map(({ id }) => id)).toEqual([
        'user',
      ])
      expect(
        overriddenResidentControl.valueProviders.map(({ id }) => id)
      ).toEqual(['user'])
      expect(overriddenResidentControl.sources.map(({ id }) => id)).not.toContain(
        'currentReferenceOccupancy'
      )
      expect(
        overriddenResidentControl.inputs.map(({ id }) => id)
      ).not.toContain(
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.OCCUPANCY_REFERENCE
      )
      expect(
        overriddenResidentControl.calculations.map(({ id }) => id)
      ).toEqual([])
    }
  })

  it('projects default, valid override, and invalid Water evidence without stale inputs', () => {
    const waterMetric = createPanels()
      .flatMap(({ sections }) => sections)
      .flatMap(
        ({ consumptionControls }) => consumptionControls?.primaryMetrics ?? []
      )
      .find(({ id }) => id === 'water')
    if (
      waterMetric?.value == null ||
      waterMetric.residentCountControl == null
    ) {
      throw new Error('Expected normalized Water metric and resident control')
    }

    const baseInput = {
      value: waterMetric.value,
      residentCountControl: waterMetric.residentCountControl,
    }
    const defaultProjection = getEnergymapEffectiveWaterProjection({
      ...baseInput,
      isOverrideEnabled: false,
      manualResidentCount: null,
    })
    const validOverrideProjection = getEnergymapEffectiveWaterProjection({
      ...baseInput,
      isOverrideEnabled: true,
      manualResidentCount: 12,
    })
    const invalidOverrideProjection = getEnergymapEffectiveWaterProjection({
      ...baseInput,
      isOverrideEnabled: true,
      manualResidentCount: null,
    })

    expect(defaultProjection.calculationResult).toMatchObject({
      status: 'complete',
      cubicMetersPerYear: 481.8,
    })
    expect(defaultProjection.value).toMatchObject({
      sourceProperties: ['floor_area'],
      provenance: {
        inputIds: ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
      },
    })
    expect(validOverrideProjection.calculationResult).toMatchObject({
      status: 'complete',
      cubicMetersPerYear: 525.6,
    })
    expect(validOverrideProjection.value.sourceProperties).toBeUndefined()
    expect(validOverrideProjection.value.provenance?.inputIds).toEqual(
      ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS
    )
    expect(
      validOverrideProjection.residentCountControl.sourceProperties
    ).toBeUndefined()
    expect(
      validOverrideProjection.residentCountControl.provenance?.inputIds
    ).toEqual(
      ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS
    )
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: validOverrideProjection.value.provenance,
        sourceProperties: validOverrideProjection.value.sourceProperties,
      })
    ).toMatchObject({ status: 'resolved' })
    expect(invalidOverrideProjection.calculationResult.status).toBe(
      'unsupported'
    )
    expect(invalidOverrideProjection.value).toMatchObject({ status: 'missing' })
    expect(invalidOverrideProjection.value.provenance).toBeUndefined()
    expect(invalidOverrideProjection.value.sourceProperties).toBeUndefined()
    expect(
      invalidOverrideProjection.residentCountControl.provenance?.inputIds
    ).toEqual(
      ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS
    )
  })

  it('selects only the active Cost and CO₂ factor variants and reference metadata', () => {
    const panels = createPanels()
    const costCandidate = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL,
    })
    const cost = resolveCandidate(costCandidate)
    const costContext = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_MODE_CONTEXT,
    })
    const co2 = resolveCandidate(
      getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CO2_ANNUAL,
      })
    )

    expect(cost.status).toBe('resolved')
    expect(co2.status).toBe('resolved')
    expect(costCandidate.sourceProperties).not.toContain('heating_method')
    if (cost.status === 'resolved') {
      const factorIds = cost.inputs
        .filter(({ role }) => role === 'reference-factor')
        .map(({ id }) => id)
      expect(factorIds).toEqual([
        'referenceFactor.cost.detachedHouse.electricity',
        'referenceFactor.cost.detachedHouse.districtHeat',
      ])
      expect(cost.providers.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          'energyMap',
          'ryhti',
          'energiavirasto',
          'energiateollisuus',
        ])
      )
      expect(cost.metadata).toMatchObject({
        referenceVersion: CURRENT_REFERENCE_DATA.version,
        referenceLastReviewed: CURRENT_REFERENCE_DATA.lastReviewed,
      })
      expect(cost.calculations.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          'carrierResolution',
          'buildingClassResolution',
          'intensityTimesArea',
          'kwhToMwh',
          'componentFactorMultiplication',
          'completeOnlyAggregation',
        ])
      )
    }

    expect(costContext.provenance?.inputIds).toEqual(
      getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL,
      }).provenance?.inputIds
    )

    if (co2.status === 'resolved') {
      expect(
        co2.inputs
          .filter(({ role }) => role === 'reference-factor')
          .map(({ id }) => id)
      ).toEqual([
        'referenceFactor.co2.electricity',
        'referenceFactor.co2.districtHeat',
      ])
      expect(co2.metadata.descriptors.map(({ id }) => id)).toContain(
        'co2AccountingBoundary'
      )
    }
  })

  it('keeps registry, official, modeled, frontend-derived, and composite categories distinct', () => {
    const panels = createPanels()
    const categoryById = Object.fromEntries(
      [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_VALIDITY,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_PER_SQUARE_METER,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL,
      ].map((id) => {
        const resolution = resolveCandidate(getCandidate({ panels, id }))
        if (resolution.status !== 'resolved') {
          throw new Error(`Expected resolved category for ${id}`)
        }
        return [id, resolution.category.id]
      })
    )

    expect(categoryById).toEqual({
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER]:
        'buildingRegistry',
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_VALIDITY]:
        'officialCertificate',
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_PER_SQUARE_METER]:
        'modeledOutput',
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS]:
        'frontendDerived',
      [ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL]:
        'compositeCalculation',
    })
  })

  it('maps building class and carrier to exact supported reference variants', () => {
    const electricHeatingInputs =
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'delec',
        mainPurpose: '06',
        ...activeCurrentReferenceEnergyInput,
      })
    expect(electricHeatingInputs).toEqual(
      expect.arrayContaining([
        'referenceFactor.cost.apartmentBuilding.electricity',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_HEATING_METHOD,
      ])
    )
    const districtHeatingInputs =
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'distr',
        mainPurpose: '05',
        ...activeCurrentReferenceEnergyInput,
      })
    expect(districtHeatingInputs).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_HEATING_METHOD
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'wood',
        mainPurpose: '05',
        ...activeCurrentReferenceEnergyInput,
      })
    ).toEqual(
      expect.arrayContaining([
        'referenceFactor.cost.detachedHouse.electricity',
        'referenceFactor.cost.detachedHouse.pellet',
      ])
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'oil',
        mainPurpose: '05',
        ...activeCurrentReferenceEnergyInput,
      })
    ).toEqual(
      expect.arrayContaining([
        'referenceFactor.cost.detachedHouse.electricity',
        'referenceFactor.cost.detachedHouse.lightFuelOil',
      ])
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'co2',
        scenarioPrefix: 'oil',
        ...activeCurrentReferenceEnergyInput,
      })
    ).toEqual(
      expect.arrayContaining([
        'referenceFactor.co2.electricity',
        'referenceFactor.co2.lightFuelOil',
      ])
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'wood',
        mainPurpose: '06',
        ...activeCurrentReferenceEnergyInput,
      })
    ).toBeNull()
    const apartmentPelletZeroHeatingInputs =
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'wood',
        mainPurpose: '06',
        ...activeCurrentReferenceEnergyInput,
        defaultHeatingIntensityKwhPerSquareMeterYear: 0,
      })
    expect(apartmentPelletZeroHeatingInputs).toEqual(
      expect.arrayContaining([
        'referenceFactor.cost.apartmentBuilding.electricity',
      ])
    )
    expect(apartmentPelletZeroHeatingInputs).not.toContain(
      'referenceFactor.cost.apartmentBuilding.pellet'
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'wood',
        mainPurpose: '06',
        ...activeCurrentReferenceEnergyInput,
        defaultElectricityIntensityKwhPerSquareMeterYear: 0,
      })
    ).toBeNull()
    const apartmentPelletAllZeroInputs =
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'cost',
        scenarioPrefix: 'wood',
        mainPurpose: '06',
        ...activeCurrentReferenceEnergyInput,
        defaultElectricityIntensityKwhPerSquareMeterYear: 0,
        defaultHeatingIntensityKwhPerSquareMeterYear: 0,
      })
    expect(
      apartmentPelletAllZeroInputs?.filter((inputId) =>
        inputId.startsWith('referenceFactor.')
      )
    ).toEqual([])
    expect(apartmentPelletAllZeroInputs).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.KWH_TO_MWH
    )
    expect(apartmentPelletAllZeroInputs).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS
        .COMPONENT_FACTOR_MULTIPLICATION
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'co2',
        scenarioPrefix: 'wood',
        ...activeCurrentReferenceEnergyInput,
      })
    ).toEqual(
      expect.arrayContaining([
        'referenceFactor.co2.electricity',
        'referenceFactor.co2.pellet',
      ])
    )
    expect(
      getEnergymapCurrentReferenceProvenanceInputIds({
        kind: 'co2',
        scenarioPrefix: 'wood',
        ...activeCurrentReferenceEnergyInput,
        defaultElectricityIntensityKwhPerSquareMeterYear: 0,
      })
    ).toEqual(expect.arrayContaining(['referenceFactor.co2.pellet']))

    for (const [buildingClass, factors] of Object.entries(
      CURRENT_REFERENCE_DATA.annualEnergyCostPrices.byBuildingClass
    )) {
      for (const [carrier, factor] of Object.entries(factors)) {
        expect(
          ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS[
            `referenceFactor.cost.${buildingClass}.${carrier}`
          ]
        ).toMatchObject({
          supported: factor.status === 'supported',
          ...(factor.status === 'supported' ? { value: factor.value } : {}),
        })
      }
    }
    for (const [carrier, factor] of Object.entries(
      CURRENT_REFERENCE_DATA.emissionFactors.byCarrier
    )) {
      expect(
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS[
          `referenceFactor.co2.${carrier}`
        ]
      ).toMatchObject({
        supported: factor.status === 'supported',
        ...(factor.status === 'supported' ? { value: factor.value } : {}),
      })
    }
  })

  it('keeps official, modeled, and origin-unavailable class evidence strictly separate', () => {
    expect(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_CATALOG[
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED
      ].evidencePolicy?.optionalInputIds
    ).toEqual(ENERGYMAP_MODELED_CLASS_OPTIONAL_PROVENANCE_INPUT_IDS)
    const officialCandidate = getCandidate({
      panels: createPanels(),
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_OFFICIAL,
    })
    const officialClass = resolveCandidate(officialCandidate)
    const modeledPanels = createPanels({
      ...completeDistrictHeatingProperties,
      is_energy_class_modeled: true,
    })
    const modeledClass = resolveCandidate(
      getCandidate({
        panels: modeledPanels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
      })
    )
    const modeledIndicator = resolveCandidate(
      getCandidate({
        panels: modeledPanels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
      })
    )

    expect(officialClass.status).toBe('resolved')
    expect(officialCandidate.sourceProperties).toEqual([
      'energy_class',
      'is_energy_class_modeled',
    ])
    expect(modeledClass.status).toBe('resolved')
    expect(modeledIndicator.status).toBe('resolved')
    if (
      officialClass.status === 'resolved' &&
      modeledClass.status === 'resolved'
    ) {
      expect(officialClass.category.id).toBe('officialCertificate')
      expect(modeledClass.category.id).toBe('modeledOutput')
      expect(officialClass.sources.map(({ id }) => id)).toContain(
        'energyCertificateRegister'
      )
      expect(officialClass.valueSources.map(({ id }) => id)).toEqual([
        'energyCertificateRegister',
      ])
      expect(
        officialClass.selectedEvidence.find(
          ({ id }) =>
            id ===
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_OFFICIAL
        )?.sourceId
      ).toBe('energyMapSelectedBuildingDataset')
      expect(modeledClass.sources.map(({ id }) => id)).not.toContain(
        'energyCertificateRegister'
      )
      expect(modeledClass.inputs.map(({ id }) => id)).toEqual([
        ...ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_BUILDING_TYPE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_COMPLETION_DATE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_HEATING_SOURCE,
      ])
      expect(
        modeledClass.inputs.some(
          ({ role }) =>
            role === 'frontend-arithmetic' || role === 'model-calculation'
        )
      ).toBe(false)
      expect(modeledClass.documentedMethodInputs.map(({ id }) => id)).toEqual(
        ENERGYMAP_MODELED_CLASS_DOCUMENTED_METHOD_INPUT_IDS
      )
      expect(
        modeledClass.documentedMethodInputs.find(
          ({ id }) =>
            id ===
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODELED_CLASS_METHOD
        )
      ).toMatchObject({
        id: 'modelCalculation.modeledClass2018',
        role: 'model-calculation',
        calculationId: 'modeledClass2018',
      })
      expect(modeledClass.valueSources.map(({ id }) => id)).toEqual([
        'energyMapModeledClass',
      ])
      expect(modeledClass.valueProviders.map(({ id }) => id)).toEqual([
        'energyMap',
      ])
      expect(modeledClass.metadata.modelYear).toBe(2018)
    }

    const propertiesWithoutOrigin: EnergymapSelectedBuilding['properties'] = {
      ...completeDistrictHeatingProperties,
    }
    delete propertiesWithoutOrigin.is_energy_class_modeled

    const unavailableOriginCases = [
      {
        properties: propertiesWithoutOrigin,
        inputIds: [
          ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SELECTED_BUILDING_CURRENT_CLASS,
        ],
        sourceProperties: ['energy_class'],
      },
      ...([undefined, null, 'true', 1, 0] as const).map((invalidOrigin) => ({
        properties: {
          ...completeDistrictHeatingProperties,
          is_energy_class_modeled: invalidOrigin,
        },
        inputIds: [
          ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SELECTED_BUILDING_CURRENT_CLASS,
          ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SELECTED_BUILDING_INVALID_CLASS_ORIGIN,
        ],
        sourceProperties: ['energy_class', 'is_energy_class_modeled'],
      })),
    ]

    for (const unavailableOriginCase of unavailableOriginCases) {
      const panels = createPanels(unavailableOriginCase.properties)
      const classCandidate = collectProvenanceCandidates(panels).find(
        ({ path }) =>
          path === 'buildingDetails.energyCertificate.row.energyClass'
      )
      if (classCandidate == null) {
        throw new Error('Expected the retained current energy-class row')
      }
      expect(classCandidate.provenance).toEqual({
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
        inputIds: unavailableOriginCase.inputIds,
      })
      expect(classCandidate.sourceProperties).toEqual(
        unavailableOriginCase.sourceProperties
      )
      const resolution = resolveCandidate(classCandidate)
      expect(resolution.status).toBe('resolved')
      if (resolution.status === 'resolved') {
        expect(resolution.category.id).toBe('originUnavailable')
        expect(resolution.sources.map(({ id }) => id)).toEqual([
          'energyMapSelectedBuildingDataset',
        ])
        expect(resolution.providers).toEqual([])
        expect(resolution.calculations).toEqual([])
        expect(resolution.metadata.descriptors.map(({ id }) => id)).toEqual([
          'energyClassOriginUnavailable',
        ])
        expect(resolution.metadata.modelYear).toBeUndefined()
        expect(resolution.metadata.referenceVersion).toBeUndefined()
      }
      expect(
        collectProvenanceCandidates(panels).some(({ path }) =>
          path.endsWith('.modeledIndicator')
        )
      ).toBe(false)
    }

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CURRENT_CLASS,
          ],
        },
        sourceProperties: ['energy_class'],
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-input-set' })
  })

  it('resolves modeled origin from the published class and literal true without inventing producer inputs', () => {
    const optionalInputProperties = [
      'main_purpose',
      'completion_date',
      'heating_energy_source',
      'heating_method',
      'floor_area',
      'total_area',
      'gross_floor_area',
      'number_of_storeys',
      'modeled_energy_class_area_source',
    ] as const
    const cases: EnergymapSelectedBuilding['properties'][] = [
      {},
      { main_purpose: '05', floor_area: 100 },
      { main_purpose: '05', completion_date: null },
      { main_purpose: '05', completion_date: 'invalid' },
      { main_purpose: '05', heating_energy_source: null },
      { main_purpose: '05', heating_energy_source: '04' },
      { main_purpose: '06', number_of_storeys: 0 },
      {
        main_purpose: '05',
        modeled_energy_class_area_source: 'floor_area',
        floor_area: null,
      },
    ]

    for (const partialProperties of cases) {
      const properties: EnergymapSelectedBuilding['properties'] = {
        energy_class: 'D',
        is_energy_class_modeled: true,
        ...partialProperties,
      }
      const panels = createPanels(properties)
      const modeledClass = getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
      })
      const modeledIndicator = getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
      })

      expect(resolveCandidate(modeledClass)).toMatchObject({
        status: 'resolved',
      })
      expect(resolveCandidate(modeledIndicator)).toMatchObject({
        status: 'resolved',
      })
      for (const propertyName of optionalInputProperties) {
        if (!Object.hasOwn(properties, propertyName)) {
          expect(modeledClass.sourceProperties).not.toContain(propertyName)
          expect(modeledIndicator.sourceProperties).not.toContain(propertyName)
        }
      }
    }

    const minimalClass = getCandidate({
      panels: createPanels({
        energy_class: 'D',
        is_energy_class_modeled: true,
      }),
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
    })
    const minimalIndicator = getCandidate({
      panels: createPanels({
        energy_class: 'D',
        is_energy_class_modeled: true,
      }),
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
    })
    expect(minimalClass.provenance?.inputIds).toEqual(
      ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS
    )
    expect(minimalClass.sourceProperties).toEqual([
      'energy_class',
      'is_energy_class_modeled',
    ])
    expect(minimalIndicator.provenance?.inputIds).toEqual([
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_MODELED,
    ])
    expect(minimalIndicator.sourceProperties).toEqual([
      'is_energy_class_modeled',
    ])
  })

  it('normalizes numeric modeled-purpose codes like the building-info graph', () => {
    for (const [numericPurpose, stringPurpose] of [
      [5, '05'],
      [6, '06'],
    ] as const) {
      const input = {
        completionDate: '1967-01-01',
        heatingEnergySource: '01',
        heatingMethod: '01',
        floorArea: 100,
        totalArea: undefined,
        grossFloorArea: undefined,
        numberOfStoreys: 2,
      }
      expect(
        getEnergymapModeledClassProvenanceInputIds({
          ...input,
          mainPurpose: numericPurpose,
        })
      ).toEqual(
        getEnergymapModeledClassProvenanceInputIds({
          ...input,
          mainPurpose: stringPurpose,
        })
      )

      const modeledClass = getCandidate({
        panels: createPanels({
          energy_class: 'D',
          is_energy_class_modeled: true,
          main_purpose: numericPurpose,
          completion_date: '1967-01-01',
          heating_energy_source: '01',
          heating_method: '01',
          number_of_storeys: 2,
        }),
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
      })
      expect(modeledClass.provenance?.inputIds).toContain(
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_BUILDING_TYPE
      )
      expect(resolveCandidate(modeledClass)).toMatchObject({
        status: 'resolved',
      })
    }
  })

  it('attributes an exact detached area branch only from valid direct producer evidence', () => {
    const withoutAreaSource = getCandidate({
      panels: createPanels({
        energy_class: 'D',
        is_energy_class_modeled: true,
        main_purpose: '05',
        floor_area: 100,
        total_area: 120,
        gross_floor_area: 140,
      }),
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
    })
    expect(withoutAreaSource.provenance?.inputIds).not.toEqual(
      expect.arrayContaining([
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_FLOOR_AREA,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_TOTAL_AREA,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_GROSS_FLOOR_AREA,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_AREA_SOURCE,
      ])
    )
    expect(withoutAreaSource.sourceProperties).not.toContain(
      'modeled_energy_class_area_source'
    )

    for (const [areaSource, inputId] of [
      [
        'floor_area',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_FLOOR_AREA,
      ],
      [
        'total_area',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_TOTAL_AREA,
      ],
      [
        'gross_floor_area',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_GROSS_FLOOR_AREA,
      ],
    ] as const) {
      const modeledClass = getCandidate({
        panels: createPanels({
          energy_class: 'D',
          is_energy_class_modeled: true,
          main_purpose: '05',
          [areaSource]: '100,5',
          modeled_energy_class_area_source: areaSource,
        }),
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
      })
      expect(modeledClass.provenance?.inputIds).toEqual(
        expect.arrayContaining([
          inputId,
          ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_AREA_SOURCE,
        ])
      )
      expect(modeledClass.sourceProperties).toEqual(
        expect.arrayContaining([areaSource, 'modeled_energy_class_area_source'])
      )
      const resolution = resolveCandidate(modeledClass)
      expect(resolution).toMatchObject({ status: 'resolved' })
      if (resolution.status === 'resolved') {
        expect(
          resolution.selectedEvidence.find(
            ({ id }) =>
              id ===
              ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_AREA_SOURCE
          )
        ).toMatchObject({
          role: 'source-field',
          sourceId: 'energyMapSelectedBuildingDataset',
          providerIds: ['energyMap'],
        })
      }
    }

    expect(
      getEnergymapModeledClassProvenanceInputIds({
        mainPurpose: '05',
        floorArea: 100,
        totalArea: 120,
        grossFloorArea: 140,
        numberOfStoreys: 2,
        areaSource: 'unsupported_area',
      })
    ).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_AREA_SOURCE
    )
  })

  it('preserves Finnish and Swedish certificate source-language evidence only where applicable', () => {
    const panels = createPanels({
      ...completeDistrictHeatingProperties,
      energy_certificate_recommendations_fi: ' ',
      energy_certificate_recommendations_sv: 'Byt fönster.',
      energy_certificate_ventilation_description_fi: '\n',
      energy_certificate_ventilation_description_sv: 'Självdrag.',
    })
    const recommendation = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_RECOMMENDATIONS,
    })
    const ventilation = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.VENTILATION,
    })

    expect(recommendation.sourceLanguage).toBe('sv')
    expect(ventilation.sourceLanguage).toBe('sv')
    expect(resolveCandidate(recommendation)).toMatchObject({
      status: 'resolved',
      metadata: { sourceLanguage: 'sv' },
    })
    expect(resolveCandidate(ventilation)).toMatchObject({
      status: 'resolved',
      metadata: { sourceLanguage: 'sv' },
    })

    const validity = getCandidate({
      panels,
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_VALIDITY,
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: validity.provenance,
        sourceProperties: validity.sourceProperties,
        sourceLanguage: 'fi',
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'unsupported-source-language',
    })
  })

  it('fails closed for unknown identities, inputs, combinations, properties, languages, and class origin', () => {
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: { id: 'unknown.identity' },
      })
    ).toMatchObject({ status: 'unsupported', reason: 'unknown-identity' })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
          inputIds: ['unknown.input'],
        },
        sourceProperties: ['permanent_building_identifier'],
      })
    ).toMatchObject({ status: 'unsupported', reason: 'unknown-input' })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS,
          ],
        },
        sourceProperties: ['permanent_building_identifier'],
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-input-set' })

    const savings = getCandidate({
      panels: createPanels(),
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_SAVINGS,
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: savings.provenance,
        sourceProperties: ['unknown_default_total', 'unknown_aahp_total'],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'source-property-mismatch',
    })

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_RECOMMENDATIONS,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_RECOMMENDATIONS_FI,
          ],
        },
        sourceProperties: ['energy_certificate_recommendations_fi'],
        sourceLanguage: 'en',
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'unsupported-source-language',
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_OFFICIAL,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CURRENT_CLASS,
          ],
        },
        sourceProperties: ['energy_class'],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'insufficient-class-origin-evidence',
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
          inputIds: [
            ...ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_FLOOR_AREA,
          ],
        },
        sourceProperties: [
          'energy_class',
          'is_energy_class_modeled',
          'floor_area',
        ],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'invalid-input-set',
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
          inputIds: [
            ...ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CLASS_BUILDING_TYPE,
          ],
        },
        sourceProperties: ['energy_class', 'is_energy_class_modeled'],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'source-property-mismatch',
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL,
          inputIds: ['referenceFactor.cost.apartmentBuilding.pellet'],
        },
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'unsupported-input',
    })
    expect(
      resolveEnergymapBuildingInfoProvenance({ provenance: undefined })
    ).toEqual({ status: 'unsupported', reason: 'missing-provenance' })
  })

  it('rejects unpublished model property combinations', () => {
    expect(
      getEnergymapModelOutputProvenanceInputId({
        prefix: 'awhp',
        measure: 'aahp',
        estimateType: 'total',
      })
    ).toBeNull()
    expect(
      getEnergymapModelOutputProvenanceInputId({
        prefix: 'distr',
        measure: 'solar',
        estimateType: 'heat',
      })
    ).toBeNull()
  })

  it('has nonblank Finnish and English translations for every descriptor key', () => {
    const keys = new Set<string>()
    for (const definition of Object.values(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_CATALOG
    )) {
      keys.add(definition.fieldKey)
      keys.add(definition.categoryKey)
    }
    for (const registry of [
      ENERGYMAP_BUILDING_INFO_PROVENANCE_CATEGORIES,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_SOURCES,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_PROVIDERS,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_CALCULATIONS,
      ENERGYMAP_BUILDING_INFO_PROVENANCE_METADATA,
    ]) {
      for (const descriptor of Object.values(registry)) {
        keys.add(descriptor.key)
      }
    }
    for (const input of Object.values(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS
    )) {
      keys.add(input.labelKey)
    }

    const sourceProperties = new Set(
      Object.values(ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_DEFINITIONS)
        .map(({ sourceProperty }) => sourceProperty)
        .filter((value): value is string => value != null)
    )
    for (const key of keys) {
      for (const translations of [enTranslations, fiTranslations]) {
        const value = getTranslation(translations, key)
        expect(typeof value).toBe('string')
        expect((value as string).trim()).not.toBe('')
        expect(sourceProperties.has(value as string)).toBe(false)
      }
    }
  })
})

describe('energy certificate consumption provenance', () => {
  const certificatePanels = (completeness: 'complete' | 'partial' = 'complete') =>
    createPanels(certificateConsumptionProperties({ completeness }))

  it('resolves every retained group, label, value, context row, and note through the public register', () => {
    for (const completeness of ['complete', 'partial'] as const) {
      const candidates = collectProvenanceCandidates(
        certificatePanels(completeness)
      ).filter(({ path }) => path.includes('.certificateConsumption.'))

      expect(candidates.length).toBeGreaterThan(30)
      for (const candidate of candidates) {
        const resolution = resolveCandidate(candidate)
        expect(resolution).toMatchObject({ status: 'resolved' })
        if (resolution.status !== 'resolved') continue
        expect(resolution.sources.map(({ id }) => id)).toContain(
          'energyCertificateRegister'
        )
        expect(resolution.providers.map(({ id }) => id)).toContain(
          'energyCertificateRegister'
        )
      }
    }

    expect(
      collectProvenanceCandidates(certificatePanels('partial')).some(
        ({ provenance }) =>
          provenance?.id ===
          ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_TOTAL_ANNUAL
      )
    ).toBe(false)
  })

  it('separates official annual facts from same-certificate area divisions', () => {
    const panels = certificatePanels()
    const annual = resolveCandidate(
      getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_ELECTRICITY_ANNUAL,
      })
    )
    const intensity = resolveCandidate(
      getCandidate({
        panels,
        id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_ELECTRICITY_PER_SQUARE_METER,
      })
    )

    expect(annual).toMatchObject({
      status: 'resolved',
      category: { id: 'officialCertificate' },
      valueCalculations: [],
    })
    expect(intensity).toMatchObject({
      status: 'resolved',
      category: { id: 'compositeCalculation' },
      valueCalculations: [
        { id: 'certificateAnnualDividedByHeatedArea' },
      ],
    })
    if (intensity.status !== 'resolved') return
    expect(
      intensity.selectedEvidence.find(
        ({ id }) =>
          id ===
          ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.components.electricity
      )?.value
    ).toBe(0)
    expect(
      intensity.selectedEvidence.find(
        ({ id }) =>
          id === ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.heatedNetArea
      )?.value
    ).toBe(10)
    expect(intensity.selectedEvidence.map(({ id }) => id)).not.toContain(
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA
    )
  })

  it('fails closed for missing, mistyped, mismatched, mixed, and cross-slot runtime evidence', () => {
    const annualCandidate = getCandidate({
      panels: certificatePanels(),
      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_ELECTRICITY_ANNUAL,
    })
    const provenance = annualCandidate.provenance
    if (provenance == null) throw new Error('Expected certificate provenance')
    const annualInputId =
      ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.components.electricity
    const runtimeValues = { ...provenance.runtimeValues }

    delete runtimeValues[annualInputId]
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: { ...provenance, runtimeValues },
        sourceProperties: annualCandidate.sourceProperties,
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'missing-runtime-value',
      inputId: annualInputId,
    })

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          ...provenance,
          runtimeValues: {
            ...provenance.runtimeValues,
            [annualInputId]: 'not-a-number',
          },
        },
        sourceProperties: annualCandidate.sourceProperties,
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-runtime-value' })

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          ...provenance,
          runtimeValues: {
            ...provenance.runtimeValues,
            [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId]: 1,
          },
        },
        sourceProperties: annualCandidate.sourceProperties,
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-runtime-value' })

    const districtInputId =
      ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.components.district_heat
    const wrongCarrierRuntime = { ...provenance.runtimeValues }
    delete wrongCarrierRuntime[annualInputId]
    wrongCarrierRuntime[districtInputId] = 0
    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          ...provenance,
          inputIds: provenance.inputIds?.map((id) =>
            id === annualInputId ? districtInputId : id
          ),
          runtimeValues: wrongCarrierRuntime,
        },
        sourceProperties: annualCandidate.sourceProperties,
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-input-set' })

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance,
        sourceProperties: ['floor_area'],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'source-property-mismatch',
    })

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          ...provenance,
          inputIds: [
            ...(provenance.inputIds ?? []),
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA,
          ],
        },
        sourceProperties: annualCandidate.sourceProperties,
      })
    ).toMatchObject({ status: 'unsupported', reason: 'invalid-input-set' })

    expect(
      resolveEnergymapBuildingInfoProvenance({
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
          inputIds: [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_BUILDING_IDENTIFIER,
          ],
          runtimeValues: {
            [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId]:
              'CERT-OTHER',
          },
        },
        sourceProperties: ['permanent_building_identifier'],
      })
    ).toMatchObject({
      status: 'unsupported',
      reason: 'unexpected-runtime-value',
    })
  })

  it('keeps named other-source evidence literal and slot-specific', () => {
    const candidate = getCandidate({
      panels: certificatePanels(),
      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_OTHER_0_LABEL,
    })
    const resolution = resolveCandidate(candidate)
    expect(resolution.status).toBe('resolved')
    if (resolution.status !== 'resolved') return

    expect(
      resolution.selectedEvidence.find(
        ({ id }) =>
          id === ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.otherNames.other0
      )?.value
    ).toBe('Biokaasu')
    expect(resolution.selectedEvidence.map(({ id }) => id)).not.toContain(
      ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.otherNames.other1
    )
  })
})
