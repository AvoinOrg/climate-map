import React from 'react'

import type { ComponentFixture } from '#/common/component-fixtures/types'
import { Box } from '#/common/style/theme'
import type {
  SidebarPanelExtensionId,
  SidebarPanelExtensionRuntimeOptions,
} from '#/common/types/sidebar'
import { SlotsProvider } from '#/components/context/slotsContext'
import {
  SidebarPanelExtension,
  SidebarPanelExtensionTabRail,
} from '#/components/Sidebar/SidebarPanelExtension'
import { SidebarPanelExtensionContextProvider } from '#/components/Sidebar/sidebarPanelExtensionContext'
import {
  SidebarPanelExtensionTabsProvider,
  useSidebarPanelExtensionTabsRegistryContext,
} from '#/components/Sidebar/SidebarPanelExtensionTabsContext'
import { IntoSidebarPanelExtensionPanelSlot } from '#/components/Sidebar/sidebarSlots'
import type {
  EnergymapBuildingInfoConsumptionControls,
  EnergymapBuildingInfoMetric,
  EnergymapBuildingInfoMetricValue,
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoPrimaryMetric,
  EnergymapBuildingInfoPrimaryMetricId,
  EnergymapBuildingInfoText,
  EnergymapBuildingInfoValueStatus,
} from 'applets/energy/common/buildingInfo'
import { createEnergymapBuildingInfoPresentation } from 'applets/energy/common/buildingInfo'
import {
  ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
} from 'applets/energy/common/buildingInfoProvenance'
import type { EnergymapSelectedBuilding } from 'applets/energy/common/types'
import {
  deriveEnergymapBuildingInfoPanelTopology,
  resolveEnergymapBuildingInfoTab,
} from 'applets/energy/common/buildingInfoPanelTopology'
import type {
  BuildingInfoDesktopMode,
  BuildingInfoTabId,
} from 'applets/energy/common/buildingInfoPanelTopology'
import {
  BuildingInfoActionRail,
  BuildingInfoTabPages,
} from 'applets/energy/components/BuildingInfoPanel'

const noop = () => {}

const ariaLabels = {
  close: 'Close building information',
  collapse: 'Collapse building information',
  overview: 'Open energy and building information',
  renovation: 'Open renovation recommendations',
}

const FIXTURE_EXTENSION_ID: SidebarPanelExtensionId =
  'building-info-fixture-extension'

const plain = (text: string): EnergymapBuildingInfoText => ({
  type: 'plain',
  text,
})

const translation = (keyName: string): EnergymapBuildingInfoText => ({
  type: 'translation',
  keyName,
})

const CERTIFICATE_RECOMMENDATIONS_BY_LANGUAGE = {
  fi: 'Tiivistä yläpohjan lämmöneristystä ja tarkista ilmanvaihdon säädöt. Suositus näytetään täsmälleen energiatodistuksen lähdetekstinä.\n\nToisessa kappaleessa tarkennetaan, että ikkunoiden ja ulko-ovien tiivisteet tulee tarkistaa seuraavan huollon yhteydessä.',
  sv: 'Förbättra vindsbjälklagets värmeisolering och kontrollera ventilationens inställningar. Rekommendationen visas exakt som källtexten i energicertifikatet.\n\nDet andra stycket preciserar att tätningarna kring fönster och ytterdörrar ska kontrolleras vid nästa service.',
} as const

type ProvenanceFixtureVariant =
  | 'official'
  | 'modeled'
  | 'originUnknown'
  | 'waterOnly'
  | 'waterNoDefault'
  | 'property'
  | 'propertyOnly'
  | 'sourcePartial'
  | 'sourceInvalid'
  | 'sourceUnknown'
  | 'sourceCoverageGshp'
  | 'sourceCoverageApartment'
  | 'sourceCoverageWood'
  | 'sourceCoverageBoiler'

type CertificateFixtureVariant =
  | 'reported'
  | 'water'
  | 'partialReference'
  | 'partialNoAreaExpired'
  | 'completeReference'
  | 'neither'
  | 'selectionSwap'
  | 'mixed'
  | 'overlap'
  | 'totalOnly'
  | 'energyOnly'

const REPORTED_CERTIFICATE_COMPONENTS = [
  { annual_kwh: 1196074, carrier: 'electricity' },
  { annual_kwh: 2994881, carrier: 'district_heat' },
  { annual_kwh: 197293, carrier: 'district_cooling' },
  { annual_kwh: 0, carrier: 'fossil_fuel' },
  { annual_kwh: 0, carrier: 'renewable_fuel' },
]

const createCertificateConsumptionPayload = ({
  buildingIdentifier,
  certificateId,
  completeness = 'complete',
  components = REPORTED_CERTIFICATE_COMPONENTS,
  heatedNetAreaM2 = 22707.2,
  signedAt = '2023-04-13T11:37:42.080327',
  totalKwhYear = 4388248,
  validUntil = '2033-04-14T00:00:00',
}: {
  buildingIdentifier: string
  certificateId: string
  completeness?: 'complete' | 'partial'
  components?: Array<Record<string, unknown>>
  heatedNetAreaM2?: number | null
  signedAt?: string
  totalKwhYear?: number | null
  validUntil?: string
}) =>
  JSON.stringify({
    basis: 'standardized_calculation',
    building_identifier: buildingIdentifier,
    certificate_id: certificateId,
    certificate_version: 2018,
    completeness,
    components,
    heated_net_area_m2: heatedNetAreaM2,
    schema_version: 1,
    signed_at: signedAt,
    total_kwh_year: totalKwhYear,
    unit: 'kWh/year',
    valid_until: validUntil,
  })

const REPORTED_CERTIFICATE_PROPERTIES = {
  building_key: '1752c0cc-65e2-45d5-938a-b47f09349ae4',
  completion_date: '1993-03-08',
  heating_energy_source: '01',
  permanent_building_identifier: '1036581819',
  main_purpose: '02',
  floor_area: 0,
  energy_class: 'C',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2033-04-14T00:00:00',
  energy_certificate_heated_net_area: 22707.2,
  energy_certificate_consumption: createCertificateConsumptionPayload({
    buildingIdentifier: '1036581819',
    certificateId: '318510',
  }),
} satisfies EnergymapSelectedBuilding['properties']

const COMPLETE_REFERENCE_PROPERTIES = {
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 100,
  distr_default_total: 100,
  distr_default_heat: 75,
  distr_default_elec: 25,
} satisfies EnergymapSelectedBuilding['properties']

const createCertificateFixturePresentation = ({
  variant,
  locale,
  buildingKey,
}: {
  variant: CertificateFixtureVariant
  locale: string
  buildingKey: string
}) => {
  const properties: EnergymapSelectedBuilding['properties'] = (() => {
    if (variant === 'neither') {
      return {
        building_key: buildingKey,
        permanent_building_identifier: 'NO-ENERGY-SOURCES',
        energy_class: 'C',
        is_energy_class_modeled: false,
      }
    }

    if (variant === 'selectionSwap' && buildingKey === 'fixture-building-b') {
      return {
        ...COMPLETE_REFERENCE_PROPERTIES,
        building_key: buildingKey,
        permanent_building_identifier: 'COMPLETE-REFERENCE-SWAP',
        energy_class: 'B',
        is_energy_class_modeled: false,
        energy_certificate_consumption: createCertificateConsumptionPayload({
          buildingIdentifier: 'COMPLETE-REFERENCE-SWAP',
          certificateId: 'SUPPRESSED-SWAP-CERTIFICATE',
        }),
      }
    }

    if (
      variant === 'reported' ||
      variant === 'selectionSwap' ||
      variant === 'energyOnly'
    ) {
      return { ...REPORTED_CERTIFICATE_PROPERTIES, building_key: buildingKey }
    }

    if (variant === 'partialNoAreaExpired') {
      const buildingIdentifier = 'PARTIAL-NO-AREA'

      return {
        building_key: buildingKey,
        permanent_building_identifier: buildingIdentifier,
        energy_class: 'D',
        is_energy_class_modeled: false,
        energy_certificate_consumption: createCertificateConsumptionPayload({
          buildingIdentifier,
          certificateId: 'PARTIAL-EXPIRED-001',
          completeness: 'partial',
          components: [
            { annual_kwh: 0, carrier: 'electricity' },
            { annual_kwh: 20, carrier: 'district_heat' },
            { annual_kwh: 0, carrier: 'district_cooling' },
            { annual_kwh: 0, carrier: 'fossil_fuel' },
            { annual_kwh: 0, carrier: 'renewable_fuel' },
            {
              annual_kwh: 5,
              carrier: 'other',
              name: '<b data-injected="true">Named source</b>',
              source_slot: 0,
            },
            {
              annual_kwh: 0,
              carrier: 'other',
              name: '   ',
              source_slot: 1,
            },
            {
              annual_kwh: 15,
              carrier: 'other',
              name: null,
              source_slot: 2,
            },
          ],
          heatedNetAreaM2: null,
          signedAt: '2010-01-02T00:00:00Z',
          totalKwhYear: null,
          validUntil: '2020-01-02T00:00:00Z',
        }),
      }
    }

    if (
      variant === 'mixed' ||
      variant === 'overlap' ||
      variant === 'totalOnly'
    ) {
      const buildingIdentifier = `INTEGRATED-${variant}`
      return {
        ...COMPLETE_REFERENCE_PROPERTIES,
        main_purpose: '05',
        building_key: buildingKey,
        permanent_building_identifier: buildingIdentifier,
        heating_energy_source: variant === 'overlap' ? '04' : '01',
        distr_default_total: variant === 'totalOnly' ? 110 : null,
        distr_default_elec: null,
        distr_default_heat: variant === 'totalOnly' ? null : 75,
        elecb_default_heat: variant === 'overlap' ? 75 : null,
        ...(variant === 'totalOnly'
          ? {}
          : {
              energy_certificate_consumption:
                createCertificateConsumptionPayload({
                  buildingIdentifier,
                  certificateId: buildingIdentifier,
                  heatedNetAreaM2: 200,
                  totalKwhYear: 9500,
                  components: [
                    { carrier: 'electricity', annual_kwh: 2000 },
                    { carrier: 'district_heat', annual_kwh: 7000 },
                    { carrier: 'district_cooling', annual_kwh: 500 },
                    { carrier: 'fossil_fuel', annual_kwh: 0 },
                    { carrier: 'renewable_fuel', annual_kwh: 0 },
                  ],
                }),
            }),
      }
    }

    const buildingIdentifier =
      variant === 'water'
        ? 'WATER-CERTIFICATE'
        : variant === 'partialReference'
          ? 'PARTIAL-REFERENCE-CERTIFICATE'
          : 'COMPLETE-REFERENCE-CERTIFICATE'
    const referenceProperties =
      variant === 'completeReference'
        ? COMPLETE_REFERENCE_PROPERTIES
        : variant === 'partialReference'
          ? {
              ...COMPLETE_REFERENCE_PROPERTIES,
              floor_area: undefined,
            }
          : { floor_area: 100 }

    return {
      ...referenceProperties,
      building_key: buildingKey,
      permanent_building_identifier: buildingIdentifier,
      energy_class: 'C',
      is_energy_class_modeled: false,
      energy_certificate_consumption: createCertificateConsumptionPayload({
        buildingIdentifier,
        certificateId: `${buildingIdentifier}-001`,
      }),
    }
  })()
  const normalizedBuildingKey = String(properties.building_key)
  const presentation = createEnergymapBuildingInfoPresentation({
    selectedBuilding: {
      id: normalizedBuildingKey,
      buildingKey: normalizedBuildingKey,
      source: 'energymap_building_polygons',
      sourceLayer: 'energymap_building_polygons',
      layerId: 'energymap_building_polygons-fill',
      properties,
    },
    locale,
  })

  if (presentation.panels == null) {
    throw new Error('Expected certificate fixture panels')
  }

  return {
    ...presentation,
    panels:
      variant === 'energyOnly'
        ? presentation.panels.filter(({ id }) => id === 'energyConsumption')
        : presentation.panels,
  }
}

const provenanceCompleteProperties = {
  building_key: 'fixture-provenance-complete',
  property_identifier: '09102000040003',
  energy_certificate_ventilation_type_label_fi: 'Painovoimainen ilmanvaihto',
  ventilation_category: 'gravity',
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

const createProvenanceFixturePresentation = ({
  variant,
  locale,
  buildingKey,
}: {
  variant: ProvenanceFixtureVariant
  locale: string
  buildingKey: string
}) => {
  const isReplacementBuilding = buildingKey === 'fixture-building-b'
  const properties: EnergymapSelectedBuilding['properties'] =
    variant === 'propertyOnly'
      ? { building_key: buildingKey, property_identifier: '00000000000001' }
      : variant === 'waterNoDefault'
        ? {
            building_key: buildingKey,
            main_purpose: isReplacementBuilding ? '06' : '05',
            ...(isReplacementBuilding ? { floor_area: 0 } : {}),
          }
        : variant === 'waterOnly'
          ? {
              building_key: buildingKey,
              floor_area: 100,
              distr_default_total: null,
            }
          : {
              ...provenanceCompleteProperties,
              ...(variant === 'property' && isReplacementBuilding
                ? { property_identifier: null }
                : {}),
              building_key: buildingKey,
              ...(isReplacementBuilding
                ? {
                    permanent_building_identifier: '101614423L',
                    address_fin: 'Mikkolantie 35',
                    energy_class: 'E',
                  }
                : {}),
              ...(variant === 'modeled'
                ? { is_energy_class_modeled: true }
                : variant === 'originUnknown'
                  ? { is_energy_class_modeled: 'true' }
                  : { is_energy_class_modeled: false }),
            }
  if (variant === 'sourcePartial')
    Object.assign(properties, {
      postal_office_fin: null,
      heating_method: null,
      energy_certificate_ventilation_type_label_fi: null,
      energy_certificate_ventilation_type_id: '1',
      distr_default_heat: null,
      distr_windows_total: null,
      energy_certificate_consumption: createCertificateConsumptionPayload({
        buildingIdentifier: String(properties.permanent_building_identifier),
        certificateId: 'partial-fixture',
        completeness: 'partial',
        components: [{ carrier: 'electricity', annual_kwh: 0 }],
        heatedNetAreaM2: null,
        totalKwhYear: null,
      }),
    })
  if (variant === 'sourceInvalid')
    Object.assign(properties, {
      address_fin: 123,
      completion_date: '2024-02-30',
      property_identifier: '00000000000000',
      floor_area: 0,
      energy_class: null,
      modeled_energy_class_reason: 'missing_completion_date',
      energy_certificate_valid_until: '2031-02-30',
      energy_certificate_heated_net_area: -1,
      distr_default_heat: -1,
      distr_default_total: 0,
      distr_windows_total: -1,
      energy_certificate_consumption: createCertificateConsumptionPayload({
        buildingIdentifier: 'another-building',
        certificateId: 'mismatched-fixture',
      }),
    })
  if (variant === 'sourceUnknown')
    Object.assign(properties, {
      energy_class: null,
      modeled_energy_class_reason: 'unrecognized-future-reason',
      energy_certificate_previous_class: null,
      energy_certificate_valid_until: null,
      ventilation_category: 'no_info',
      energy_certificate_ventilation_type_label_fi: null,
      energy_certificate_ventilation_description_fi: null,
      distr_default_heat: null,
    })
  if (variant === 'sourceCoverageGshp') {
    Object.assign(properties, {
      main_purpose: '05',
      heating_energy_source: '09',
      gshp_default_total: 20,
      gshp_aahp_total: 10,
      energy_class: true,
      is_energy_class_modeled: true,
    })
  }
  if (variant === 'sourceCoverageApartment') {
    Object.assign(properties, {
      main_purpose: '06',
      distr_aahp_total: 10,
      energy_class: true,
      is_energy_class_modeled: false,
    })
  }
  if (variant === 'sourceCoverageWood' || variant === 'sourceCoverageBoiler') {
    const prefix = variant === 'sourceCoverageWood' ? 'wood' : 'elecb'
    Object.assign(properties, {
      main_purpose: '06',
      heating_energy_source: prefix === 'wood' ? '07' : '04',
      heating_method: '01',
      energy_class: true,
      is_energy_class_modeled: null,
      [`${prefix}_default_total`]: 20,
      [`${prefix}_default_heat`]: 15,
      [`${prefix}_default_elec`]: 5,
      [`${prefix}_aahp_total`]: 10,
      [`${prefix}_solar_total`]: 10,
      [`${prefix}_windows_total`]: 10,
    })
  }
  const normalizedBuildingKey = String(properties.building_key)
  const presentation = createEnergymapBuildingInfoPresentation({
    selectedBuilding: {
      id: normalizedBuildingKey,
      buildingKey: normalizedBuildingKey,
      source: 'energymap_building_polygons',
      sourceLayer: 'energymap_building_polygons',
      layerId: 'energymap_building_polygons-fill',
      properties,
    },
    locale,
  })

  if (presentation.panels == null) {
    throw new Error('Expected provenance fixture panels')
  }

  return { ...presentation, panels: presentation.panels }
}

const setFixtureInputValue = (input: HTMLInputElement, nextValue: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )?.set

  valueSetter?.call(input, nextValue)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

const value = ({
  id,
  label,
  text,
  status = 'estimate',
}: {
  id: EnergymapBuildingInfoMetricValue['id']
  label: string
  text: string
  status?: EnergymapBuildingInfoValueStatus
}): EnergymapBuildingInfoMetricValue => ({
  id,
  label: plain(label),
  text: plain(text),
  status,
})

const metric = ({
  id,
  label,
  annual,
  square,
}: {
  id: EnergymapBuildingInfoMetric['id']
  label: string
  annual: string
  square: string
}): EnergymapBuildingInfoMetric => ({
  id,
  label: plain(label),
  values: [
    value({
      id: 'annualTotal',
      label: 'Annual total',
      text: annual,
    }),
    value({
      id: 'perSquareMeter',
      label: 'Per square meter',
      text: square,
    }),
  ],
})

const totalMetric = metric({
  id: 'total',
  label: 'Total energy',
  annual: '118 MWh',
  square: '142 kWh/m2',
})

const electricityMetric = metric({
  id: 'electricity',
  label: 'Electricity',
  annual: '38 MWh',
  square: '46 kWh/m2',
})

const heatingMetric = metric({
  id: 'heating',
  label: 'Heating',
  annual: '80 MWh',
  square: '96 kWh/m2',
})

const waterHeatingMetric = metric({
  id: 'waterHeating',
  label: 'Water heating',
  annual: '10 MWh',
  square: '12 kWh/m2',
})

const createAnnualPrimaryMetric = ({
  id,
  label,
  text,
  unitKey,
}: {
  id: Extract<EnergymapBuildingInfoPrimaryMetricId, 'cost' | 'co2'>
  label: string
  text: string
  unitKey: string
}): EnergymapBuildingInfoPrimaryMetric => ({
  id,
  label: plain(label),
  ariaLabelKey: `sidebar.building_info.panels.energy.primary.${id}`,
  supported: true,
  value: {
    text: plain(text),
    status: 'estimate',
    unitKey,
  },
})

const createControls = ({
  defaultPrimaryMetricId = 'energy',
}: {
  defaultPrimaryMetricId?: EnergymapBuildingInfoPrimaryMetricId
} = {}): EnergymapBuildingInfoConsumptionControls => ({
  defaultPrimaryMetricId,
  primaryMetrics: [
    {
      id: 'energy',
      label: plain('Energy'),
      ariaLabelKey: 'sidebar.building_info.panels.energy.primary.energy',
      supported: true,
    },
    {
      id: 'water',
      label: plain('Water'),
      ariaLabelKey: 'sidebar.building_info.panels.energy.primary.water',
      supported: true,
      value: {
        text: plain('481.8'),
        status: 'estimate',
        unitKey: 'sidebar.building_info.units.cubic_meters_per_year',
        sourceProperties: ['floor_area'],
      },
      residentCountControl: {
        defaultValue: 11,
        minValue: 1,
        maxValue: 10000,
        label: plain('Estimated number of residents'),
        toggleLabel: plain('Change number of residents'),
        description: plain(
          'The number of residents is estimated from the building area. You can temporarily model another number. The Water estimate is not measured consumption or resident data.'
        ),
        unavailableText: plain('Enter a whole number between 1 and 10,000.'),
      },
    },
    createAnnualPrimaryMetric({
      id: 'cost',
      label: 'Cost',
      text: '19,613',
      unitKey: 'sidebar.building_info.units.eur_per_year',
    }),
    createAnnualPrimaryMetric({
      id: 'co2',
      label: 'CO2',
      text: '18,436',
      unitKey: 'sidebar.building_info.units.kg_co2_per_year',
    }),
  ],
  defaultEnergySubmetricIds: ['electricity', 'heating'],
  energySubmetrics: [
    {
      id: 'electricity',
      label: plain('Electricity'),
      ariaLabelKey: 'panels.energy.series.electricity',
      supported: true,
      defaultSelected: true,
      metric: electricityMetric,
    },
    {
      id: 'heating',
      label: plain('Heating'),
      ariaLabelKey: 'panels.energy.series.heating',
      supported: true,
      defaultSelected: true,
      metric: heatingMetric,
    },
    {
      id: 'waterHeating',
      label: plain('Water heating'),
      ariaLabelKey: 'panels.energy.series.water_heating',
      supported: true,
      defaultSelected: false,
      metric: waterHeatingMetric,
    },
  ],
  combinedEnergyMetric: totalMetric,
})

type FixtureCurrentClassOrigin = 'modeled' | 'official' | 'originUnknown'

const createPanels = ({
  currentClassOrigin = 'modeled',
  defaultPrimaryMetricId = 'energy',
  recommendationSourceLanguage = 'fi',
}: {
  currentClassOrigin?: FixtureCurrentClassOrigin
  defaultPrimaryMetricId?: EnergymapBuildingInfoPrimaryMetricId
  recommendationSourceLanguage?: keyof typeof CERTIFICATE_RECOMMENDATIONS_BY_LANGUAGE
} = {}): EnergymapBuildingInfoPanel[] => [
  {
    id: 'energyConsumption',
    title: plain('Estimated energy consumption'),
    description: plain('Consumption values for the selected building.'),
    sections: [
      {
        id: 'estimatedConsumption',
        title: plain('Energy estimate'),
        consumptionControls: createControls({
          defaultPrimaryMetricId,
        }),
        notes: [
          {
            id: 'estimate-note',
            text: plain(
              'Values combine registry data and estimated heating demand.'
            ),
            status: 'estimate',
          },
        ],
      },
      {
        id: 'calculationContext',
        title: plain('Calculation details'),
        rows: [
          {
            id: 'costMode',
            label: plain('Cost basis'),
            text: plain(
              'The annual cost estimate uses the current reference prices for the building heating profile.'
            ),
            status: 'estimate',
            sourceProperties: ['heating_method'],
          },
          {
            id: 'co2Mode',
            label: plain('CO2 basis'),
            text: plain(
              'The annual emissions estimate uses the current reference emission factors.'
            ),
            status: 'estimate',
            sourceProperties: ['heating_energy_source'],
          },
        ],
      },
    ],
  },
  {
    id: 'renovationRecommendations',
    title: plain('Renovation recommendations'),
    description: plain(
      'When available, energy-certificate recommendations are shown as provided in the source data. Published consumption scenarios are shown separately as estimates.'
    ),
    sections: [
      {
        id: 'publishedRecommendations',
        rows: [
          {
            id: 'energyCertificateRecommendations',
            label: plain('Energy-certificate recommendations'),
            text: plain(
              CERTIFICATE_RECOMMENDATIONS_BY_LANGUAGE[
                recommendationSourceLanguage
              ]
            ),
            status: 'real',
            sourceProperties: [
              `energy_certificate_recommendations_${recommendationSourceLanguage}`,
            ],
            sourceLanguage: recommendationSourceLanguage,
            presentation: 'expandableSourceText',
          },
        ],
      },
      {
        id: 'scenarioComparison',
        title: plain('Scenario comparison'),
        description: plain('Estimated savings compared with current demand.'),
        scenarios: [
          {
            id: 'aahp',
            label: plain('Air-to-air heat pump'),
            values: [
              value({
                id: 'savingsPercent',
                label: 'Savings',
                text: '18%',
              }),
              value({
                id: 'annualTotal',
                label: 'Annual total',
                text: '96 MWh',
              }),
              value({
                id: 'perSquareMeter',
                label: 'Per square meter',
                text: '116 kWh/m2',
              }),
            ],
          },
          {
            id: 'solar',
            label: plain('Solar panels'),
            values: [
              value({
                id: 'savingsPercent',
                label: 'Savings',
                text: '9%',
              }),
              value({
                id: 'annualTotal',
                label: 'Annual total',
                text: '107 MWh',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'buildingDetails',
    title: plain('Building details'),
    description: plain('Registry information for the selected building.'),
    sections: [
      {
        id: 'address',
        variant: 'buildingSubheader',
        rows: [
          {
            id: 'address',
            label: plain('Address'),
            text: plain('Keskuskatu 1, Helsinki'),
            status: 'real',
          },
        ],
      },
      {
        id: 'properties',
        rows: [
          {
            id: 'buildingType',
            label: plain('Use'),
            text: plain('Apartment building'),
            status: 'real',
          },
        ],
      },
      {
        id: 'energyCertificate',
        variant: 'energyCertificate',
        rows: [
          {
            id: 'energyClass',
            label: plain('Energy class'),
            text: plain('C'),
            status: 'real',
            sourceProperties:
              currentClassOrigin === 'originUnknown'
                ? ['energy_class']
                : ['energy_class', 'is_energy_class_modeled'],
            ...(currentClassOrigin === 'modeled'
              ? {
                  modeledIndicator: {
                    label: translation(
                      'sidebar.building_info.panels.building.energy_class_modeled.label'
                    ),
                    tooltip: translation(
                      'sidebar.building_info.panels.building.energy_class_modeled.tooltip'
                    ),
                    ariaLabelKey:
                      'sidebar.building_info.panels.building.energy_class_modeled.help_aria_label',
                    sourceProperties: ['is_energy_class_modeled'],
                  },
                }
              : {}),
          },
          {
            id: 'energyCertificateValidity',
            label: plain('Latest energy certificate valid until'),
            text: plain('12/31/2031'),
            status: 'real',
            sourceProperties: ['energy_certificate_valid_until'],
          },
        ],
      },
      {
        id: 'technicalDetails',
        rows: [
          {
            id: 'heatedNetArea',
            label: plain('Heated net area on energy certificate'),
            text: plain('1,234.6'),
            status: 'real',
            unitKey: 'sidebar.building_info.units.square_meters',
            sourceProperties: ['energy_certificate_heated_net_area'],
          },
          {
            id: 'ventilation',
            label: plain('Ventilation'),
            text: plain(
              'Koneellinen tulo- ja poistoilmanvaihto lämmöntalteenotolla; ilmanvaihtojärjestelmän pitkää lähdekuvausta käytetään rivin rivityksen tarkistamiseen.'
            ),
            status: 'real',
            sourceProperties: ['energy_certificate_ventilation_description_fi'],
            sourceLanguage: 'fi',
          },
        ],
      },
    ],
  },
]

type FixtureTopology =
  | 'complete'
  | 'sparseBasic'
  | 'sparseTwoTabs'
  | 'buildingOnly'
  | 'nestedControls'
  | 'renovationOnly'
  | 'renovationWithoutComparison'
  | 'comparisonOnly'
  | 'renovationComparisonTwoTop'
  | 'emptyPanel'
  | 'empty'

const createFixturePanels = ({
  topology = 'complete',
  currentClassOrigin,
  defaultPrimaryMetricId,
  recommendationSourceLanguage,
}: {
  topology?: FixtureTopology
  currentClassOrigin?: FixtureCurrentClassOrigin
  defaultPrimaryMetricId?: EnergymapBuildingInfoPrimaryMetricId
  recommendationSourceLanguage?: keyof typeof CERTIFICATE_RECOMMENDATIONS_BY_LANGUAGE
} = {}) => {
  const completePanels = createPanels({
    currentClassOrigin,
    defaultPrimaryMetricId,
    recommendationSourceLanguage,
  })
  const energyPanel = completePanels.find(
    (panel) => panel.id === 'energyConsumption'
  )
  const renovationPanel = completePanels.find(
    (panel) => panel.id === 'renovationRecommendations'
  )
  const buildingPanel = completePanels.find(
    (panel) => panel.id === 'buildingDetails'
  )

  if (topology === 'empty') {
    return []
  }

  if (topology === 'emptyPanel') {
    return energyPanel == null ? [] : [{ ...energyPanel, sections: [] }]
  }

  if (topology === 'buildingOnly') {
    return buildingPanel == null ? [] : [buildingPanel]
  }

  if (topology === 'renovationOnly') {
    return renovationPanel == null ? [] : [renovationPanel]
  }

  if (topology === 'renovationWithoutComparison') {
    return renovationPanel == null
      ? []
      : [
          {
            ...renovationPanel,
            sections: renovationPanel.sections.filter(
              (section) => section.id !== 'scenarioComparison'
            ),
          },
        ]
  }

  if (topology === 'comparisonOnly') {
    return renovationPanel == null
      ? []
      : [
          {
            ...renovationPanel,
            sections: renovationPanel.sections.filter(
              (section) => section.id === 'scenarioComparison'
            ),
          },
        ]
  }

  if (topology === 'renovationComparisonTwoTop') {
    return energyPanel == null || renovationPanel == null
      ? []
      : [energyPanel, renovationPanel]
  }

  if (energyPanel == null) {
    return []
  }

  const sparseEnergyPanel = {
    ...energyPanel,
    sections: energyPanel.sections.filter(
      (section) => section.id === 'estimatedConsumption'
    ),
  }

  if (topology === 'sparseBasic') {
    return [sparseEnergyPanel]
  }

  if (topology === 'sparseTwoTabs') {
    return renovationPanel == null
      ? [sparseEnergyPanel]
      : [
          sparseEnergyPanel,
          {
            ...renovationPanel,
            sections: renovationPanel.sections.filter(
              (section) => section.id !== 'scenarioComparison'
            ),
          },
        ]
  }

  if (topology === 'nestedControls') {
    return [
      {
        ...sparseEnergyPanel,
        sections: sparseEnergyPanel.sections.map((section) => {
          const controls = section.consumptionControls
          const waterMetric = controls?.primaryMetrics.find(
            (metric) => metric.id === 'water'
          )

          return waterMetric == null
            ? section
            : {
                ...section,
                consumptionControls: {
                  defaultPrimaryMetricId: 'water' as const,
                  primaryMetrics: [waterMetric],
                },
              }
        }),
      },
    ]
  }

  return completePanels
}

const getFixtureExtensionOptions = ({
  forceMobileLayout,
  isDesktopFullscreenLayout,
  desktopContentWidthPx,
}: {
  forceMobileLayout: boolean
  isDesktopFullscreenLayout: boolean
  desktopContentWidthPx?: number
}): SidebarPanelExtensionRuntimeOptions => ({
  visiblePanels: ['main'],
  activePanel: 'main',
  width: 'wide',
  chrome: 'hidden',
  panelLayout: 'single',
  forceMobileLayout,
  layoutMode: isDesktopFullscreenLayout ? 'fullscreen' : 'default',
  ...(isDesktopFullscreenLayout || desktopContentWidthPx == null
    ? {}
    : { desktopMainPanelWidth: `${desktopContentWidthPx}px` }),
})

const BuildingInfoPanelFixtureChrome = ({
  options,
}: {
  options: SidebarPanelExtensionRuntimeOptions
}) => {
  const tabsRegistry = useSidebarPanelExtensionTabsRegistryContext()
  const tabsState = tabsRegistry.registry[FIXTURE_EXTENSION_ID]
  const tabs = tabsState?.tabs ?? []
  const resolvedActiveTabId =
    tabs.find((tab) => tab.tabId === tabsState?.activeTabId)?.tabId ??
    tabs[0]?.tabId
  const hasTabRail = tabs.length >= 2
  const desktopTabRail = hasTabRail ? (
    <SidebarPanelExtensionTabRail
      tabs={tabs}
      activeTabId={resolvedActiveTabId}
      placement="desktop"
      orientation={options.layoutMode === 'fullscreen' ? 'row' : 'column'}
      onTabChange={(tabId) =>
        tabsRegistry.setActiveTabId(FIXTURE_EXTENSION_ID, tabId)
      }
    />
  ) : undefined
  const mobileTabRail = hasTabRail ? (
    <SidebarPanelExtensionTabRail
      tabs={tabs}
      activeTabId={resolvedActiveTabId}
      placement="mobile"
      onTabChange={(tabId) =>
        tabsRegistry.setActiveTabId(FIXTURE_EXTENSION_ID, tabId)
      }
    />
  ) : undefined

  return (
    <SidebarPanelExtension
      extensionId={FIXTURE_EXTENSION_ID}
      options={options}
      visible
      desktopTabRail={desktopTabRail}
      mobileTabRail={mobileTabRail}
    />
  )
}

const BuildingInfoPanelFixtureState = ({
  activeTabId = 'basic',
  certificateVariant,
  currentClassOrigin = 'modeled',
  defaultPrimaryMetricId,
  forceMobileLayout = false,
  isDesktopFullscreenLayout = false,
  interaction,
  locale = 'en',
  provenanceVariant,
  recommendationSourceLanguage = 'fi',
  topologyVariant = 'complete',
}: {
  activeTabId?: BuildingInfoTabId
  certificateVariant?: CertificateFixtureVariant
  currentClassOrigin?: FixtureCurrentClassOrigin
  defaultPrimaryMetricId?: EnergymapBuildingInfoPrimaryMetricId
  forceMobileLayout?: boolean
  isDesktopFullscreenLayout?: boolean
  recommendationSourceLanguage?: keyof typeof CERTIFICATE_RECOMMENDATIONS_BY_LANGUAGE
  topologyVariant?: FixtureTopology
  interaction?:
    | 'building-details'
    | 'building-switch-complete-to-sparse'
    | 'building-switch-sparse-to-complete'
    | 'calculation-details-expanded'
    | 'provenance-building-change'
    | 'provenance-locale-change'
    | 'provenance-open'
    | 'information-footer'
    | 'provenance-water-disable-reset'
    | 'provenance-water-invalid'
    | 'provenance-water-valid'
    | 'recommendation-expanded'
    | 'water-override'
    | 'energy-water'
  locale?: string
  provenanceVariant?: ProvenanceFixtureVariant
}) => {
  const [renderedTopologyVariant, setRenderedTopologyVariant] =
    React.useState(topologyVariant)
  const [buildingKey, setBuildingKey] = React.useState('fixture-building-a')
  const [buildingSwitchPhase, setBuildingSwitchPhase] = React.useState<
    'initial' | 'interacted' | 'override-enabled' | 'tab-selected' | 'switched'
  >('initial')
  const [provenanceInteractionPhase, setProvenanceInteractionPhase] =
    React.useState<
      | 'initial'
      | 'override-enabled'
      | 'water-value-entered'
      | 'open-requested'
      | 'close-requested'
      | 'disable-requested'
      | 'default-open-requested'
      | 'building-change-requested'
      | 'locale-change-requested'
    >('initial')
  const [renderedLocale, setRenderedLocale] = React.useState(locale)
  const [requestedTabId, setRequestedTabId] = React.useState(activeTabId)
  const previousProvenanceRegionIdRef = React.useRef<string | null>(null)
  const { panels, missingData } = React.useMemo(
    () =>
      certificateVariant != null
        ? createCertificateFixturePresentation({
            variant: certificateVariant,
            locale: renderedLocale,
            buildingKey,
          })
        : provenanceVariant == null
          ? {
              panels: createFixturePanels({
                topology: renderedTopologyVariant,
                currentClassOrigin,
                defaultPrimaryMetricId,
                recommendationSourceLanguage,
              }),
              missingData: null,
            }
          : createProvenanceFixturePresentation({
              variant: provenanceVariant,
              locale: renderedLocale,
              buildingKey,
            }),
    [
      buildingKey,
      certificateVariant,
      currentClassOrigin,
      defaultPrimaryMetricId,
      provenanceVariant,
      recommendationSourceLanguage,
      renderedLocale,
      renderedTopologyVariant,
    ]
  )
  const panelTopology = React.useMemo(
    () => deriveEnergymapBuildingInfoPanelTopology(panels),
    [panels]
  )
  const resolvedTab = resolveEnergymapBuildingInfoTab({
    topology: panelTopology,
    requestedTabId,
  })
  const extensionOptions = React.useMemo(
    () =>
      getFixtureExtensionOptions({
        forceMobileLayout,
        isDesktopFullscreenLayout,
        desktopContentWidthPx: resolvedTab?.desktopContentWidthPx,
      }),
    [
      forceMobileLayout,
      isDesktopFullscreenLayout,
      resolvedTab?.desktopContentWidthPx,
    ]
  )
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [interactionReady, setInteractionReady] = React.useState(false)

  React.useEffect(() => {
    if (interaction == null) {
      return
    }

    const root = rootRef.current
    if (root == null) {
      return
    }

    let interactionRequested = false
    let observer: MutationObserver | null = null
    let footerScrollFrame: number | null = null

    const markReady = () => {
      observer?.disconnect()
      setInteractionReady(true)
    }

    const prepareInteraction = () => {
      if (interaction === 'energy-water') {
        const water = root.querySelector<HTMLButtonElement>(
          '[data-primary-metric-id="water"]'
        )
        if (water == null) return
        if (water.getAttribute('aria-pressed') !== 'true') {
          water.click()
          return
        }
        if (
          root.querySelector(
            '[data-testid="building-info-energy-consumption-values"]'
          ) == null
        )
          markReady()
        return
      }
      if (interaction === 'information-footer') {
        const trigger = root.querySelector<HTMLButtonElement>(
          `[data-testid="building-info-tab-page-${activeTabId}"] [data-testid="building-info-provenance-trigger"]`
        )
        if (trigger == null || footerScrollFrame != null) return
        // Wait for the requested tab and its scroll host to finish mounting.
        footerScrollFrame = window.requestAnimationFrame(() => {
          trigger.scrollIntoView({ block: 'center' })
          markReady()
        })
        return
      }

      if (
        interaction === 'provenance-open' ||
        interaction === 'provenance-building-change' ||
        interaction === 'provenance-locale-change' ||
        interaction === 'provenance-water-valid' ||
        interaction === 'provenance-water-invalid' ||
        interaction === 'provenance-water-disable-reset'
      ) {
        const isWaterInteraction = interaction.startsWith('provenance-water-')
        const overrideSwitch = root.querySelector<HTMLInputElement>(
          '[data-testid="building-info-water-resident-control"] input[role="switch"]'
        )
        const residentControl = root.querySelector<HTMLElement>(
          '[data-testid="building-info-water-resident-control"]'
        )
        const residentInput = root.querySelector<HTMLInputElement>(
          '[data-testid="building-info-water-resident-value-slot"] input'
        )
        const trigger = root.querySelector<HTMLButtonElement>(
          '[data-testid="building-info-provenance-trigger"]'
        )
        const provenanceView = root.querySelector<HTMLElement>(
          '[data-testid="building-info-provenance-view"][data-missing-data-status]'
        )
        const waterMissing = root.querySelector(
          '[data-missing-item-id="energyConsumption.water"]'
        )

        if (
          isWaterInteraction &&
          provenanceInteractionPhase === 'initial' &&
          overrideSwitch != null &&
          !overrideSwitch.checked
        ) {
          overrideSwitch.click()
          setProvenanceInteractionPhase('override-enabled')
          return
        }

        if (
          isWaterInteraction &&
          provenanceInteractionPhase === 'override-enabled' &&
          overrideSwitch?.checked &&
          residentInput != null
        ) {
          setFixtureInputValue(
            residentInput,
            interaction === 'provenance-water-invalid' ? '' : '3'
          )
          setProvenanceInteractionPhase('water-value-entered')
          return
        }

        if (
          provenanceInteractionPhase === 'initial' &&
          !isWaterInteraction &&
          trigger != null &&
          trigger.getAttribute('aria-expanded') !== 'true'
        ) {
          trigger.click()
          setProvenanceInteractionPhase('open-requested')
          return
        }

        if (
          isWaterInteraction &&
          provenanceInteractionPhase === 'water-value-entered'
        ) {
          if (
            trigger == null ||
            residentInput == null ||
            residentInput.value !==
              (interaction === 'provenance-water-invalid' ? '' : '3') ||
            residentControl?.dataset.provenanceInputIds !==
              ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(
                ' '
              ) ||
            (interaction === 'provenance-water-invalid' &&
              root.querySelector(
                '[data-testid="building-info-unavailable-value-icon"]'
              ) == null)
          ) {
            return
          }

          if (interaction === 'provenance-water-invalid') {
            residentInput.focus()
            trigger.dispatchEvent(
              new PointerEvent('pointerdown', {
                bubbles: true,
                pointerType: 'touch',
              })
            )
            residentInput.blur()
          }
          trigger.click()
          setProvenanceInteractionPhase('open-requested')
          return
        }

        if (provenanceInteractionPhase === 'open-requested') {
          if (
            trigger?.getAttribute('aria-expanded') !== 'true' ||
            provenanceView == null
          ) {
            return
          }

          if (interaction === 'provenance-building-change') {
            previousProvenanceRegionIdRef.current =
              trigger.getAttribute('aria-controls')
            setBuildingKey('fixture-building-b')
            setProvenanceInteractionPhase('building-change-requested')
            return
          }

          if (interaction === 'provenance-locale-change') {
            setRenderedLocale('en')
            setProvenanceInteractionPhase('locale-change-requested')
            return
          }

          if (
            isWaterInteraction &&
            (waterMissing != null) !==
              (interaction === 'provenance-water-invalid')
          )
            return

          if (interaction === 'provenance-water-disable-reset') {
            const closeButton =
              provenanceView.querySelector<HTMLButtonElement>('button')
            if (closeButton == null) {
              return
            }

            closeButton.click()
            setProvenanceInteractionPhase('close-requested')
            return
          }

          markReady()
          return
        }

        if (provenanceInteractionPhase === 'close-requested') {
          if (
            trigger?.getAttribute('aria-expanded') !== 'false' ||
            overrideSwitch == null ||
            !overrideSwitch.checked
          ) {
            return
          }

          overrideSwitch.click()
          setProvenanceInteractionPhase('disable-requested')
          return
        }

        if (provenanceInteractionPhase === 'disable-requested') {
          if (
            trigger == null ||
            overrideSwitch?.checked !== false ||
            residentInput != null ||
            residentControl?.dataset.provenanceInputIds !==
              ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(
                ' '
              )
          ) {
            return
          }

          trigger.click()
          setProvenanceInteractionPhase('default-open-requested')
          return
        }

        if (provenanceInteractionPhase === 'default-open-requested') {
          if (
            trigger?.getAttribute('aria-expanded') === 'true' &&
            provenanceView != null &&
            waterMissing == null &&
            residentControl?.dataset.provenanceInputIds ===
              ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(
                ' '
              )
          ) {
            markReady()
          }
          return
        }

        if (provenanceInteractionPhase === 'building-change-requested') {
          const certificateSelectionReplaced =
            certificateVariant === 'selectionSwap' &&
            root.querySelector(
              '[data-energy-submetric-id="electricity"][aria-pressed="true"]'
            ) != null &&
            root.querySelector(
              '[data-energy-submetric-id="heating"][aria-pressed="true"]'
            ) != null &&
            root.querySelector('[data-primary-metric-id="energy"]') != null

          if (
            trigger?.getAttribute('aria-expanded') === 'false' &&
            trigger.getAttribute('aria-controls') !==
              previousProvenanceRegionIdRef.current &&
            (certificateSelectionReplaced ||
              root
                .querySelector('[data-testid="building-info-tab-page-basic"]')
                ?.textContent?.includes('Mikkolantie 35'))
          ) {
            markReady()
          }
          return
        }

        if (provenanceInteractionPhase === 'locale-change-requested') {
          if (
            trigger?.getAttribute('aria-expanded') === 'true' &&
            provenanceView?.dataset.missingDataLocale === 'en'
          ) {
            markReady()
          }
        }
        return
      }

      if (interaction === 'building-switch-complete-to-sparse') {
        if (buildingSwitchPhase === 'initial') {
          const waterButton = root.querySelector<HTMLButtonElement>(
            '[data-primary-metric-id="water"]'
          )

          if (waterButton != null) {
            waterButton.click()
            setBuildingSwitchPhase('interacted')
          }
          return
        }

        if (buildingSwitchPhase === 'interacted') {
          if (
            root.querySelector(
              '[data-testid="building-info-water-resident-control"]'
            ) != null
          ) {
            setRenderedTopologyVariant('sparseBasic')
            setBuildingKey('fixture-building-b')
            setBuildingSwitchPhase('switched')
          }
          return
        }

        if (
          root.querySelector(
            '[data-testid="building-info-grid-row-basic"][data-grid-region-count="1"]'
          ) != null &&
          root.querySelector(
            '[data-testid="building-info-panel-buildingDetails"]'
          ) == null
        ) {
          markReady()
        }
        return
      }

      if (interaction === 'building-switch-sparse-to-complete') {
        if (buildingSwitchPhase === 'initial') {
          const waterButton = root.querySelector<HTMLButtonElement>(
            '[data-primary-metric-id="water"]'
          )

          if (waterButton != null) {
            waterButton.click()
            setBuildingSwitchPhase('interacted')
          }
          return
        }

        if (buildingSwitchPhase === 'interacted') {
          const overrideSwitch = root.querySelector<HTMLInputElement>(
            '[data-testid="building-info-water-resident-control"] input[role="switch"]'
          )

          if (overrideSwitch != null) {
            overrideSwitch.click()
            setBuildingSwitchPhase('override-enabled')
          }
          return
        }

        if (buildingSwitchPhase === 'override-enabled') {
          const renovationTab = root.querySelector<HTMLButtonElement>(
            'button[role="tab"][aria-label="Open renovation recommendations"]'
          )

          if (
            root.querySelector(
              '[data-testid="building-info-water-resident-value-slot"] input'
            ) != null &&
            renovationTab != null
          ) {
            renovationTab.click()
            setBuildingSwitchPhase('tab-selected')
          }
          return
        }

        if (buildingSwitchPhase === 'tab-selected') {
          if (
            root.querySelector(
              '[data-testid="building-info-tab-page-renovation"]'
            ) != null
          ) {
            setRequestedTabId('basic')
            setRenderedTopologyVariant('complete')
            setBuildingKey('fixture-building-b')
            setBuildingSwitchPhase('switched')
          }
          return
        }

        const selectedBasicTab = root.querySelector<HTMLButtonElement>(
          'button[role="tab"][aria-label="Open energy and building information"][aria-selected="true"]'
        )
        const primaryMetric = root.querySelector<HTMLElement>(
          '[data-testid="building-info-primary-metric-value"]'
        )
        const completeBasicLayoutReady =
          root.querySelector(
            '[data-testid="building-info-grid-row-basic"][data-grid-region-count="2"]'
          ) != null ||
          root.querySelector('[data-testid="building-info-grid"]') == null

        if (
          completeBasicLayoutReady &&
          root.querySelector(
            '[data-testid="building-info-panel-energyConsumption"]'
          ) != null &&
          root.querySelector(
            '[data-testid="building-info-panel-buildingDetails"]'
          ) != null &&
          primaryMetric?.dataset.primaryMetricId === 'energy' &&
          selectedBasicTab != null
        ) {
          markReady()
        }
        return
      }

      if (interaction === 'building-details') {
        const buildingDetails = root.querySelector<HTMLElement>(
          '[data-testid="building-info-panel-buildingDetails"]'
        )

        if (buildingDetails == null) {
          return
        }

        buildingDetails.scrollIntoView({ block: 'start' })
        markReady()
        return
      }

      if (
        interaction === 'calculation-details-expanded' ||
        interaction === 'recommendation-expanded'
      ) {
        const isRecommendation = interaction === 'recommendation-expanded'
        const trigger = root.querySelector<HTMLButtonElement>(
          isRecommendation
            ? '[data-testid="building-info-expandable-source-text-trigger-energyCertificateRecommendations"]'
            : '[data-testid="building-info-calculation-context-trigger"]'
        )

        if (trigger == null) {
          return
        }

        if (
          trigger.getAttribute('aria-expanded') !== 'true' &&
          !interactionRequested
        ) {
          interactionRequested = true
          trigger.click()
        }

        if (trigger.getAttribute('aria-expanded') === 'true') {
          root
            .querySelector<HTMLElement>(
              isRecommendation
                ? '[data-testid="building-info-expandable-source-text-panel-energyCertificateRecommendations"]'
                : '[data-testid="building-info-calculation-context-panel"]'
            )
            ?.scrollIntoView({ block: 'center' })
          markReady()
        }
        return
      }

      const overrideSwitch = root.querySelector<HTMLInputElement>(
        '[data-testid="building-info-water-resident-control"] input[role="switch"]'
      )

      if (overrideSwitch == null) {
        return
      }

      if (!overrideSwitch.checked && !interactionRequested) {
        interactionRequested = true
        overrideSwitch.click()
      }

      if (
        overrideSwitch.checked &&
        root.querySelector(
          '[data-testid="building-info-water-resident-value-slot"] input'
        ) != null
      ) {
        markReady()
      }
    }

    observer = new MutationObserver(prepareInteraction)
    observer.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
    })
    prepareInteraction()

    return () => {
      observer?.disconnect()
      if (footerScrollFrame != null) {
        window.cancelAnimationFrame(footerScrollFrame)
      }
    }
  }, [
    activeTabId,
    buildingSwitchPhase,
    certificateVariant,
    interaction,
    provenanceInteractionPhase,
  ])

  return (
    <>
      {provenanceVariant === 'waterNoDefault' && (
        <Box
          sx={{
            position: 'fixed',
            right: '1rem',
            bottom: '1rem',
            zIndex: 2000,
          }}
        >
          <button
            type="button"
            data-testid="water-fixture-change-building"
            onClick={() =>
              setBuildingKey((current) =>
                current === 'fixture-building-a'
                  ? 'fixture-building-b'
                  : 'fixture-building-a'
              )
            }
          >
            Select another residential building
          </button>
        </Box>
      )}
      <SlotsProvider>
        <SidebarPanelExtensionTabsProvider>
          <SidebarPanelExtensionContextProvider
            value={{ extensionId: FIXTURE_EXTENSION_ID, depth: 0 }}
          >
            <Box
              ref={rootRef}
              data-fixture-building-key={buildingKey}
              data-fixture-certificate-variant={certificateVariant}
              data-fixture-locale={renderedLocale}
              data-fixture-provenance-interaction-phase={
                provenanceInteractionPhase
              }
              sx={{
                position: 'relative',
                width: forceMobileLayout ? 390 : 960,
                height: 760,
                maxWidth: '100%',
                overflow: 'hidden',
                backgroundColor: '#e7ece7',
              }}
            >
              <IntoSidebarPanelExtensionPanelSlot panelId="main">
                <BuildingInfoTabPages
                  key={buildingKey}
                  missingData={missingData}
                  locale={renderedLocale}
                  topology={panelTopology}
                  ariaLabels={ariaLabels}
                  activeTabId={resolvedTab?.id}
                  forceMobileLayout={forceMobileLayout}
                  isDesktopFullscreenLayout={isDesktopFullscreenLayout}
                  onActiveTabChange={setRequestedTabId}
                  onClose={noop}
                  onCollapse={noop}
                />
              </IntoSidebarPanelExtensionPanelSlot>
              {resolvedTab != null && (
                <BuildingInfoPanelFixtureChrome options={extensionOptions} />
              )}
              {resolvedTab == null && (
                <Box data-testid="building-info-fixture-empty-ready" />
              )}
              {interactionReady && (
                <Box data-testid="building-info-fixture-interaction-ready" />
              )}
            </Box>
          </SidebarPanelExtensionContextProvider>
        </SidebarPanelExtensionTabsProvider>
      </SlotsProvider>
    </>
  )
}

const ActionRailFixtureState = ({
  availableModes,
}: {
  availableModes: readonly BuildingInfoDesktopMode[]
}) => (
  <Box
    sx={{
      p: 2,
      backgroundColor: '#e7ece7',
    }}
  >
    <BuildingInfoActionRail
      activeMode="twoPanel"
      availableModes={availableModes}
      isCollapsed
      orientation="row"
      ariaLabels={ariaLabels}
      onModeChange={noop}
    />
  </Box>
)

export const energymapBuildingInfoPanelFixture: ComponentFixture = {
  id: 'energymap-building-info-panel',
  label: 'Energiakartta building info panel',
  description:
    'Energiakartta building-info panel tabs, metric controls, mobile layout, and collapsed action rail.',
  sourceGlobs: [
    'src/applets/energy/common/buildingInfo.ts',
    'src/applets/energy/common/buildingInfo.test.ts',
    'src/applets/energy/common/buildingInfoPanelRuntime.ts',
    'src/applets/energy/common/layoutConstants.ts',
    'src/applets/energy/common/buildingInfoPanelTopology.ts',
    'src/applets/energy/common/buildingInfoPanelTopology.test.ts',
    'src/applets/energy/common/buildingInfoProvenance.ts',
    'src/applets/energy/common/buildingInfoProvenanceSummary.ts',
    'src/applets/energy/components/BuildingInfoPanel.tsx',
    'src/applets/energy/components/BuildingInfoPanel.test.tsx',
    'src/applets/energy/components/BuildingInfoProvenanceView.tsx',
    'src/applets/energy/components/BuildingInfoProvenanceView.test.tsx',
    'src/components/Sidebar/SidebarPanelExtensionPageContainer.tsx',
    'src/common/component-fixtures/fixtures/EnergymapBuildingInfoPanelFixture.tsx',
    'src/applets/energy/common/buildingInfoEvidence.ts',
    'src/applets/energy/common/buildingInfoMissingData.ts',
    'src/applets/energy/common/energyCertificateConsumption.ts',
    'src/applets/energy/common/currentReferenceCalculations.ts',
  ],
  canvasSx: {
    p: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  states: [
    {
      id: 'information-footer-basic',
      label: 'Building details footer',
      description:
        'Basic tab information button below the last building-details row.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="official"
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-renovation',
      label: 'Renovation details footer',
      description:
        'Renovation tab information button below the last building-details row.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="official"
          activeTabId="renovation"
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-sparse',
      label: 'Sparse information footer',
      description:
        'Information footer after the surviving Water panel when building details is absent.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="waterOnly"
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-basic-fi',
      label: 'Building details footer FI',
      locale: 'fi',
      description:
        'Basic tab information icon below the last building-details row.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="official"
          interaction="information-footer"
        />
      ),
    },
    ...(['fi', 'en'] as const).flatMap((locale) =>
      [false, true].map((forceMobileLayout) => ({
        id: `information-footer-sparse-${forceMobileLayout ? 'forced-mobile-' : ''}${locale}`,
        label: `Sparse information footer ${forceMobileLayout ? 'forced mobile ' : ''}${locale.toUpperCase()}`,
        locale,
        description:
          'Sparse Water panel, information footer and provenance with the independent Energy 32px mobile gutter.',
        waitFor:
          '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
        render: () => (
          <BuildingInfoPanelFixtureState
            locale={locale}
            forceMobileLayout={forceMobileLayout}
            provenanceVariant="waterOnly"
            interaction="information-footer"
          />
        ),
      }))
    ),

    {
      id: 'information-footer-renovation-fi',
      label: 'Renovation details footer FI',
      locale: 'fi',
      description:
        'Renovation tab information icon below the last building-details row.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="official"
          activeTabId="renovation"
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-fullscreen-fi',
      label: 'Fullscreen information footer FI',
      locale: 'fi',
      description:
        'Information icon in the desktop fullscreen extension shell.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="official"
          isDesktopFullscreenLayout
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-fullscreen-en',
      label: 'Fullscreen information footer EN',
      locale: 'en',
      description:
        'Information icon in the desktop fullscreen extension shell.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="en"
          provenanceVariant="official"
          isDesktopFullscreenLayout
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-forced-mobile-fi',
      label: 'Forced mobile information footer FI',
      locale: 'fi',
      description: 'Stacked details footer at a desktop viewport.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="official"
          forceMobileLayout
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-forced-mobile-en',
      label: 'Forced mobile information footer EN',
      locale: 'en',
      description: 'Stacked details footer at a desktop viewport.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="en"
          provenanceVariant="official"
          forceMobileLayout
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-details-only-fi',
      label: 'Details-only information footer FI',
      locale: 'fi',
      description:
        'Information access with a property identifier and no calculation data.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="propertyOnly"
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-footer-details-only-en',
      label: 'Details-only information footer EN',
      locale: 'en',
      description:
        'Information access with a property identifier and no calculation data.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="en"
          provenanceVariant="propertyOnly"
          interaction="information-footer"
        />
      ),
    },

    {
      id: 'information-unavailable-open',
      label: 'Diagnostics unavailable',
      description:
        'Explicit unavailable-diagnostics status for authored panels without source candidates.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState interaction="provenance-open" />
      ),
    },

    {
      id: 'property-ordinary-fi',
      label: 'Property ordinary FI',
      locale: 'fi',
      description: 'Registry location property in the FI ordinary view.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="property"
          interaction="building-details"
        />
      ),
    },
    {
      id: 'property-provenance-fi',
      label: 'Property provenance FI',
      locale: 'fi',
      description: 'Missing fields for a property-only building, in Finnish.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="propertyOnly"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'property-ordinary-en',
      label: 'Property ordinary EN',
      locale: 'en',
      description: 'Registry location property in the EN ordinary view.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="en"
          provenanceVariant="property"
          interaction="building-details"
        />
      ),
    },
    {
      id: 'property-provenance-en',
      label: 'Property provenance EN',
      locale: 'en',
      description: 'Missing fields for a property-only building, in English.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="en"
          provenanceVariant="propertyOnly"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'property-only',
      label: 'Property-only identity',
      description:
        'A property identifier alone makes building details available.',
      render: () => (
        <BuildingInfoPanelFixtureState provenanceVariant="propertyOnly" />
      ),
    },
    {
      id: 'property-selection-reset',
      label: 'Property selection reset',
      description:
        'Open missing-information view resets when replaced by a building without property data.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="property"
          interaction="provenance-building-change"
        />
      ),
    },
    {
      id: 'property-ordinary-mobile',
      label: 'Property ordinary mobile',
      description: 'Property identifier in the forced mobile building details.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="property"
          forceMobileLayout
          interaction="building-details"
        />
      ),
    },
    {
      id: 'property-provenance-mobile',
      label: 'Property provenance mobile',
      description:
        'Missing fields for a property-only building in the mobile information view.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="propertyOnly"
          forceMobileLayout
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'desktop-basic',
      label: 'Desktop basic',
      description: 'Basic two-panel tab with metric controls.',
      waitFor: '[data-testid="building-info-tab-page-basic"]',
      render: () => <BuildingInfoPanelFixtureState activeTabId="basic" />,
    },
    {
      id: 'desktop-renovation',
      label: 'Desktop renovation',
      description: 'Renovation tab with comparison and effectiveness content.',
      waitFor: '[data-testid="building-info-tab-page-renovation"]',
      render: () => <BuildingInfoPanelFixtureState activeTabId="renovation" />,
    },
    {
      id: 'desktop-sparse-basic',
      label: 'Desktop sparse basic',
      description: 'One available energy panel with no empty companion cell.',
      waitFor:
        '[data-testid="building-info-grid-row-basic"][data-grid-region-count="1"]',
      render: () => (
        <BuildingInfoPanelFixtureState topologyVariant="sparseBasic" />
      ),
    },
    {
      id: 'desktop-building-only',
      label: 'Desktop building only',
      description: 'Building-only basic tab with the energy region omitted.',
      waitFor: '[data-testid="building-info-panel-buildingDetails"]',
      render: () => (
        <BuildingInfoPanelFixtureState topologyVariant="buildingOnly" />
      ),
    },
    {
      id: 'desktop-renovation-no-comparison',
      label: 'Renovation without comparison',
      description:
        'Recommendation content without comparison or effectiveness regions.',
      waitFor: '[data-testid="building-info-grid-row-renovationTop"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          topologyVariant="renovationWithoutComparison"
        />
      ),
    },
    {
      id: 'desktop-renovation-comparison-only',
      label: 'Renovation comparison only',
      description: 'Comparison and effectiveness row without an empty top row.',
      waitFor: '[data-testid="building-info-grid-row-renovationComparison"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          topologyVariant="comparisonOnly"
        />
      ),
    },
    {
      id: 'desktop-renovation-comparison-one-top',
      label: 'Renovation comparison with one top region',
      description:
        'One retained recommendation region fills the comparison-row width without absent sibling bands.',
      waitFor:
        '[data-testid="building-info-grid-row-renovationTop"][data-grid-region-count="1"][data-grid-content-width="1440"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          topologyVariant="renovationOnly"
        />
      ),
    },
    {
      id: 'desktop-renovation-comparison-two-top',
      label: 'Renovation comparison with two top regions',
      description:
        'Two retained top regions proportionally fill the comparison-row width without a building-details band.',
      waitFor:
        '[data-testid="building-info-grid-row-renovationTop"][data-grid-region-count="2"][data-grid-content-width="1440"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          topologyVariant="renovationComparisonTwoTop"
        />
      ),
    },
    {
      id: 'forced-mobile-renovation-comparison-one-top',
      label: 'Forced mobile comparison with one top region',
      description:
        'The same comparison-plus-recommendation topology rendered as one stacked mobile panel.',
      waitFor: '[data-testid="building-info-tab-page-renovation"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          forceMobileLayout
          topologyVariant="renovationOnly"
        />
      ),
    },
    {
      id: 'forced-mobile-renovation-comparison-two-top',
      label: 'Forced mobile comparison with two top regions',
      description:
        'The same comparison-plus-energy-and-recommendation topology rendered as two stacked mobile panels.',
      waitFor: '[data-testid="building-info-calculation-context"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          forceMobileLayout
          topologyVariant="renovationComparisonTwoTop"
        />
      ),
    },
    {
      id: 'desktop-recommendation-expanded',
      label: 'Desktop certificate recommendation expanded',
      description:
        'Expanded long Finnish certificate recommendation with paragraph breaks.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          interaction="recommendation-expanded"
        />
      ),
    },
    {
      id: 'building-details',
      label: 'Building details with modeled class',
      description:
        'Modeled energy-class label and help control plus certificate details.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState interaction="building-details" />
      ),
    },
    {
      id: 'building-details-official',
      label: 'Building details with official class',
      description:
        'Official energy class with no modeled qualifier or help control.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          currentClassOrigin="official"
          interaction="building-details"
        />
      ),
    },
    {
      id: 'building-details-origin-unknown',
      label: 'Building details with unknown class origin',
      description:
        'Energy class with unavailable origin and no modeled qualifier or help control.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          currentClassOrigin="originUnknown"
          interaction="building-details"
        />
      ),
    },
    {
      id: 'calculation-details-expanded',
      label: 'Calculation details expanded',
      description: 'Expanded calculation details with stacked basis text.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState interaction="calculation-details-expanded" />
      ),
    },
    {
      id: 'water-default',
      label: 'Water default',
      description: 'Supported Water estimate with the derived resident count.',
      waitFor: '[data-testid="building-info-water-resident-control"]',
      render: () => (
        <BuildingInfoPanelFixtureState defaultPrimaryMetricId="water" />
      ),
    },
    ...(['en', 'fi'] as const).map((locale) => ({
      id: `water-no-default-${locale}`,
      locale,
      label: `Water without an area-derived default (${locale})`,
      description:
        'Residential selection with absent floor area and an available resident editor; no missing-value row.',
      waitFor: '[data-testid="building-info-water-resident-control"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="waterNoDefault"
          locale={locale}
        />
      ),
    })),
    {
      id: 'certificate-mixed',
      label: 'Mixed district heating fallback',
      description: 'Mixed district heating fallback',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="mixed" locale="en" />
      ),
    },
    {
      id: 'certificate-overlap',
      label: 'Purchased electricity with electric heating',
      description: 'Purchased electricity with electric heating',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="overlap"
          locale="en"
        />
      ),
    },
    {
      id: 'energy-total-only',
      label: 'Independent reference total',
      description: 'Independent reference total',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="totalOnly"
          locale="en"
        />
      ),
    },
    {
      id: 'certificate-energy-only',
      label: 'Energy-only panel',
      description: 'Energy-only panel',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="energyOnly"
          locale="en"
        />
      ),
    },
    {
      id: 'certificate-water-active',
      label: 'Water selected after certificate Energy',
      description: 'Water selected after certificate Energy',
      waitFor: '[data-testid="building-info-fixture-interaction-ready"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="water"
          locale="en"
          interaction="energy-water"
        />
      ),
    },
    {
      id: 'certificate-provenance-fi',
      label: 'Effective Energy information in Finnish',
      description: 'Effective Energy information in Finnish',
      waitFor: '[data-testid="building-info-fixture-interaction-ready"]',
      locale: 'fi',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="reported"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'certificate-mixed-provenance',
      label: 'Effective mixed Energy information',
      description: 'Effective mixed Energy information',
      waitFor: '[data-testid="building-info-fixture-interaction-ready"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="mixed"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'certificate-reported-en',
      label: 'Reported certificate building',
      description:
        'Exact 1036581819 / 318510 certificate fallback with C class, zero registry floor area, all five carriers, and the complete total.',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="reported" />
      ),
    },
    {
      id: 'certificate-reported-fi-mobile',
      label: 'Reported certificate building mobile Finnish',
      locale: 'fi',
      description:
        'Exact reported certificate fallback in Finnish forced-mobile layout.',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="reported"
          forceMobileLayout
          locale="fi"
        />
      ),
    },
    {
      id: 'certificate-water',
      label: 'Water and certificate',
      description: 'Energy and Water share the normal consumption controls.',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="water" />
      ),
    },
    {
      id: 'certificate-partial-reference',
      label: 'Partial reference and certificate',
      description:
        'Registry intensities and certificate annual conversions use coherent basis choices.',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="partialReference" />
      ),
    },
    {
      id: 'certificate-partial-no-area-expired',
      label: 'Partial expired certificate without area',
      description:
        'Partial historical certificate with named and unnamed other carriers, visible zeroes, and no area-derived values.',
      waitFor: '[data-testid="building-info-energy-consumption-values"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="partialNoAreaExpired" />
      ),
    },
    {
      id: 'certificate-complete-reference-suppressed',
      label: 'Complete reference suppresses certificate',
      description:
        'Complete residential reference Energy remains unchanged with no duplicate certificate group.',
      waitFor: '[data-testid="building-info-tab-page-basic"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="completeReference" />
      ),
    },
    {
      id: 'certificate-neither-source',
      label: 'Neither Energy source',
      description:
        'Building details remain while the absent Energy panel and certificate group are omitted.',
      waitFor: '[data-testid="building-info-panel-buildingDetails"]',
      render: () => (
        <BuildingInfoPanelFixtureState certificateVariant="neither" />
      ),
    },
    {
      id: 'certificate-selection-change-reset',
      label: 'Certificate selection replacement',
      description:
        'Open missing information is replaced by a complete-reference building and resets closed without stale certificate gaps.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="selectionSwap"
          interaction="provenance-building-change"
        />
      ),
    },
    {
      id: 'certificate-provenance-open',
      label: 'Certificate provenance open',
      description:
        'Selected Energy values, certificate metadata, derivations and missing information.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          certificateVariant="reported"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-gshp-fi',
      locale: 'fi',
      label: 'source-coverage-gshp-fi',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageGshp"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-gshp-en',
      locale: 'en',
      label: 'source-coverage-gshp-en',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageGshp"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-apartment-fi',
      locale: 'fi',
      label: 'source-coverage-apartment-fi',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageApartment"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-apartment-en',
      locale: 'en',
      label: 'source-coverage-apartment-en',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageApartment"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-wood-fi',
      locale: 'fi',
      label: 'source-coverage-wood-fi',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageWood"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-wood-en',
      locale: 'en',
      label: 'source-coverage-wood-en',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageWood"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-boiler-fi',
      locale: 'fi',
      label: 'source-coverage-boiler-fi',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageBoiler"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-coverage-boiler-en',
      locale: 'en',
      label: 'source-coverage-boiler-en',
      description:
        'Populated unsupported reference columns and invalid effective class with explicit origin evidence.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceCoverageBoiler"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-partial-fi',
      locale: 'fi',
      label: 'source-partial-fi',
      description: 'Production source-specific reasons (fi).',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourcePartial"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-partial-en',
      locale: 'en',
      label: 'source-partial-en',
      description: 'Production source-specific reasons (en).',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourcePartial"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-invalid-fi',
      locale: 'fi',
      label: 'source-invalid-fi',
      description: 'Production source-specific reasons (fi).',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceInvalid"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-invalid-en',
      locale: 'en',
      label: 'source-invalid-en',
      description: 'Production source-specific reasons (en).',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceInvalid"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-unknown-fi',
      locale: 'fi',
      label: 'source-unknown-fi',
      description: 'Production source-specific reasons (fi).',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceUnknown"
          locale="fi"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'source-unknown-en',
      locale: 'en',
      label: 'source-unknown-en',
      description: 'Production source-specific reasons (en).',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="sourceUnknown"
          locale="en"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'provenance-official-open',
      label: 'Official provenance open',
      description:
        'Complete desktop building with an official class and no missing fields.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="official"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'provenance-modeled-open',
      label: 'Modeled provenance open',
      description:
        'Complete desktop building with a modeled class and no missing fields.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="modeled"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'provenance-origin-unknown-open',
      label: 'Origin-unknown provenance open',
      description:
        'Complete desktop building with an unknown class origin and no missing fields.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="originUnknown"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'provenance-building-change-reset',
      label: 'Provenance building change reset',
      description:
        'An open information view resets closed when the selected building changes.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="official"
          interaction="provenance-building-change"
        />
      ),
    },
    {
      id: 'provenance-locale-change-open',
      label: 'Provenance locale change while open',
      description:
        'An open complete-information status updates from Finnish to English without remounting.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          locale="fi"
          provenanceVariant="official"
          interaction="provenance-locale-change"
        />
      ),
    },
    {
      id: 'provenance-water-default-open',
      label: 'Water-only default provenance open',
      description:
        'Sparse Water-only building with missing fields listed and available Water excluded.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="waterOnly"
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'provenance-water-valid-open',
      label: 'Water override provenance open',
      description:
        'Sparse Water-only building with a valid resident override and no missing Water item.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="waterOnly"
          interaction="provenance-water-valid"
        />
      ),
    },
    {
      id: 'provenance-water-disable-reset-open',
      label: 'Water override disabled to default provenance',
      description:
        'A resident override is opened, closed, disabled, and reopened without a missing Water item.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="waterOnly"
          interaction="provenance-water-disable-reset"
        />
      ),
    },
    {
      id: 'provenance-water-invalid-open',
      label: 'Invalid Water provenance open',
      description:
        'Sparse Water-only building with an explicit invalid-resident explanation below the missing Water label.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="waterOnly"
          interaction="provenance-water-invalid"
        />
      ),
    },
    {
      id: 'provenance-modeled-open-mobile',
      label: 'Modeled provenance open mobile',
      description:
        'Complete modeled building with no missing fields in the mobile information view.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          provenanceVariant="modeled"
          forceMobileLayout
          interaction="provenance-open"
        />
      ),
    },
    {
      id: 'water-override',
      label: 'Water override',
      description: 'Supported Water estimate with resident override enabled.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          defaultPrimaryMetricId="water"
          interaction="water-override"
        />
      ),
    },
    {
      id: 'mobile-water-override',
      label: 'Mobile Water override',
      description:
        'Forced stacked Water layout with resident override enabled.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          defaultPrimaryMetricId="water"
          forceMobileLayout
          interaction="water-override"
        />
      ),
    },
    {
      id: 'mobile-renovation',
      label: 'Mobile renovation',
      description: 'Forced stacked layout for the renovation tab.',
      waitFor: '[data-testid="building-info-tab-page-renovation"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          forceMobileLayout
        />
      ),
    },
    {
      id: 'mobile-recommendation-expanded',
      label: 'Mobile certificate recommendation expanded',
      description:
        'Expanded long Swedish certificate recommendation in forced mobile layout.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          activeTabId="renovation"
          forceMobileLayout
          interaction="recommendation-expanded"
          recommendationSourceLanguage="sv"
        />
      ),
    },
    {
      id: 'metric-supported',
      label: 'Supported metric',
      description: 'Supported annual Cost metric selected by default.',
      waitFor: '[data-testid="building-info-tab-page-basic"]',
      render: () => (
        <BuildingInfoPanelFixtureState defaultPrimaryMetricId="cost" />
      ),
    },
    {
      id: 'nested-partial-controls',
      label: 'Nested partial controls',
      description:
        'A single retained Water control without energy submetric wrappers.',
      waitFor: '[data-testid="building-info-water-resident-control"]',
      render: () => (
        <BuildingInfoPanelFixtureState topologyVariant="nestedControls" />
      ),
    },
    {
      id: 'building-switch-complete-to-sparse',
      label: 'Complete to sparse building switch',
      description:
        'Interacts with a complete building before switching to a keyed sparse topology.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState interaction="building-switch-complete-to-sparse" />
      ),
    },
    {
      id: 'building-switch-sparse-to-complete',
      label: 'Sparse to complete building switch',
      description:
        'Changes sparse Water and tab state before switching to a keyed complete topology with defaults restored.',
      waitFor:
        '[data-fixture-building-key]:has([data-testid="building-info-fixture-interaction-ready"])',
      render: () => (
        <BuildingInfoPanelFixtureState
          interaction="building-switch-sparse-to-complete"
          topologyVariant="sparseTwoTabs"
        />
      ),
    },
    {
      id: 'forced-mobile-sparse',
      label: 'Forced mobile sparse',
      description: 'Forced stacked layout with one retained basic panel.',
      waitFor: '[data-testid="building-info-tab-page-basic"]',
      render: () => (
        <BuildingInfoPanelFixtureState
          forceMobileLayout
          topologyVariant="sparseBasic"
        />
      ),
    },
    {
      id: 'responsive-sparse',
      label: 'Responsive sparse',
      description: 'Natural responsive layout with one retained basic panel.',
      waitFor: '[data-testid="building-info-tab-page-basic"]',
      render: () => (
        <BuildingInfoPanelFixtureState topologyVariant="sparseBasic" />
      ),
    },
    {
      id: 'empty-panel',
      label: 'Structurally empty panel',
      description:
        'A supplied panel without retained sections leaves the entire extension shell absent.',
      waitFor: '[data-testid="building-info-fixture-empty-ready"]',
      render: () => (
        <BuildingInfoPanelFixtureState topologyVariant="emptyPanel" />
      ),
    },
    {
      id: 'empty-content',
      label: 'Empty content',
      description:
        'Neutral shell with no extension, page controls, tab, or reserved panel region.',
      waitFor: '[data-testid="building-info-fixture-empty-ready"]',
      render: () => <BuildingInfoPanelFixtureState topologyVariant="empty" />,
    },
    {
      id: 'action-rail-single',
      label: 'Single collapsed action',
      description:
        'Collapsed row action rail with only the available basic reopen action.',
      waitFor: '[data-testid="building-info-action-rail"]',
      canvasSx: {
        p: 3,
      },
      render: () => <ActionRailFixtureState availableModes={['twoPanel']} />,
    },
    {
      id: 'action-rail-collapsed',
      label: 'Collapsed action rail',
      description: 'Collapsed row action rail with both reopen buttons.',
      waitFor: '[data-testid="building-info-action-rail"]',
      canvasSx: {
        p: 3,
      },
      render: () => (
        <ActionRailFixtureState availableModes={['twoPanel', 'threePanel']} />
      ),
    },
  ],
}
