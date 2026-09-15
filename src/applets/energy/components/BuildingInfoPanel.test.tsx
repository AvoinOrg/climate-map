import React from 'react'
import '@testing-library/jest-dom'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

import { useUIStore } from '#/common/store/uiStore'
import { AppThemeProvider } from '#/common/style/theme'
import { SlotsProvider } from '#/components/context/slotsContext'
import { SidebarRoot } from '#/components/Sidebar/SidebarRoot'
import { SidebarPanelExtensionProvider } from '#/components/Sidebar/SidebarPanelExtensionProvider'
import { IntoSidebarPanelExtensionPanelSlot } from '#/components/Sidebar/sidebarSlots'
import {
  BuildingInfoActionRail,
  BuildingInfoTabPages,
  BuildingInfoText,
  getBuildingInfoPanelIds,
  getBuildingInfoTabPanelIds,
} from './BuildingInfoPanel'
import {
  ENERGYMAP_BUILDING_INFO_BASIC_DESKTOP_MIN_WIDTH_PX,
  ENERGYMAP_BUILDING_INFO_RENOVATION_DESKTOP_PANEL_WIDTH_PX,
  ENERGYMAP_BUILDING_INFO_RENOVATION_DESKTOP_MIN_WIDTH_PX,
  getEnergymapBuildingInfoDesktopMinWidthPx,
  getEnergymapBuildingInfoPanelRuntimeOptions,
} from '../common/buildingInfoPanelRuntime'
import { deriveEnergymapBuildingInfoPanelTopology } from '../common/buildingInfoPanelTopology'
import {
  ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS,
  ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
} from '../common/buildingInfoProvenance'
import { createEnergymapBuildingInfoPanels } from '../common/buildingInfo'
import { deriveEnergymapBuildingInfoProvenanceSummary } from '../common/buildingInfoProvenanceSummary'
import type {
  EnergymapBuildingInfoConsumptionControls,
  EnergymapBuildingInfoMetric,
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoText,
  EnergymapBuildingInfoValue,
} from '../common/buildingInfo'
import type { EnergymapSelectedBuilding } from '../common/types'
import type { BuildingInfoTabId } from './BuildingInfoPanel'

jest.mock('#/common/store', () => ({
  useUIStore: jest.requireActual('#/common/store/uiStore').useUIStore,
}))

let mockIsMobile = false

jest.mock('#/common/hooks/ui/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

jest.mock('#/common/navigation/navigation', () => ({
  useAppParams: () => ({ locale: 'en' }),
}))

jest.mock('@tolgee/react', () => {
  const ReactRuntime = jest.requireActual<typeof import('react')>('react')

  return {
    T: ({
      keyName,
      params,
    }: {
      keyName: string
      params?: Record<string, string | number>
    }) =>
      ReactRuntime.createElement(
        'span',
        null,
        params?.code == null ? keyName : `${keyName}:${params.code}`
      ),
    useTranslate: () => ({
      t: (keyName: string) => keyName,
    }),
  }
})

jest.mock('overlayscrollbars-react', () => {
  const ReactRuntime = jest.requireActual<typeof import('react')>('react')

  return {
    OverlayScrollbarsComponent: ({
      children,
      className,
      options,
      style,
      ...props
    }: {
      children: React.ReactNode
      className?: string
      options?: {
        overflow?: {
          x?: string
          y?: string
        }
        scrollbars?: {
          autoHide?: string
          visibility?: string
          theme?: string
        }
      }
      style?: React.CSSProperties
    }) =>
      ReactRuntime.createElement(
        'div',
        {
          ...props,
          className,
          style,
          'data-auto-hide': options?.scrollbars?.autoHide,
          'data-scrollbar-visibility': options?.scrollbars?.visibility,
          'data-scrollbar-theme': options?.scrollbars?.theme,
          'data-overflow-x': options?.overflow?.x,
          'data-overflow-y': options?.overflow?.y,
        },
        children
      ),
  }
})

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

const VENTILATION_SOURCE_TEXT =
  '<strong data-injected="true">Painovoimainen</strong><script>alert("unsafe")</script>'
const CERTIFICATE_RECOMMENDATION_SOURCE_TEXT =
  'Tiivistä yläpohjan lämmöneristystä ja tarkista ilmanvaihdon säädöt.\n\n<script data-injected="true">alert("unsafe")</script> **Tämä on lähdetekstiä, ei Markdownia.** Erittäinpitkäkatkeamatonmerkkijonotestaaturvallisenrivityksen.'

const REPORTED_CERTIFICATE_COMPONENTS = [
  { annual_kwh: 1196074, carrier: 'electricity' },
  { annual_kwh: 2994881, carrier: 'district_heat' },
  { annual_kwh: 197293, carrier: 'district_cooling' },
  { annual_kwh: 0, carrier: 'fossil_fuel' },
  { annual_kwh: 0, carrier: 'renewable_fuel' },
]

const createCertificateProperties = ({
  buildingKey,
  buildingIdentifier = buildingKey,
  certificateId = 'CERTIFICATE-001',
  properties = {},
  payload = {},
}: {
  buildingKey: string
  buildingIdentifier?: string
  certificateId?: string
  properties?: EnergymapSelectedBuilding['properties']
  payload?: Record<string, unknown>
}): EnergymapSelectedBuilding['properties'] => ({
  ...properties,
  building_key: buildingKey,
  permanent_building_identifier: buildingIdentifier,
  energy_certificate_consumption: JSON.stringify({
    basis: 'standardized_calculation',
    building_identifier: buildingIdentifier,
    certificate_id: certificateId,
    certificate_version: 2018,
    completeness: 'complete',
    components: REPORTED_CERTIFICATE_COMPONENTS,
    heated_net_area_m2: 22707.2,
    schema_version: 1,
    signed_at: '2023-04-13T11:37:42.080327',
    total_kwh_year: 4388248,
    unit: 'kWh/year',
    valid_until: '2033-04-14T00:00:00',
    ...payload,
  }),
})

const COMPLETE_REFERENCE_PROPERTIES = {
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 100,
  distr_default_total: 100,
  distr_default_heat: 75,
  distr_default_elec: 25,
} satisfies EnergymapSelectedBuilding['properties']

const metricValue = ({
  id,
  labelKey,
  text,
  status = 'estimate',
  sourceProperties,
  unitKey = 'unit.kwh',
}: {
  id: 'annualTotal' | 'perSquareMeter'
  labelKey: string
  text: EnergymapBuildingInfoText
  status?: EnergymapBuildingInfoValue['status']
  sourceProperties?: string[]
  unitKey?: string
}) => ({
  id,
  label: translation(labelKey),
  text,
  status,
  ...(sourceProperties == null ? {} : { sourceProperties }),
  unitKey,
})

const createEnergyMetric = ({
  id,
  labelKey,
  annualText,
  squareText,
  annualSources,
  squareSources,
  status = 'estimate',
}: {
  id: EnergymapBuildingInfoMetric['id']
  labelKey: string
  annualText: EnergymapBuildingInfoText
  squareText: EnergymapBuildingInfoText
  annualSources?: string[]
  squareSources?: string[]
  status?: EnergymapBuildingInfoValue['status']
}): EnergymapBuildingInfoMetric => ({
  id,
  label: translation(labelKey),
  values: [
    metricValue({
      id: 'annualTotal',
      labelKey: 'panels.energy.metric.annual_total',
      text: annualText,
      status,
      sourceProperties: annualSources,
    }),
    metricValue({
      id: 'perSquareMeter',
      labelKey: 'panels.energy.metric.per_square_meter',
      text: squareText,
      status,
      sourceProperties: squareSources,
      unitKey: 'unit.kwh_square',
    }),
  ],
})

const totalEnergyMetric = createEnergyMetric({
  id: 'total',
  labelKey: 'panels.energy.series.total',
  annualText: plain('100'),
  squareText: plain('10'),
  annualSources: ['distr_default_total', 'floor_area'],
  squareSources: ['distr_default_total'],
})

const heatingEnergyMetric = createEnergyMetric({
  id: 'heating',
  labelKey: 'panels.energy.series.heating',
  annualText: plain('70'),
  squareText: plain('7'),
  annualSources: ['distr_default_heat', 'floor_area'],
  squareSources: ['distr_default_heat'],
})

const electricityEnergyMetric = createEnergyMetric({
  id: 'electricity',
  labelKey: 'panels.energy.series.electricity',
  annualText: plain('30'),
  squareText: plain('3'),
  annualSources: ['distr_default_elec', 'floor_area'],
  squareSources: ['distr_default_elec'],
})

const waterHeatingEnergyMetric = createEnergyMetric({
  id: 'waterHeating',
  labelKey: 'panels.energy.series.water_heating',
  annualText: plain('10'),
  squareText: plain('1'),
})

const consumptionControls: EnergymapBuildingInfoConsumptionControls = {
  defaultPrimaryMetricId: 'energy',
  primaryMetrics: [
    {
      id: 'energy',
      label: translation('sidebar.building_info.panels.energy.primary.energy'),
      ariaLabelKey: 'sidebar.building_info.panels.energy.primary.energy',
      supported: true,
    },
    {
      id: 'water',
      label: translation('sidebar.building_info.panels.energy.primary.water'),
      ariaLabelKey: 'sidebar.building_info.panels.energy.primary.water',
      supported: true,
      value: {
        text: plain('481.8'),
        status: 'estimate',
        unitKey: 'sidebar.building_info.units.cubic_meters_per_year',
        sourceProperties: ['floor_area'],
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
          inputIds: ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
        },
      },
      residentCountControl: {
        defaultValue: 11,
        minValue: 1,
        maxValue: 10000,
        label: translation(
          'sidebar.building_info.panels.energy.water.resident_count'
        ),
        toggleLabel: translation(
          'sidebar.building_info.panels.energy.water.change_resident_count'
        ),
        description: translation(
          'sidebar.building_info.panels.energy.water.description'
        ),
        unavailableText: translation(
          'sidebar.building_info.panels.energy.water.invalid_resident_count'
        ),
        sourceProperties: ['floor_area'],
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
          inputIds:
            ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
        },
      },
    },
    {
      id: 'cost',
      label: translation('sidebar.building_info.panels.energy.primary.cost'),
      ariaLabelKey: 'sidebar.building_info.panels.energy.primary.cost',
      supported: true,
      value: {
        text: plain('19,613'),
        status: 'estimate',
        unitKey: 'sidebar.building_info.units.eur_per_year',
      },
    },
    {
      id: 'co2',
      label: translation('sidebar.building_info.panels.energy.primary.co2'),
      ariaLabelKey: 'sidebar.building_info.panels.energy.primary.co2',
      supported: true,
      value: {
        text: plain('18,436'),
        status: 'estimate',
        unitKey: 'sidebar.building_info.units.kg_co2_per_year',
      },
    },
  ],
  defaultEnergySubmetricIds: ['electricity', 'heating'],
  energySubmetrics: [
    {
      id: 'electricity',
      label: translation('panels.energy.series.electricity'),
      ariaLabelKey: 'panels.energy.series.electricity',
      supported: true,
      defaultSelected: true,
      metric: electricityEnergyMetric,
    },
    {
      id: 'heating',
      label: translation('panels.energy.series.heating'),
      ariaLabelKey: 'panels.energy.series.heating',
      supported: true,
      defaultSelected: true,
      metric: heatingEnergyMetric,
    },
    {
      id: 'waterHeating',
      label: translation('panels.energy.series.water_heating'),
      ariaLabelKey: 'panels.energy.series.water_heating',
      supported: true,
      defaultSelected: false,
      metric: waterHeatingEnergyMetric,
    },
  ],
  combinedEnergyMetric: totalEnergyMetric,
}

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<AppThemeProvider disableCssBaseline>{ui}</AppThemeProvider>)
}

const resetUIStore = () => {
  useUIStore.setState({
    sidebarBoundaries: {},
    _sidebarBoundaryRegistrationOrder: 0,
    sidebarPanelExtensions: {},
    _sidebarPanelExtensionRegistrationOrder: 0,
    isSidebarOpen: true,
    isSidebarDisabled: false,
    isSidebarLoading: false,
    sidebarHeaderConfig: { title: 'Test sidebar' },
    sidebarWidth: undefined,
  })
}

const panels: EnergymapBuildingInfoPanel[] = [
  {
    id: 'energyConsumption',
    title: translation('panel.energy.title'),
    description: translation('panel.energy.description'),
    sections: [
      {
        id: 'estimatedConsumption',
        title: translation('section.energy.estimated.title'),
        metrics: [
          totalEnergyMetric,
          heatingEnergyMetric,
          electricityEnergyMetric,
          waterHeatingEnergyMetric,
        ],
        consumptionControls,
        notes: [
          {
            id: 'estimatedConsumption',
            text: translation('note.energy.estimated'),
            status: 'estimate',
          },
        ],
      },
      {
        id: 'energyRows',
        rows: [
          {
            id: 'sequenceRow',
            label: translation('row.sequence.label'),
            text: {
              type: 'sequence',
              separator: ' / ',
              parts: [
                translation('value.part_a'),
                {
                  type: 'sequence',
                  separator: ' + ',
                  parts: [plain('plain value'), translation('value.part_b')],
                },
              ],
            },
            status: 'estimate',
            sourceProperties: ['distr_default_total', 'floor_area'],
            unitKey: 'unit.kwh',
          },
        ],
      },
      {
        id: 'calculationContext',
        title: translation('section.energy.calculation_context.title'),
        rows: [
          {
            id: 'co2Mode',
            label: translation('panels.energy.rows.co2_mode'),
            text: translation('panels.energy.context.co2_current_reference'),
            status: 'estimate',
            sourceProperties: ['co2_factor'],
          },
        ],
      },
    ],
  },
  {
    id: 'renovationRecommendations',
    title: translation('panel.renovation.title'),
    description: translation('panel.renovation.description'),
    sections: [
      {
        id: 'publishedRecommendations',
        rows: [
          {
            id: 'energyCertificateRecommendations',
            label: translation('row.energy_certificate_recommendations.label'),
            text: plain(CERTIFICATE_RECOMMENDATION_SOURCE_TEXT),
            status: 'real',
            sourceProperties: ['energy_certificate_recommendations_fi'],
            sourceLanguage: 'fi',
            presentation: 'expandableSourceText',
          },
        ],
      },
      {
        id: 'scenarioComparison',
        title: translation('section.scenario.title'),
        description: translation('section.scenario.description'),
        scenarios: [
          {
            id: 'aahp',
            label: translation('scenario.aahp.label'),
            values: [
              {
                id: 'annualTotal',
                label: translation('metric.annual.label'),
                text: plain('12000'),
                status: 'estimate',
                sourceProperties: ['aahp_total'],
                unitKey: 'unit.kwh',
              },
              {
                id: 'perSquareMeter',
                label: translation('metric.square.label'),
                text: plain('34'),
                status: 'estimate',
                sourceProperties: ['aahp_square'],
                unitKey: 'unit.kwh_square',
              },
              {
                id: 'savingsPercent',
                label: translation('metric.savings.label'),
                text: plain('-12%'),
                status: 'estimate',
                sourceProperties: ['default_total', 'aahp_total'],
              },
            ],
          },
        ],
        notes: [
          {
            id: 'scenarioEstimate',
            text: translation(
              'sidebar.building_info.panels.renovation.note.scenario_estimate'
            ),
            status: 'estimate',
            sourceProperties: ['default_total', 'aahp_total'],
          },
        ],
      },
    ],
  },
  {
    id: 'buildingDetails',
    title: translation('panel.building.title'),
    sections: [
      {
        id: 'buildingSubheader',
        variant: 'buildingSubheader',
        rows: [
          {
            id: 'address',
            label: translation('row.address.label'),
            text: plain('Test address 1'),
            status: 'real',
            sourceProperties: [
              'address_fin',
              'postal_code',
              'postal_office_fin',
            ],
          },
        ],
      },
      {
        id: 'energyCertificate',
        variant: 'energyCertificate',
        rows: [
          {
            id: 'energyClass',
            label: translation('row.energy_class.label'),
            text: plain('B'),
            status: 'real',
            sourceProperties: ['energy_class'],
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
          },
        ],
      },
      {
        id: 'technicalDetails',
        rows: [
          {
            id: 'ventilation',
            label: translation('row.ventilation.label'),
            text: plain(VENTILATION_SOURCE_TEXT),
            status: 'real',
            sourceProperties: ['energy_certificate_ventilation_description_fi'],
            sourceLanguage: 'fi',
          },
        ],
      },
    ],
  },
]

const getPanelsByIds = (
  panelIds: readonly EnergymapBuildingInfoPanel['id'][]
) => panels.filter((panel) => panelIds.includes(panel.id))

const ariaLabels = {
  close: 'Close building information',
  collapse: 'Collapse building information',
  overview: 'Open energy and building information',
  renovation: 'Open renovation recommendations',
}

const getPanelsWithConsumptionControls = (
  controls: EnergymapBuildingInfoConsumptionControls
): EnergymapBuildingInfoPanel[] =>
  panels.map((panel) =>
    panel.id === 'energyConsumption'
      ? {
          ...panel,
          sections: panel.sections.map((section) =>
            section.id === 'estimatedConsumption'
              ? { ...section, consumptionControls: controls }
              : section
          ),
        }
      : panel
  )

const getPanelsWithoutModeledEnergyClassIndicator = (
  sourceProperties: string[]
): EnergymapBuildingInfoPanel[] =>
  panels.map((panel) =>
    panel.id === 'buildingDetails'
      ? {
          ...panel,
          sections: panel.sections.map((section) =>
            section.id === 'energyCertificate'
              ? {
                  ...section,
                  rows: section.rows?.map((row) =>
                    row.id === 'energyClass'
                      ? {
                          ...row,
                          sourceProperties,
                          modeledIndicator: undefined,
                        }
                      : row
                  ),
                }
              : section
          ),
        }
      : panel
  )

type RenderBuildingInfoTabsOptions = {
  panelKey?: string
  locale?: string
  activeTabId?: BuildingInfoTabId
  forceMobileLayout?: boolean
  isDesktopFullscreenLayout?: boolean
  onActiveTabChange?: (tabId: BuildingInfoTabId) => void
  onClose?: () => void
  onCollapse?: (tabId: BuildingInfoTabId) => void
  panels?: EnergymapBuildingInfoPanel[]
}

const createCatalogValidPanels = ({
  properties,
  locale = 'en',
}: {
  properties: EnergymapSelectedBuilding['properties']
  locale?: string
}) => {
  const buildingKey = String(properties.building_key)
  const normalizedPanels = createEnergymapBuildingInfoPanels({
    selectedBuilding: {
      id: buildingKey,
      buildingKey,
      source: 'energymap_building_polygons',
      sourceLayer: 'energymap_building_polygons',
      layerId: 'energymap_building_polygons-fill',
      properties,
    },
    locale,
  })

  if (normalizedPanels == null) {
    throw new Error('Expected normalized building-info panels')
  }

  return normalizedPanels
}

const createBuildingInfoTabsElement = ({
  panelKey,
  locale = 'en',
  activeTabId,
  forceMobileLayout = false,
  isDesktopFullscreenLayout = false,
  onActiveTabChange = jest.fn(),
  onClose = jest.fn(),
  onCollapse = jest.fn(),
  panels: buildingInfoPanels = panels,
}: RenderBuildingInfoTabsOptions = {}) => {
  const topology = deriveEnergymapBuildingInfoPanelTopology(buildingInfoPanels)

  return (
    <SlotsProvider>
      <SidebarRoot>
        <SidebarPanelExtensionProvider
          id="building-info-test-extension"
          initialRuntimeOptions={{
            visiblePanels: ['main'],
            activePanel: 'main',
          }}
        >
          <IntoSidebarPanelExtensionPanelSlot panelId="main">
            <BuildingInfoTabPages
              key={panelKey}
              panels={buildingInfoPanels}
              locale={locale}
              topology={topology}
              ariaLabels={ariaLabels}
              activeTabId={activeTabId}
              forceMobileLayout={forceMobileLayout}
              isDesktopFullscreenLayout={isDesktopFullscreenLayout}
              onActiveTabChange={onActiveTabChange}
              onClose={onClose}
              onCollapse={onCollapse}
            />
          </IntoSidebarPanelExtensionPanelSlot>
        </SidebarPanelExtensionProvider>
      </SidebarRoot>
    </SlotsProvider>
  )
}

const renderBuildingInfoTabs = (
  options: RenderBuildingInfoTabsOptions = {}
) => {
  const result = renderWithTheme(createBuildingInfoTabsElement(options))

  return {
    ...result,
    rerenderBuildingInfoTabs: (
      nextOptions: RenderBuildingInfoTabsOptions = {}
    ) => {
      result.rerender(
        <AppThemeProvider disableCssBaseline>
          {createBuildingInfoTabsElement({ ...options, ...nextOptions })}
        </AppThemeProvider>
      )
    },
  }
}

describe('BuildingInfoPanel', () => {
  beforeEach(() => {
    mockIsMobile = false
    resetUIStore()
  })

  it.each([
    ['desktop', false],
    ['forced mobile', true],
  ])(
    'opens and closes one accessible provenance region in %s layout',
    async (_name, forceMobileLayout) => {
      const provenancePanels = createCatalogValidPanels({
        properties: {
          building_key: `accessible-${forceMobileLayout ? 'mobile' : 'desktop'}`,
          energy_class: 'B',
          is_energy_class_modeled: false,
        },
      })
      renderBuildingInfoTabs({ panels: provenancePanels, forceMobileLayout })

      await screen.findByTestId('building-info-tab-page-basic')
      const triggerName = 'sidebar.building_info.provenance.view.open'
      const trigger = screen.getByRole('button', { name: triggerName })
      const ordinaryPage = screen.getByTestId('building-info-tab-page-basic')
      const region = screen.getByTestId('building-info-provenance-view')
      const heading = screen.getByTestId('building-info-provenance-heading')
      const regionId = trigger.getAttribute('aria-controls')

      expect(screen.getAllByRole('button', { name: triggerName })).toHaveLength(
        1
      )
      expect(trigger.tagName).toBe('BUTTON')
      expect(trigger).toHaveAttribute('type', 'button')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(region).toHaveAttribute('id', regionId)
      expect(region).toHaveAttribute('aria-labelledby', heading.id)
      expect(region).not.toBeVisible()
      expect(
        screen.queryByRole('region', {
          name: 'sidebar.building_info.provenance.view.heading',
        })
      ).not.toBeInTheDocument()
      expect(ordinaryPage).toBeVisible()

      fireEvent.mouseEnter(trigger)
      expect(await screen.findByRole('tooltip')).toHaveTextContent(triggerName)
      fireEvent.mouseLeave(trigger)
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      })

      fireEvent.click(trigger)
      await waitFor(() => {
        expect(region).toBeVisible()
        expect(heading).toHaveFocus()
      })
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
      expect(
        screen.getByRole('region', {
          name: 'sidebar.building_info.provenance.view.heading',
        })
      ).toBe(region)
      expect(ordinaryPage).not.toBeVisible()
      expect(ordinaryPage).toBeInTheDocument()

      fireEvent.click(
        screen.getByRole('button', {
          name: 'sidebar.building_info.provenance.view.close',
        })
      )
      await waitFor(() => {
        expect(region).not.toBeVisible()
        expect(trigger).toHaveFocus()
      })

      fireEvent.keyDown(trigger, { key: 'Enter' })
      fireEvent.click(trigger, { detail: 0 })
      await waitFor(() => {
        expect(heading).toHaveFocus()
      })
      fireEvent.keyDown(document, { key: 'Escape' })
      await waitFor(() => {
        expect(region).not.toBeVisible()
        expect(trigger).toHaveFocus()
      })
    }
  )

  it('renders the exact reported certificate as one distinct static Energy group', async () => {
    const reportedPanels = createCatalogValidPanels({
      properties: createCertificateProperties({
        buildingKey: '1036581819',
        buildingIdentifier: '1036581819',
        certificateId: '318510',
        properties: {
          main_purpose: '02',
          floor_area: 0,
          energy_class: 'C',
          is_energy_class_modeled: false,
          energy_certificate_valid_until: '2033-04-14T00:00:00',
          energy_certificate_heated_net_area: 22707.2,
        },
      }),
    })

    renderBuildingInfoTabs({ panels: reportedPanels })

    const certificateGroup = await screen.findByTestId(
      'building-info-certificate-consumption'
    )
    const heading = within(certificateGroup).getByRole('heading', { level: 3 })
    const metrics = within(certificateGroup).getAllByTestId(
      'building-info-certificate-metric'
    )

    expect(certificateGroup.tagName).toBe('SECTION')
    expect(certificateGroup).toHaveAttribute('aria-labelledby', heading.id)
    expect(heading).toHaveTextContent(
      'sidebar.building_info.panels.energy.certificate.title'
    )
    expect(metrics.map((metric) => metric.dataset.metricId)).toEqual([
      'certificateElectricity',
      'certificateDistrictHeat',
      'certificateDistrictCooling',
      'certificateFossilFuel',
      'certificateRenewableFuel',
      'certificateTotal',
    ])
    expect(
      metrics.map(
        (metric) =>
          within(metric).getByRole('heading', { level: 4 }).textContent
      )
    ).toEqual([
      'sidebar.building_info.panels.energy.certificate.carriers.electricity',
      'sidebar.building_info.panels.energy.certificate.carriers.district_heat',
      'sidebar.building_info.panels.energy.certificate.carriers.district_cooling',
      'sidebar.building_info.panels.energy.certificate.carriers.fossil_fuel',
      'sidebar.building_info.panels.energy.certificate.carriers.renewable_fuel',
      'sidebar.building_info.panels.energy.certificate.metric.complete_total',
    ])
    expect(metrics[0]).toHaveTextContent('1,196,074')
    expect(metrics[1]).toHaveTextContent('2,994,881')
    expect(metrics[2]).toHaveTextContent('197,293')
    expect(metrics[3]).toHaveTextContent('0')
    expect(metrics[4]).toHaveTextContent('0')
    expect(metrics[5]).toHaveAttribute(
      'data-certificate-complete-total',
      'true'
    )
    expect(metrics[5]).toHaveTextContent('4,388,248')
    expect(
      certificateGroup.querySelectorAll('[data-metric-value-id="annualTotal"]')
    ).toHaveLength(6)
    expect(
      certificateGroup.querySelectorAll(
        '[data-metric-value-id="perSquareMeter"]'
      )
    ).toHaveLength(6)
    expect(
      within(certificateGroup).getAllByTestId(
        'building-info-certificate-value-note'
      )
    ).toHaveLength(6)
    expect(certificateGroup).toHaveTextContent(
      'sidebar.building_info.units.kwh_per_year'
    )
    expect(certificateGroup).toHaveTextContent(
      'sidebar.building_info.units.kwh_per_square_meter_year'
    )
    expect(
      certificateGroup.querySelector('[data-row-id="heatedNetArea"]')
    ).toHaveTextContent('22,707.2')
    expect(
      screen.getByTestId('building-info-energy-class-value-stack')
    ).toHaveTextContent('C')
    expect(
      screen
        .getByTestId('building-info-panel-energyConsumption')
        .querySelector('[data-section-id="estimatedConsumption"]')
    ).not.toBeInTheDocument()
  })

  it('keeps Water and partial reference content as certificate-group siblings while complete reference suppresses fallback', async () => {
    const waterPanels = createCatalogValidPanels({
      properties: createCertificateProperties({
        buildingKey: 'water-certificate-ui',
        properties: { floor_area: 100 },
      }),
    })
    const rendered = renderBuildingInfoTabs({ panels: waterPanels })
    const waterEnergyPanel = await screen.findByTestId(
      'building-info-panel-energyConsumption'
    )

    expect(
      Array.from(waterEnergyPanel.querySelectorAll('[data-section-id]')).map(
        (section) => section.getAttribute('data-section-id')
      )
    ).toEqual(['estimatedConsumption', 'certificateConsumption'])
    expect(
      within(waterEnergyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.water',
      })
    ).toBeInTheDocument()
    expect(
      within(waterEnergyPanel).queryByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.energy',
      })
    ).not.toBeInTheDocument()

    const partialReferencePanels = createCatalogValidPanels({
      properties: createCertificateProperties({
        buildingKey: 'partial-reference-certificate-ui',
        properties: {
          ...COMPLETE_REFERENCE_PROPERTIES,
          floor_area: undefined,
        },
      }),
    })
    rendered.rerenderBuildingInfoTabs({
      panelKey: 'partial-reference-certificate-ui',
      panels: partialReferencePanels,
    })
    const partialEnergyPanel = await screen.findByTestId(
      'building-info-panel-energyConsumption'
    )

    expect(
      Array.from(partialEnergyPanel.querySelectorAll('[data-section-id]')).map(
        (section) => section.getAttribute('data-section-id')
      )
    ).toEqual(['estimatedConsumption', 'certificateConsumption'])
    expect(
      partialEnergyPanel.querySelector(
        '[data-section-id="estimatedConsumption"] [data-metric-value-id]'
      )
    ).toBeInTheDocument()
    expect(
      partialEnergyPanel.querySelector(
        '[data-section-id="certificateConsumption"] [data-certificate-complete-total="true"]'
      )
    ).toBeInTheDocument()

    const completeReferencePanels = createCatalogValidPanels({
      properties: createCertificateProperties({
        buildingKey: 'complete-reference-certificate-ui',
        properties: COMPLETE_REFERENCE_PROPERTIES,
      }),
    })
    rendered.rerenderBuildingInfoTabs({
      panelKey: 'complete-reference-certificate-ui',
      panels: completeReferencePanels,
    })
    const completeEnergyPanel = await screen.findByTestId(
      'building-info-panel-energyConsumption'
    )

    expect(
      within(completeEnergyPanel).queryByTestId(
        'building-info-certificate-consumption'
      )
    ).not.toBeInTheDocument()
    expect(
      within(completeEnergyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.energy',
      })
    ).toBeInTheDocument()
    expect(
      completeEnergyPanel.querySelectorAll(
        '[data-section-id="estimatedConsumption"]'
      )
    ).toHaveLength(1)
  })

  it('renders partial, expired, named, unnamed, and zero certificate facts literally without area-derived wrappers', async () => {
    const dangerousName = '<b data-injected="true">Named source</b>'
    const partialPanels = createCatalogValidPanels({
      properties: createCertificateProperties({
        buildingKey: 'partial-expired-certificate-ui',
        payload: {
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
              name: dangerousName,
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
          heated_net_area_m2: null,
          signed_at: '2010-01-02T00:00:00Z',
          total_kwh_year: null,
          valid_until: '2020-01-02T00:00:00Z',
        },
      }),
    })

    renderBuildingInfoTabs({ panels: partialPanels })
    const certificateGroup = await screen.findByTestId(
      'building-info-certificate-consumption'
    )
    const metrics = within(certificateGroup).getAllByTestId(
      'building-info-certificate-metric'
    )

    expect(metrics.map((metric) => metric.dataset.metricId)).toEqual([
      'certificateElectricity',
      'certificateDistrictHeat',
      'certificateDistrictCooling',
      'certificateFossilFuel',
      'certificateRenewableFuel',
      'certificateOther0',
      'certificateOther1',
      'certificateOther2',
    ])
    expect(metrics[5]).toHaveTextContent(dangerousName)
    expect(metrics[5].querySelector('[data-injected]')).not.toBeInTheDocument()
    expect(metrics[5].querySelector('b')).not.toBeInTheDocument()
    expect(certificateGroup.querySelector('script')).not.toBeInTheDocument()
    expect(metrics[6]).toHaveTextContent(
      'sidebar.building_info.panels.energy.certificate.carriers.other_2'
    )
    expect(metrics[7]).toHaveTextContent(
      'sidebar.building_info.panels.energy.certificate.carriers.other_3'
    )
    expect(metrics[0]).toHaveTextContent('0')
    expect(metrics[0]).toHaveTextContent(
      'sidebar.building_info.units.kwh_per_year'
    )
    expect(
      certificateGroup.querySelectorAll('[data-metric-value-id="annualTotal"]')
    ).toHaveLength(8)
    expect(
      certificateGroup.querySelector('[data-metric-value-id="perSquareMeter"]')
    ).not.toBeInTheDocument()
    expect(
      certificateGroup.querySelector('[data-row-id="heatedNetArea"]')
    ).not.toBeInTheDocument()
    expect(
      certificateGroup.querySelector('[data-certificate-complete-total]')
    ).not.toBeInTheDocument()
    expect(certificateGroup).toHaveTextContent('1/2/2020')
    expect(certificateGroup).toHaveTextContent(
      'sidebar.building_info.panels.energy.certificate.note.partial_record'
    )
    expect(certificateGroup).toHaveTextContent(
      'sidebar.building_info.panels.energy.certificate.note.historical_not_measured'
    )
  })

  it('updates localized certificate display and resets open provenance on keyed source replacement', async () => {
    const certificateProperties = createCertificateProperties({
      buildingKey: 'certificate-locale-selection-a',
      buildingIdentifier: '1036581819',
      certificateId: '318510',
    })
    const enPanels = createCatalogValidPanels({
      properties: certificateProperties,
      locale: 'en-US',
    })
    const fiPanels = createCatalogValidPanels({
      properties: certificateProperties,
      locale: 'fi-FI',
    })
    const rendered = renderBuildingInfoTabs({
      panelKey: 'certificate-locale-selection-a',
      locale: 'en-US',
      panels: enPanels,
    })
    let certificateGroup = await screen.findByTestId(
      'building-info-certificate-consumption'
    )

    expect(certificateGroup.textContent).toContain('1,196,074')
    expect(certificateGroup.textContent).toContain('4/13/2023')

    rendered.rerenderBuildingInfoTabs({ locale: 'fi-FI', panels: fiPanels })
    certificateGroup = await screen.findByTestId(
      'building-info-certificate-consumption'
    )
    expect(certificateGroup.textContent).toContain('1 196 074')
    expect(certificateGroup.textContent).toContain('13.4.2023')

    const fiResult = deriveEnergymapBuildingInfoProvenanceSummary({
      panels: fiPanels,
      locale: 'fi-FI',
    })
    if (fiResult == null || fiResult.status !== 'resolved') {
      throw new Error('Expected resolved Finnish certificate provenance')
    }
    expect(
      Array.from(
        certificateGroup.querySelectorAll<HTMLElement>('[data-provenance-id]')
      ).map((item) => item.dataset.provenanceId)
    ).toEqual(
      fiResult.summary.items
        .filter(
          ({ location }) => location.sectionId === 'certificateConsumption'
        )
        .map(({ provenanceId }) => provenanceId)
    )

    const trigger = screen.getByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(
        screen.getByTestId('building-info-provenance-heading')
      ).toHaveFocus()
    })
    expect(
      screen
        .getAllByTestId('building-info-provenance-item')
        .map((item) => item.dataset.provenanceItemId)
    ).toEqual(fiResult.summary.items.map(({ id }) => id))
    expect(screen.getByTestId('building-info-provenance-view')).toHaveAttribute(
      'data-summary-locale',
      'fi-FI'
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(trigger).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    fireEvent.click(trigger)
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })
    const previousRegionId = trigger.getAttribute('aria-controls')
    const completeReferencePanels = createCatalogValidPanels({
      properties: createCertificateProperties({
        buildingKey: 'certificate-locale-selection-b',
        properties: COMPLETE_REFERENCE_PROPERTIES,
      }),
    })

    rendered.rerenderBuildingInfoTabs({
      panelKey: 'certificate-locale-selection-b',
      locale: 'en',
      panels: completeReferencePanels,
    })
    const replacementTrigger = await screen.findByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    expect(replacementTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(replacementTrigger.getAttribute('aria-controls')).not.toBe(
      previousRegionId
    )
    expect(
      screen.queryByTestId('building-info-certificate-consumption')
    ).not.toBeInTheDocument()

    fireEvent.click(replacementTrigger)
    await waitFor(() => {
      expect(replacementTrigger).toHaveAttribute('aria-expanded', 'true')
    })
    expect(
      screen
        .getAllByTestId('building-info-provenance-item')
        .some((item) =>
          item.dataset.provenanceItemId?.includes('certificateConsumption')
        )
    ).toBe(false)

    rendered.rerenderBuildingInfoTabs({
      panelKey: 'certificate-locale-selection-c',
      panels: createCatalogValidPanels({
        properties: {
          building_key: 'certificate-locale-selection-c',
          energy_class: 'C',
          is_energy_class_modeled: false,
        },
      }),
    })
    await screen.findByTestId('building-info-panel-buildingDetails')
    expect(
      screen.queryByTestId('building-info-panel-energyConsumption')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-certificate-consumption')
    ).not.toBeInTheDocument()
  })

  it('renders no certificate artifact for a defensively empty authored certificate section', async () => {
    const energyPanel = panels.find(
      (panel) => panel.id === 'energyConsumption'
    ) as EnergymapBuildingInfoPanel

    renderBuildingInfoTabs({
      panels: [
        {
          ...energyPanel,
          sections: [
            {
              id: 'emptyCertificateConsumption',
              variant: 'energyCertificateConsumption',
              title: plain('Must not render'),
              notes: [
                {
                  id: 'orphanNote',
                  text: plain('Must not render either'),
                  status: 'real',
                },
              ],
            },
          ],
        },
      ],
    })

    await screen.findByTestId('building-info-tab-page-basic')
    expect(
      screen.queryByTestId('building-info-certificate-consumption')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Must not render')).not.toBeInTheDocument()
    expect(screen.queryByText('Must not render either')).not.toBeInTheDocument()
  })

  it('keeps Water output and provenance synchronized through override transitions', async () => {
    const waterPanels = createCatalogValidPanels({
      properties: {
        building_key: 'water-provenance-transitions',
        floor_area: 100,
        distr_default_total: null,
      },
    })
    const rendered = renderBuildingInfoTabs({
      panelKey: 'water-provenance-building-a',
      panels: waterPanels,
    })

    await screen.findByTestId('building-info-water-resident-control')
    const trigger = screen.getByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    const waterPanel = screen.getByTestId('building-info-primary-metric-value')
    const overrideSwitch = screen.getByRole('switch', {
      name: 'sidebar.building_info.panels.energy.water.change_resident_count',
    })

    expect(waterPanel).toHaveTextContent('87,6')
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(
        screen.getAllByTestId('building-info-provenance-item')
      ).toHaveLength(2)
    })
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.inputs.occupancy_reference'
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.building_info.provenance.view.close',
      })
    )

    fireEvent.click(overrideSwitch)
    const residentInput = screen.getByLabelText(
      'sidebar.building_info.panels.energy.water.resident_count'
    )
    fireEvent.change(residentInput, { target: { value: '3' } })
    await waitFor(() => {
      expect(waterPanel).toHaveTextContent('131,4')
    })

    fireEvent.click(trigger)
    await waitFor(() => {
      expect(
        screen.getByTestId('building-info-provenance-view')
      ).toHaveTextContent(
        'sidebar.building_info.provenance.inputs.user_resident_count'
      )
      expect(
        screen.getByTestId('building-info-provenance-view')
      ).toHaveTextContent(
        'sidebar.building_info.provenance.sources.user_resident_count'
      )
    })
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toHaveTextContent(
      'sidebar.building_info.provenance.inputs.occupancy_reference'
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.building_info.provenance.view.close',
      })
    )
    fireEvent.click(overrideSwitch)
    await waitFor(() => {
      expect(overrideSwitch).not.toBeChecked()
      expect(waterPanel).toHaveTextContent('87,6')
    })

    fireEvent.click(overrideSwitch)
    fireEvent.change(
      screen.getByLabelText(
        'sidebar.building_info.panels.energy.water.resident_count'
      ),
      { target: { value: '3' } }
    )
    await waitFor(() => {
      expect(waterPanel).toHaveTextContent('131,4')
    })
    fireEvent.click(trigger)
    await waitFor(() => {
      expect(
        screen.getByTestId('building-info-provenance-view')
      ).toHaveTextContent(
        'sidebar.building_info.provenance.inputs.user_resident_count'
      )
    })
    const previousRegionId = trigger.getAttribute('aria-controls')
    const replacementPanels = createCatalogValidPanels({
      properties: {
        building_key: 'water-provenance-transitions-replacement',
        floor_area: 100,
        distr_default_total: null,
      },
    })

    rendered.rerenderBuildingInfoTabs({
      panelKey: 'water-provenance-building-b',
      panels: replacementPanels,
    })

    const replacementTrigger = await screen.findByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    const replacementWaterPanel = screen.getByTestId(
      'building-info-primary-metric-value'
    )
    expect(replacementTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(replacementTrigger.getAttribute('aria-controls')).not.toBe(
      previousRegionId
    )
    expect(replacementWaterPanel).toHaveTextContent('87,6')
    expect(
      screen.queryByLabelText(
        'sidebar.building_info.panels.energy.water.resident_count'
      )
    ).not.toBeInTheDocument()

    fireEvent.click(replacementTrigger)
    await waitFor(() => {
      const replacementView = screen.getByTestId(
        'building-info-provenance-view'
      )
      expect(replacementView).toHaveTextContent(
        'sidebar.building_info.provenance.inputs.occupancy_reference'
      )
      expect(replacementView).not.toHaveTextContent(
        'sidebar.building_info.provenance.inputs.user_resident_count'
      )
    })
  })

  it('retains invalid Water provenance when touch activation blurs without a related target', async () => {
    const waterPanels = createCatalogValidPanels({
      properties: {
        building_key: 'water-invalid-touch-transition',
        floor_area: 100,
        distr_default_total: null,
      },
    })
    renderBuildingInfoTabs({ panels: waterPanels })

    await screen.findByTestId('building-info-water-resident-control')
    const trigger = screen.getByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    const waterPanel = screen.getByTestId('building-info-primary-metric-value')
    const overrideSwitch = screen.getByRole('switch', {
      name: 'sidebar.building_info.panels.energy.water.change_resident_count',
    })

    fireEvent.click(overrideSwitch)
    const residentInput = screen.getByLabelText(
      'sidebar.building_info.panels.energy.water.resident_count'
    )
    fireEvent.change(residentInput, { target: { value: '' } })
    expect(
      within(waterPanel).getByTestId('building-info-unavailable-value-icon')
    ).toBeInTheDocument()

    fireEvent.pointerDown(trigger, { pointerType: 'touch' })
    fireEvent.blur(residentInput, { relatedTarget: null })
    fireEvent.click(trigger)

    await waitFor(() => {
      const items = screen.getAllByTestId('building-info-provenance-item')
      expect(items).toHaveLength(1)
      expect(items[0]).toHaveAttribute(
        'data-provenance-item-id',
        'energyConsumption/estimatedConsumption/primaryMetric/water/residentCountControl'
      )
    })
    expect(residentInput).toHaveValue('')
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.inputs.user_resident_count'
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.building_info.provenance.view.close',
      })
    )
    await waitFor(() => {
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expect(residentInput).toHaveValue('')
    })

    fireEvent.click(overrideSwitch)
    await waitFor(() => {
      expect(overrideSwitch).not.toBeChecked()
      expect(waterPanel).toHaveTextContent('87,6')
      expect(
        screen.queryByLabelText(
          'sidebar.building_info.panels.energy.water.resident_count'
        )
      ).not.toBeInTheDocument()
    })

    fireEvent.click(trigger)
    await waitFor(() => {
      expect(
        screen.getAllByTestId('building-info-provenance-item')
      ).toHaveLength(2)
      expect(
        screen.getByTestId('building-info-provenance-view')
      ).toHaveTextContent(
        'sidebar.building_info.provenance.inputs.occupancy_reference'
      )
      expect(
        screen.getByTestId('building-info-provenance-view')
      ).not.toHaveTextContent(
        'sidebar.building_info.provenance.inputs.user_resident_count'
      )
    })
  })

  it('retains invalid Water provenance when assistive activation blurs the input from heading focus', async () => {
    const waterPanels = createCatalogValidPanels({
      properties: {
        building_key: 'water-invalid-post-activation-blur',
        floor_area: 100,
        distr_default_total: null,
      },
    })
    renderBuildingInfoTabs({ panels: waterPanels })

    await screen.findByTestId('building-info-water-resident-control')
    const trigger = screen.getByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    const waterPanel = screen.getByTestId('building-info-primary-metric-value')
    const overrideSwitch = screen.getByRole('switch', {
      name: 'sidebar.building_info.panels.energy.water.change_resident_count',
    })

    fireEvent.click(overrideSwitch)
    const residentInput = screen.getByLabelText(
      'sidebar.building_info.panels.energy.water.resident_count'
    )
    residentInput.focus()
    fireEvent.change(residentInput, { target: { value: '' } })
    expect(residentInput).toHaveFocus()
    expect(
      within(waterPanel).getByTestId('building-info-unavailable-value-icon')
    ).toBeInTheDocument()

    fireEvent.click(trigger, { detail: 0 })

    await waitFor(() => {
      expect(
        screen.getByTestId('building-info-provenance-heading')
      ).toHaveFocus()
    })
    expect(residentInput).toHaveValue('')
    expect(
      within(waterPanel).getByTestId('building-info-unavailable-value-icon')
    ).toBeInTheDocument()
    const items = screen.getAllByTestId('building-info-provenance-item')
    expect(items).toHaveLength(1)
    expect(items[0]).toHaveAttribute(
      'data-provenance-item-id',
      'energyConsumption/estimatedConsumption/primaryMetric/water/residentCountControl'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.inputs.user_resident_count'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toHaveTextContent(
      'sidebar.building_info.provenance.inputs.occupancy_reference'
    )
  })

  it.each([
    {
      interaction: 'a canceled touch pointer gesture',
      moveFocus: ({
        residentInput,
        trigger,
      }: {
        residentInput: HTMLElement
        trigger: HTMLElement
      }) => {
        fireEvent.pointerDown(trigger, { pointerType: 'touch' })
        fireEvent.blur(residentInput, { relatedTarget: null })
        fireEvent.pointerCancel(trigger, { pointerType: 'touch' })
      },
    },
    {
      interaction: 'focus without activation',
      moveFocus: ({
        residentInput,
        trigger,
      }: {
        residentInput: HTMLElement
        trigger: HTMLElement
      }) => {
        fireEvent.blur(residentInput, { relatedTarget: trigger })
        fireEvent.focus(trigger)
      },
    },
    {
      interaction: 'pointer release without click',
      moveFocus: ({
        residentInput,
        trigger,
      }: {
        residentInput: HTMLElement
        trigger: HTMLElement
      }) => {
        fireEvent.pointerDown(trigger, { pointerType: 'touch' })
        fireEvent.blur(residentInput, { relatedTarget: null })
        fireEvent.pointerUp(trigger, { pointerType: 'touch' })
      },
    },
  ])(
    'normalizes invalid Water input after $interaction does not open provenance',
    async ({ moveFocus }) => {
      const waterPanels = createCatalogValidPanels({
        properties: {
          building_key: 'water-invalid-canceled-provenance-open',
          floor_area: 100,
          distr_default_total: null,
        },
      })
      renderBuildingInfoTabs({ panels: waterPanels })

      await screen.findByTestId('building-info-water-resident-control')
      const trigger = screen.getByRole('button', {
        name: 'sidebar.building_info.provenance.view.open',
      })
      const waterPanel = screen.getByTestId(
        'building-info-primary-metric-value'
      )
      const overrideSwitch = screen.getByRole('switch', {
        name: 'sidebar.building_info.panels.energy.water.change_resident_count',
      })

      fireEvent.click(overrideSwitch)
      const residentInput = screen.getByLabelText(
        'sidebar.building_info.panels.energy.water.resident_count'
      )
      fireEvent.focus(residentInput)
      fireEvent.change(residentInput, { target: { value: '' } })
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()

      moveFocus({ residentInput, trigger })

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
        expect(residentInput).toHaveValue('2')
        expect(waterPanel).toHaveTextContent('87,6')
        expect(
          within(waterPanel).queryByTestId(
            'building-info-unavailable-value-icon'
          )
        ).not.toBeInTheDocument()
      })
    }
  )

  it('recursively renders sequence text and translation descriptors', () => {
    render(
      <BuildingInfoText
        text={{
          type: 'sequence',
          separator: ' / ',
          parts: [
            translation('first.key'),
            {
              type: 'sequence',
              separator: ' + ',
              parts: [
                plain('plain'),
                translation('unknown.code', { code: 99 }),
              ],
            },
          ],
        }}
      />
    )

    expect(document.body).toHaveTextContent(
      'first.key / plain + unknown.code:99'
    )
  })

  it('renders the basic building information tab through SidebarPanelExtension', async () => {
    renderBuildingInfoTabs()

    expect(
      await screen.findByTestId('building-info-tab-page-basic')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tablist', { name: /sidebar panel extension tabs/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'Open energy and building information',
      })
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      screen.getByRole('tab', {
        name: 'Open renovation recommendations',
      })
    ).toHaveAttribute('aria-selected', 'false')
    expect(getBuildingInfoPanelIds('twoPanel')).toEqual([
      'energyConsumption',
      'buildingDetails',
    ])
    expect(getBuildingInfoTabPanelIds('basic')).toEqual([
      'energyConsumption',
      'buildingDetails',
    ])
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual(['energyConsumption', 'buildingDetails'])
    expect(screen.getByTestId('building-info-grid')).toHaveAttribute(
      'data-building-info-grid-layout',
      'basic'
    )
    expect(screen.getByTestId('building-info-tab-page-basic')).toHaveStyle({
      flexGrow: 1,
    })
    expect(screen.getByTestId('building-info-grid')).toHaveStyle({
      flexGrow: 1,
    })
    expect(screen.getByTestId('building-info-grid')).not.toHaveStyle({
      minHeight: '1256px',
    })
    expect(screen.getByTestId('building-info-grid')).toHaveAttribute(
      'data-building-info-content-width',
      '760'
    )
    expect(screen.getByTestId('building-info-grid-row-basic')).toHaveAttribute(
      'data-grid-region-count',
      '2'
    )
    expect(screen.getByTestId('building-info-grid-row-basic')).not.toHaveStyle({
      minHeight: '1256px',
    })
    expect(
      screen.getByTestId('building-info-grid-section-basic-energy')
    ).toHaveAttribute('data-grid-row', 'basic')
    expect(
      screen.getByTestId('building-info-grid-section-basic-building-details')
    ).toHaveAttribute('data-grid-row', 'basic')
    expect(
      screen.queryByTestId('building-info-panel-renovationRecommendations')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-grid-section-top-renovation')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-grid-section-bottom-wide')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-grid-section-bottom-right')
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveLength(1)
    expect(
      screen.queryByTestId(/^building-info-scroll-/)
    ).not.toBeInTheDocument()
  })

  it('renders calculation details as an accessible collapsed accordion with stacked explanations', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const calculationContext = screen.getByTestId(
      'building-info-calculation-context'
    )
    const trigger = within(calculationContext).getByRole('button', {
      name: 'section.energy.calculation_context.title',
    })
    const panel = within(calculationContext).getByTestId(
      'building-info-calculation-context-panel'
    )

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', panel.id)
    expect(panel).not.toBeVisible()
    expect(
      calculationContext.querySelector('[data-row-id="costMode"]')
    ).not.toBeInTheDocument()

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toBeVisible()
    expect(
      Array.from(
        calculationContext.querySelectorAll('[data-calculation-context-row-id]')
      ).map((row) => row.getAttribute('data-calculation-context-row-id'))
    ).toEqual(['co2Mode'])
    expect(panel).not.toHaveTextContent('panels.energy.rows.cost_mode')
    expect(panel).toHaveTextContent('panels.energy.rows.co2_mode')
    expect(panel).toHaveTextContent(
      'panels.energy.context.co2_current_reference'
    )
    expect(panel).not.toHaveTextContent(
      'panels.energy.rows.water_heating_split'
    )
    expect(
      calculationContext.querySelector(
        '[data-calculation-context-row-id="co2Mode"] [data-source-properties="co2_factor"]'
      )
    ).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toBeVisible()
  })

  it('switches to the renovation recommendation tab', async () => {
    renderBuildingInfoTabs()

    fireEvent.click(
      await screen.findByRole('tab', {
        name: 'Open renovation recommendations',
      })
    )

    expect(
      await screen.findByTestId('building-info-tab-page-renovation')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'Open energy and building information',
      })
    ).toHaveAttribute('aria-selected', 'false')
    expect(
      screen.getByRole('tab', {
        name: 'Open renovation recommendations',
      })
    ).toHaveAttribute('aria-selected', 'true')
    expect(getBuildingInfoPanelIds('threePanel')).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    expect(getBuildingInfoTabPanelIds('renovation')).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    expect(screen.getByTestId('building-info-grid')).toHaveAttribute(
      'data-building-info-grid-layout',
      'renovation'
    )
    expect(screen.getByTestId('building-info-grid')).not.toHaveStyle({
      minHeight: '2365px',
    })
    expect(
      screen.getByTestId('building-info-grid-row-renovationTop')
    ).not.toHaveStyle({ minHeight: '1300px' })
    expect(
      screen.getByTestId('building-info-grid-row-renovationComparison')
    ).not.toHaveStyle({ minHeight: '1065px' })
    expect(
      screen.getByTestId('building-info-grid-section-top-energy')
    ).toHaveAttribute('data-grid-row', 'renovationTop')
    expect(
      screen.getByTestId('building-info-grid-section-top-renovation')
    ).toHaveAttribute('data-grid-row', 'renovationTop')
    expect(
      screen.getByTestId('building-info-grid-section-top-building-details')
    ).toHaveAttribute('data-grid-row', 'renovationTop')
    expect(
      screen.getByTestId('building-info-grid-section-bottom-wide')
    ).toHaveAttribute('data-grid-row', 'renovationComparison')
    expect(
      screen.getByTestId('building-info-grid-section-bottom-right')
    ).toHaveAttribute('data-grid-row', 'renovationComparison')
    expect(
      screen.getByTestId('building-info-grid-section-bottom-right')
    ).toHaveStyle({ backgroundColor: '#f0f0f0' })
    expect(
      screen.getByTestId('building-info-renovation-comparison-wide')
    ).toBeInTheDocument()
    expect(
      screen.getByText('section.energy.calculation_context.title')
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-calculation-context')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-renovation-reference-year-note')
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-renovation-effectiveness-content')
    ).toHaveTextContent(
      'sidebar.building_info.panels.renovation.effectiveness.title'
    )
    expect(
      screen.getByTestId('building-info-renovation-effectiveness-content')
    ).toHaveTextContent(
      'sidebar.building_info.panels.renovation.effectiveness.body'
    )
    expect(
      screen.getByTestId('building-info-renovation-effectiveness-indicator')
    ).toBeInTheDocument()
    const comparisonNote = screen
      .getByText(
        'sidebar.building_info.panels.renovation.note.scenario_estimate'
      )
      .closest('[data-status]')

    expect(comparisonNote).toHaveAttribute('data-note-id', 'scenarioEstimate')
    expect(comparisonNote).toHaveAttribute('data-status', 'estimate')
    expect(comparisonNote).toHaveAttribute(
      'data-source-properties',
      'default_total,aahp_total'
    )

    const energyBody = screen.getByTestId(
      'building-info-panel-energyConsumption'
    ).firstElementChild as HTMLElement
    const buildingDetailsBody = screen.getByTestId(
      'building-info-panel-buildingDetails'
    ).firstElementChild as HTMLElement

    expect(energyBody).toHaveStyle({
      width: 'min(17.625rem, calc(100% - 3rem))',
      marginLeft: 'auto',
      marginRight: 'auto',
    })
    expect(buildingDetailsBody).toHaveStyle({
      width: 'min(17.625rem, calc(100% - 3rem))',
      marginLeft: 'auto',
      marginRight: 'auto',
    })
  })

  it('notifies page state when the active tab changes', async () => {
    const onActiveTabChange = jest.fn()

    renderBuildingInfoTabs({ onActiveTabChange })

    await screen.findByTestId('building-info-tab-page-basic')
    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('basic')
    })

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'Open renovation recommendations',
      })
    )

    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('renovation')
    })
  })

  it('publishes a user tab change after applying a controlled active tab', async () => {
    const onActiveTabChange = jest.fn()

    renderBuildingInfoTabs({
      activeTabId: 'basic',
      onActiveTabChange,
    })

    await screen.findByTestId('building-info-tab-page-basic')
    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('basic')
    })

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'Open renovation recommendations',
      })
    )

    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('renovation')
    })
  })

  it('keeps the mobile tab page on the F028.2 stacked sections', async () => {
    mockIsMobile = true

    renderBuildingInfoTabs({ activeTabId: 'renovation' })

    expect(
      await screen.findByTestId('building-info-tab-page-renovation')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('building-info-grid')).not.toBeInTheDocument()
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    expect(
      screen.getAllByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveLength(1)
    expect(
      screen.queryByTestId(/^building-info-scroll-/)
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveAttribute('data-overflow-y', 'scroll')
    expect(
      screen.getByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveAttribute('data-scrollbar-visibility', 'auto')
    expect(
      screen.getByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveAttribute('data-auto-hide', 'leave')
    expect(
      screen.getByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveClass('osLeft')
    expect(
      screen.getByTestId('building-info-calculation-context')
    ).toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-calculation-context-panel')
    ).not.toBeVisible()
  })

  it('keeps the mobile basic tab stacked without the desktop grid', async () => {
    mockIsMobile = true

    renderBuildingInfoTabs()

    expect(
      await screen.findByTestId('building-info-tab-page-basic')
    ).toBeInTheDocument()
    expect(screen.getByTestId('building-info-tab-page-basic')).not.toHaveStyle({
      flexGrow: 1,
    })
    expect(screen.queryByTestId('building-info-grid')).not.toBeInTheDocument()
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual(['energyConsumption', 'buildingDetails'])
    expect(
      screen.getAllByTestId('sidebar-panel-extension-page-scroll')
    ).toHaveLength(1)
    expect(
      screen.queryByTestId(/^building-info-scroll-/)
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-energy-consumption-section')
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-calculation-context')
    ).toBeInTheDocument()
    expect(
      screen
        .getByTestId('building-info-calculation-context')
        .querySelector('[data-row-id="costMode"]')
    ).not.toBeInTheDocument()
  })

  it('can force the desktop basic tab into the mobile stacked layout', async () => {
    renderBuildingInfoTabs({ forceMobileLayout: true })

    expect(
      await screen.findByTestId('building-info-tab-page-basic')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('building-info-grid')).not.toBeInTheDocument()
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual(['energyConsumption', 'buildingDetails'])
  })

  it('can force the desktop renovation tab into the mobile stacked layout', async () => {
    renderBuildingInfoTabs({
      activeTabId: 'renovation',
      forceMobileLayout: true,
    })

    expect(
      await screen.findByTestId('building-info-tab-page-renovation')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('building-info-grid')).not.toBeInTheDocument()
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    const comparisonNote = screen
      .getByText(
        'sidebar.building_info.panels.renovation.note.scenario_estimate'
      )
      .closest('[data-status]')

    expect(comparisonNote).toHaveAttribute('data-note-id', 'scenarioEstimate')
    expect(comparisonNote).toHaveAttribute('data-status', 'estimate')
    expect(comparisonNote).toHaveAttribute(
      'data-source-properties',
      'default_total,aahp_total'
    )
  })

  it.each([
    ['desktop wide', false],
    ['forced-mobile stacked', true],
  ] as const)(
    'does not render a comparison note wrapper in the %s layout when notes are absent',
    async (_layoutName, forceMobileLayout) => {
      const panelsWithoutComparisonNotes = panels.map((panel) =>
        panel.id === 'renovationRecommendations'
          ? {
              ...panel,
              sections: panel.sections.map((section) =>
                section.id === 'scenarioComparison'
                  ? { ...section, notes: [] }
                  : section
              ),
            }
          : panel
      )

      renderBuildingInfoTabs({
        activeTabId: 'renovation',
        forceMobileLayout,
        panels: panelsWithoutComparisonNotes,
      })

      await screen.findByTestId('building-info-tab-page-renovation')
      expect(
        screen.queryByText(
          'sidebar.building_info.panels.renovation.note.scenario_estimate'
        )
      ).not.toBeInTheDocument()
      expect(
        document.querySelector('[data-note-id="scenarioEstimate"]')
      ).not.toBeInTheDocument()
    }
  )

  it('renders the interactive energy controls in the basic tab', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    const energyButton = within(energyPanel).getByRole('button', {
      name: 'sidebar.building_info.panels.energy.primary.energy',
    })
    const waterButton = within(energyPanel).getByRole('button', {
      name: 'sidebar.building_info.panels.energy.primary.water',
    })

    expect(within(energyPanel).queryByRole('combobox')).not.toBeInTheDocument()
    expect(energyButton).toHaveAttribute('aria-pressed', 'true')
    expect(energyButton).toHaveTextContent(
      'sidebar.building_info.panels.energy.primary.energy'
    )
    expect(waterButton).toHaveAttribute('aria-pressed', 'false')
    expect(waterButton).not.toHaveTextContent(
      'sidebar.building_info.panels.energy.primary.water'
    )
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.water_heating',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(energyPanel).getByTestId('building-info-energy-consumption-values')
    ).toHaveTextContent('100')
    expect(energyPanel).not.toHaveTextContent(
      'sidebar.building_info.panels.energy.unsupported.water_heating'
    )
  })

  it('renders certificate recommendations as a safe accessible disclosure', async () => {
    renderBuildingInfoTabs({ activeTabId: 'renovation' })

    await screen.findByTestId('building-info-tab-page-renovation')
    const trigger = screen.getByRole('button', {
      name: 'row.energy_certificate_recommendations.label',
    })
    const panel = screen.getByTestId(
      'building-info-expandable-source-text-panel-energyCertificateRecommendations'
    )
    const content = screen.getByTestId(
      'building-info-expandable-source-text-content-energyCertificateRecommendations'
    )

    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveAttribute('type', 'button')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', panel.id)
    expect(panel).not.toBeVisible()

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toBeVisible()
    expect(content).toHaveAttribute('lang', 'fi')
    expect(content).toHaveAttribute('data-status', 'real')
    expect(content).toHaveAttribute(
      'data-source-properties',
      'energy_certificate_recommendations_fi'
    )
    expect(content).toHaveStyle({
      whiteSpace: 'pre-line',
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    })
    expect(content.textContent).toBe(CERTIFICATE_RECOMMENDATION_SOURCE_TEXT)
    expect(
      content.querySelector('script, strong, [data-injected]')
    ).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(panel).not.toBeVisible()
  })

  it('updates the energy value table when submetrics are toggled', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    const values = within(energyPanel).getByTestId(
      'building-info-energy-consumption-values'
    )

    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    )
    expect(values).toHaveTextContent('30')
    expect(values).not.toHaveTextContent('100')
    expect(energyPanel).not.toHaveTextContent(
      'sidebar.building_info.panels.energy.unsupported.water_heating'
    )

    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    )
    expect(values).not.toBeInTheDocument()
    expect(
      within(energyPanel).queryByTestId(
        'building-info-energy-consumption-values'
      )
    ).not.toBeInTheDocument()
  })

  it('allows deselecting every supported energy submetric without a fallback placeholder', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    )
    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    )

    expect(
      within(energyPanel).queryByTestId(
        'building-info-energy-consumption-values'
      )
    ).not.toBeInTheDocument()
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.water_heating',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(energyPanel).not.toHaveTextContent(
      'sidebar.building_info.panels.energy.unsupported.water_heating'
    )
  })

  it('replaces the selected sparse submetric when no combined output exists', async () => {
    const sparseControls: EnergymapBuildingInfoConsumptionControls = {
      defaultPrimaryMetricId: 'energy',
      primaryMetrics: [consumptionControls.primaryMetrics[0]],
      defaultEnergySubmetricIds: ['electricity'],
      energySubmetrics: (consumptionControls.energySubmetrics ?? [])
        .filter(({ id }) => id === 'electricity' || id === 'heating')
        .map((submetric) => ({
          ...submetric,
          defaultSelected: submetric.id === 'electricity',
        })),
    }

    renderBuildingInfoTabs({
      panels: getPanelsWithConsumptionControls(sparseControls),
    })

    await screen.findByTestId('building-info-tab-page-basic')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    const values = within(energyPanel).getByTestId(
      'building-info-energy-consumption-values'
    )
    const electricityButton = within(energyPanel).getByRole('button', {
      name: 'panels.energy.series.electricity',
    })
    const heatingButton = within(energyPanel).getByRole('button', {
      name: 'panels.energy.series.heating',
    })

    expect(electricityButton).toHaveAttribute('aria-pressed', 'true')
    expect(heatingButton).toHaveAttribute('aria-pressed', 'false')
    expect(values).toHaveTextContent('30')
    expect(values).not.toHaveTextContent('70')

    fireEvent.click(heatingButton)

    expect(electricityButton).toHaveAttribute('aria-pressed', 'false')
    expect(heatingButton).toHaveAttribute('aria-pressed', 'true')
    expect(values).toHaveTextContent('70')
    expect(values).not.toHaveTextContent('30')

    fireEvent.click(electricityButton)

    expect(electricityButton).toHaveAttribute('aria-pressed', 'true')
    expect(heatingButton).toHaveAttribute('aria-pressed', 'false')
    expect(values).toHaveTextContent('30')
    expect(values).not.toHaveTextContent('70')
  })

  it('normalizes energy control state when building controls change', async () => {
    const controlsWithReducedOptions: EnergymapBuildingInfoConsumptionControls =
      {
        ...consumptionControls,
        primaryMetrics: consumptionControls.primaryMetrics.filter(
          (metric) => metric.id !== 'water'
        ),
        energySubmetrics: (consumptionControls.energySubmetrics ?? []).filter(
          (submetric) => submetric.id !== 'waterHeating'
        ),
        defaultEnergySubmetricIds: ['electricity', 'heating'],
      }
    const view = renderBuildingInfoTabs({
      panels: getPanelsWithConsumptionControls(consumptionControls),
    })

    await screen.findByTestId('building-info-tab-page-basic')
    const getEnergyPanel = () =>
      screen.getByTestId('building-info-panel-energyConsumption')

    fireEvent.click(
      within(getEnergyPanel()).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    )
    fireEvent.click(
      within(getEnergyPanel()).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    )
    expect(
      within(getEnergyPanel()).queryByTestId(
        'building-info-energy-consumption-values'
      )
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(getEnergyPanel()).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.water',
      })
    )

    view.rerenderBuildingInfoTabs({
      panels: getPanelsWithConsumptionControls(controlsWithReducedOptions),
    })

    await waitFor(() => {
      expect(
        within(getEnergyPanel()).getByRole('button', {
          name: 'sidebar.building_info.panels.energy.primary.energy',
        })
      ).toHaveAttribute('aria-pressed', 'true')
      expect(
        within(getEnergyPanel()).getByRole('button', {
          name: 'panels.energy.series.electricity',
        })
      ).toHaveAttribute('aria-pressed', 'true')
      expect(
        within(getEnergyPanel()).getByRole('button', {
          name: 'panels.energy.series.heating',
        })
      ).toHaveAttribute('aria-pressed', 'true')
    })

    fireEvent.click(
      within(getEnergyPanel()).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    )

    const values = within(getEnergyPanel()).getByTestId(
      'building-info-energy-consumption-values'
    )
    expect(values).toHaveTextContent('70')
    expect(values).not.toHaveTextContent('30')
    expect(
      within(getEnergyPanel()).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(getEnergyPanel()).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    ).toHaveAttribute('aria-pressed', 'true')

    view.rerenderBuildingInfoTabs({
      panels: getPanelsWithConsumptionControls(consumptionControls),
    })

    await waitFor(() => {
      expect(
        within(getEnergyPanel()).getByRole('button', {
          name: 'sidebar.building_info.panels.energy.primary.energy',
        })
      ).toHaveAttribute('aria-pressed', 'true')
      expect(
        within(getEnergyPanel()).getByRole('button', {
          name: 'sidebar.building_info.panels.energy.primary.water',
        })
      ).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('models Water with a local resident override and resets it when disabled', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )

    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.water',
      })
    )

    const waterButton = within(energyPanel).getByRole('button', {
      name: 'sidebar.building_info.panels.energy.primary.water',
    })
    expect(waterButton).toHaveAttribute('aria-pressed', 'true')
    expect(waterButton).toHaveTextContent(
      'sidebar.building_info.panels.energy.primary.water'
    )
    const waterPanel = within(energyPanel).getByTestId(
      'building-info-primary-metric-value'
    )
    const waterAnnualRow = waterPanel.querySelector(
      '[data-metric-value-id="annualTotal"]'
    ) as HTMLElement
    const waterControl = within(waterPanel).getByTestId(
      'building-info-water-resident-control'
    )
    const waterDescription = within(waterControl).getByTestId(
      'building-info-water-description'
    )
    const residentRow = within(waterControl).getByTestId(
      'building-info-water-resident-row'
    )
    const residentValueSlot = within(waterControl).getByTestId(
      'building-info-water-resident-value-slot'
    )
    const expectDefaultWaterProvenance = () => {
      expect(waterAnnualRow).toHaveAttribute(
        'data-provenance-id',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL
      )
      expect(waterAnnualRow).toHaveAttribute(
        'data-provenance-input-ids',
        ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS.join(' ')
      )
      expect(waterAnnualRow).toHaveAttribute(
        'data-source-properties',
        'floor_area'
      )
      expect(waterControl).toHaveAttribute(
        'data-provenance-id',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL
      )
      expect(waterControl).toHaveAttribute(
        'data-provenance-input-ids',
        ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(' ')
      )
      expect(waterControl).toHaveAttribute(
        'data-source-properties',
        'floor_area'
      )
    }
    const expectOverrideWaterProvenance = () => {
      expect(waterAnnualRow).toHaveAttribute(
        'data-provenance-id',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL
      )
      expect(waterAnnualRow).toHaveAttribute(
        'data-provenance-input-ids',
        ENERGYMAP_USER_OVERRIDE_WATER_PROVENANCE_INPUT_IDS.join(' ')
      )
      expect(waterAnnualRow).not.toHaveAttribute('data-source-properties')
      expect(waterControl).toHaveAttribute(
        'data-provenance-id',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL
      )
      expect(waterControl).toHaveAttribute(
        'data-provenance-input-ids',
        ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(
          ' '
        )
      )
      expect(waterControl).not.toHaveAttribute('data-source-properties')
    }
    const expectUnavailableWaterProvenance = () => {
      expect(waterAnnualRow).not.toHaveAttribute('data-provenance-id')
      expect(waterAnnualRow).not.toHaveAttribute('data-provenance-input-ids')
      expect(waterAnnualRow).not.toHaveAttribute('data-source-properties')
      expect(waterControl).toHaveAttribute(
        'data-provenance-id',
        ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL
      )
      expect(waterControl).toHaveAttribute(
        'data-provenance-input-ids',
        ENERGYMAP_USER_OVERRIDE_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(
          ' '
        )
      )
      expect(waterControl).not.toHaveAttribute('data-source-properties')
    }
    expect(waterPanel).toHaveAttribute('data-primary-metric-id', 'water')
    expect(waterPanel).toHaveAttribute('data-primary-metric-supported', 'true')
    expect(waterAnnualRow).toHaveTextContent(
      'sidebar.building_info.panels.energy.metric.annual_total'
    )
    expect(waterPanel).toHaveTextContent('481,8')
    expect(waterPanel).toHaveTextContent(
      'sidebar.building_info.units.cubic_meters_per_year'
    )
    expectDefaultWaterProvenance()
    expect(waterPanel.children[0]).toBe(waterAnnualRow)
    expect(waterPanel.children[1]).toBe(waterControl)
    expect(waterControl.children[0]).toBe(waterDescription)
    expect(waterControl.children[1]).toBe(residentRow)
    expect(waterDescription).toHaveAttribute('data-status', 'estimate')
    expect(waterDescription).toHaveTextContent(
      'sidebar.building_info.panels.energy.water.description'
    )
    expect(
      within(residentRow).getByTestId('building-info-water-resident-default')
    ).toHaveTextContent('11')
    expect(residentRow).toHaveTextContent(
      'sidebar.building_info.panels.energy.water.resident_count'
    )
    expect(residentValueSlot).toHaveAttribute('data-override-enabled', 'false')
    expect(residentValueSlot).toHaveStyle({ width: '4.75rem' })
    expect(residentRow).toHaveStyle({ columnGap: '0.75rem' })
    const overrideSwitch = within(energyPanel).getByRole('switch', {
      name: 'sidebar.building_info.panels.energy.water.change_resident_count',
    })
    expect(overrideSwitch).not.toBeChecked()
    fireEvent.click(overrideSwitch)
    const residentInput = within(energyPanel).getByRole('textbox', {
      name: 'sidebar.building_info.panels.energy.water.resident_count',
    })
    expect(
      energyPanel.querySelector('[data-slot="number-input-label"]')
    ).not.toBeInTheDocument()
    expect(
      within(waterControl).getByTestId('building-info-water-resident-row')
    ).toBe(residentRow)
    expect(
      within(waterControl).getByTestId(
        'building-info-water-resident-value-slot'
      )
    ).toBe(residentValueSlot)
    expect(residentValueSlot).toHaveAttribute('data-override-enabled', 'true')
    expectOverrideWaterProvenance()
    expect(
      residentInput.closest('[data-slot="number-input-root"]')
    ).toHaveAttribute('data-size', 'small')
    expect(
      residentInput.closest('[data-slot="number-input-container"]')
    ).toHaveStyle({ width: '4.75rem' })
    expect(residentRow).toHaveStyle({ columnGap: '1.75rem' })
    expect(
      residentInput.closest('[data-slot="number-input-control"]')
    ).toHaveStyle({
      marginLeft: '-1rem',
      marginRight: '-0.5625rem',
      width: 'calc(100% + 1.5625rem)',
    })
    fireEvent.change(residentInput, { target: { value: '12' } })
    await waitFor(() => {
      expect(waterPanel).toHaveTextContent('525,6')
      expectOverrideWaterProvenance()
    })
    fireEvent.change(residentInput, { target: { value: '' } })
    await waitFor(() => {
      expect(waterPanel).toHaveAttribute(
        'data-primary-metric-supported',
        'true'
      )
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expect(waterPanel).not.toHaveTextContent(
        'sidebar.building_info.units.cubic_meters_per_year'
      )
      expect(waterPanel).not.toHaveTextContent('525,6')
      expectUnavailableWaterProvenance()
    })
    fireEvent.blur(residentInput)
    await waitFor(() => {
      expect(residentInput).toHaveValue('11')
      expect(waterPanel).toHaveTextContent('481,8')
      expectOverrideWaterProvenance()
    })

    fireEvent.change(residentInput, { target: { value: '12,5' } })
    await waitFor(() => {
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expectUnavailableWaterProvenance()
    })
    fireEvent.blur(residentInput)
    await waitFor(() => {
      expect(residentInput).toHaveValue('11')
      expect(waterPanel).toHaveTextContent('481,8')
      expectOverrideWaterProvenance()
    })

    fireEvent.change(residentInput, { target: { value: '10001' } })
    await waitFor(() => {
      expect(residentInput).toHaveValue('10001')
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expectUnavailableWaterProvenance()
    })
    fireEvent.blur(residentInput)
    await waitFor(() => {
      expect(residentInput).toHaveValue('10000')
      expect(waterPanel).toHaveTextContent('438 000')
      expectOverrideWaterProvenance()
    })
    fireEvent.change(residentInput, { target: { value: '0' } })
    await waitFor(() => {
      expect(residentInput).toHaveValue('0')
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expectUnavailableWaterProvenance()
    })
    fireEvent.blur(residentInput)
    await waitFor(() => {
      expect(residentInput).toHaveValue('1')
      expect(waterPanel).toHaveTextContent('43,8')
      expectOverrideWaterProvenance()
    })

    fireEvent.change(residentInput, { target: { value: '-1' } })
    await waitFor(() => {
      expect(residentInput).toHaveValue('-1')
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expectUnavailableWaterProvenance()
    })
    fireEvent.blur(residentInput)
    await waitFor(() => {
      expect(residentInput).toHaveValue('1')
      expect(waterPanel).toHaveTextContent('43,8')
      expectOverrideWaterProvenance()
    })

    fireEvent.change(residentInput, { target: { value: 'abc' } })
    await waitFor(() => {
      expect(residentInput).toHaveValue('abc')
      expect(
        within(waterPanel).getByTestId('building-info-unavailable-value-icon')
      ).toBeInTheDocument()
      expectUnavailableWaterProvenance()
    })
    fireEvent.blur(residentInput)
    await waitFor(() => {
      expect(residentInput).toHaveValue('11')
      expect(waterPanel).toHaveTextContent('481,8')
      expectOverrideWaterProvenance()
    })

    fireEvent.click(overrideSwitch)
    expect(overrideSwitch).not.toBeChecked()
    expectDefaultWaterProvenance()
    expect(residentRow).toHaveStyle({ columnGap: '0.75rem' })
    expect(
      within(energyPanel).getByTestId('building-info-water-resident-default')
    ).toHaveTextContent('11')
    fireEvent.click(overrideSwitch)
    expect(
      within(energyPanel).getByLabelText(
        'sidebar.building_info.panels.energy.water.resident_count'
      )
    ).toHaveValue('11')
    fireEvent.click(overrideSwitch)
    expect(
      within(energyPanel).queryByTestId('building-info-energy-submetric-row')
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.cost',
      })
    )
    const costPanel = within(energyPanel).getByTestId(
      'building-info-primary-metric-value'
    )
    const costAnnualRow = costPanel.querySelector(
      '[data-metric-value-id="annualTotal"]'
    ) as HTMLElement
    expect(costPanel).toHaveAttribute('data-primary-metric-id', 'cost')
    expect(costPanel).toHaveAttribute('data-primary-metric-supported', 'true')
    expect(costAnnualRow).toHaveTextContent(
      'sidebar.building_info.panels.energy.metric.annual_total'
    )
    expect(costPanel).toHaveTextContent('19,613')
    expect(costPanel).toHaveTextContent(
      'sidebar.building_info.units.eur_per_year'
    )
    expect(
      within(costPanel).queryByTestId('building-info-unavailable-value-icon')
    ).not.toBeInTheDocument()

    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.co2',
      })
    )
    const co2Panel = within(energyPanel).getByTestId(
      'building-info-primary-metric-value'
    )
    const co2AnnualRow = co2Panel.querySelector(
      '[data-metric-value-id="annualTotal"]'
    ) as HTMLElement
    expect(co2Panel).toHaveAttribute('data-primary-metric-id', 'co2')
    expect(co2Panel).toHaveAttribute('data-primary-metric-supported', 'true')
    expect(co2AnnualRow).toHaveTextContent(
      'sidebar.building_info.panels.energy.metric.annual_total'
    )
    expect(co2Panel).toHaveTextContent('18,436')
    expect(co2Panel).toHaveTextContent(
      'sidebar.building_info.units.kg_co2_per_year'
    )

    fireEvent.click(
      within(energyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.energy',
      })
    )
    expect(
      within(energyPanel).getByTestId('building-info-energy-submetric-row')
    ).toBeInTheDocument()
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.electricity',
      })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.heating',
      })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('discards a Water resident override when the keyed building panel changes', async () => {
    const view = renderBuildingInfoTabs({ panelKey: 'building-a' })

    await screen.findByTestId('building-info-tab-page-basic')
    const getEnergyPanel = () =>
      screen.getByTestId('building-info-panel-energyConsumption')
    const getWaterButton = () =>
      within(getEnergyPanel()).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.water',
      })

    fireEvent.click(getWaterButton())
    const getOverrideSwitch = () =>
      within(getEnergyPanel()).getByRole('switch', {
        name: 'sidebar.building_info.panels.energy.water.change_resident_count',
      })
    fireEvent.click(getOverrideSwitch())
    fireEvent.change(
      within(getEnergyPanel()).getByLabelText(
        'sidebar.building_info.panels.energy.water.resident_count'
      ),
      { target: { value: '12' } }
    )
    await waitFor(() => {
      expect(
        within(getEnergyPanel()).getByTestId(
          'building-info-primary-metric-value'
        )
      ).toHaveTextContent('525,6')
    })

    view.rerenderBuildingInfoTabs({ panelKey: 'building-b' })

    await screen.findByTestId('building-info-tab-page-basic')
    fireEvent.click(getWaterButton())
    expect(getOverrideSwitch()).not.toBeChecked()
    expect(
      within(getEnergyPanel()).queryByLabelText(
        'sidebar.building_info.panels.energy.water.resident_count'
      )
    ).not.toBeInTheDocument()
    expect(
      within(getEnergyPanel()).getByTestId(
        'building-info-water-resident-default'
      )
    ).toHaveTextContent('11')
    expect(
      within(getEnergyPanel()).getByTestId('building-info-primary-metric-value')
    ).toHaveTextContent('481,8')
    const resetWaterPanel = within(getEnergyPanel()).getByTestId(
      'building-info-primary-metric-value'
    )
    expect(
      resetWaterPanel.querySelector('[data-metric-value-id="annualTotal"]')
    ).toHaveAttribute(
      'data-provenance-input-ids',
      ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS.join(' ')
    )
    expect(
      within(resetWaterPanel).getByTestId(
        'building-info-water-resident-control'
      )
    ).toHaveAttribute(
      'data-provenance-input-ids',
      ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS.join(' ')
    )
  })

  it('sizes CO2 primary metric icons to match the other metric symbols', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    const co2Button = within(energyPanel).getByRole('button', {
      name: 'sidebar.building_info.panels.energy.primary.co2',
    })

    expect(within(co2Button).getByTestId('building-info-icon-co2')).toHaveStyle(
      {
        fontSize: '1.25rem',
      }
    )

    fireEvent.click(co2Button)

    const activeCo2Button = within(energyPanel).getByRole('button', {
      name: 'sidebar.building_info.panels.energy.primary.co2',
    })
    expect(
      within(activeCo2Button).getByTestId('building-info-icon-co2')
    ).toHaveStyle({
      fontSize: '1.4rem',
    })
  })

  it('renders the same interactive energy section in the renovation tab', async () => {
    renderBuildingInfoTabs()

    fireEvent.click(
      await screen.findByRole('tab', {
        name: 'Open renovation recommendations',
      })
    )

    await screen.findByTestId('building-info-tab-page-renovation')
    const energyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )

    expect(
      within(energyPanel).getByTestId(
        'building-info-energy-consumption-section'
      )
    ).toBeInTheDocument()
    expect(
      within(energyPanel).getByRole('button', {
        name: 'panels.energy.series.water_heating',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(energyPanel).not.toHaveTextContent(
      'sidebar.building_info.panels.energy.unsupported.water_heating'
    )
  })

  it('can open on the requested tab after collapsed-tab selection', async () => {
    renderBuildingInfoTabs({ activeTabId: 'renovation' })

    expect(
      await screen.findByTestId('building-info-tab-page-renovation')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'Open renovation recommendations',
      })
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('does not report the transient first tab while restoring the requested tab', async () => {
    const onActiveTabChange = jest.fn()

    renderBuildingInfoTabs({
      activeTabId: 'renovation',
      onActiveTabChange,
    })

    expect(
      await screen.findByTestId('building-info-tab-page-renovation')
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('renovation')
    })
    expect(onActiveTabChange).not.toHaveBeenCalledWith('basic')
  })

  it('calls page-level collapse and close controls independently', async () => {
    const onCollapse = jest.fn()
    const onClose = jest.fn()

    renderBuildingInfoTabs({ onCollapse, onClose })

    await screen.findByTestId('building-info-tab-page-basic')
    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse building information' })
    )
    expect(onCollapse).toHaveBeenCalledWith('basic')
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(
      screen.getByRole('button', { name: 'Close building information' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses shared page-control geometry for default desktop building info', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')

    const controls = document.querySelector(
      '.sidebar-panel-extension-page-container-controls'
    ) as HTMLElement
    const extensionRoot = screen.getByTestId('sidebar-panel-extension-root')
    const extensionRootStyle = window.getComputedStyle(extensionRoot)

    expect(controls).not.toHaveStyle({
      position: 'absolute',
      top: '35px',
      left: 'min(624px, calc(100% - 116px))',
    })
    expect(
      extensionRootStyle.getPropertyValue(
        '--sidebar-panel-extension-page-controls-position'
      )
    ).toBe('fixed')
    expect(
      extensionRootStyle.getPropertyValue(
        '--sidebar-panel-extension-page-controls-top'
      )
    ).toBe('16px')
  })

  it('places fullscreen page controls in the viewport top-right', async () => {
    renderBuildingInfoTabs({ isDesktopFullscreenLayout: true })

    await screen.findByTestId('building-info-tab-page-basic')

    const controls = document.querySelector(
      '.sidebar-panel-extension-page-container-controls'
    ) as HTMLElement
    const collapseButton = screen.getByRole('button', {
      name: 'Collapse building information',
    })

    expect(controls).toHaveStyle({
      position: 'fixed',
      top: '16px',
      right: '16px',
    })
    expect(collapseButton).toHaveStyle({
      boxShadow: '0 2px 8px rgba(17, 17, 17, 0.12)',
    })
    expect(
      within(collapseButton).getByTestId(
        'sidebar-panel-extension-collapse-icon'
      )
    ).toHaveStyle({
      fontSize: '1.85rem',
    })
  })

  it('reports the active renovation tab when collapsing that page', async () => {
    const onCollapse = jest.fn()

    renderBuildingInfoTabs({ onCollapse })

    fireEvent.click(
      await screen.findByRole('tab', {
        name: 'Open renovation recommendations',
      })
    )
    await screen.findByTestId('building-info-tab-page-renovation')
    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse building information' })
    )

    expect(onCollapse).toHaveBeenCalledWith('renovation')
  })

  it('preserves value metadata in tab-page panel bodies', async () => {
    renderBuildingInfoTabs({ activeTabId: 'renovation' })

    await screen.findByTestId('building-info-tab-page-renovation')
    const value = screen.getByText('value.part_a').closest('[data-status]')

    expect(value).toHaveTextContent('value.part_a / plain value + value.part_b')
    expect(value).toHaveAttribute('data-status', 'estimate')
    expect(value).toHaveAttribute(
      'data-source-properties',
      'distr_default_total,floor_area'
    )
  })

  it('renders ventilation source text literally with source metadata', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const ventilationValue = screen
      .getByText(VENTILATION_SOURCE_TEXT)
      .closest('[data-status="real"]')

    expect(ventilationValue).toBeInTheDocument()
    expect(ventilationValue).toHaveAttribute('lang', 'fi')
    expect(ventilationValue).toHaveAttribute('data-status', 'real')
    expect(ventilationValue).toHaveAttribute(
      'data-source-properties',
      'energy_certificate_ventilation_description_fi'
    )
    expect(ventilationValue).toHaveTextContent(VENTILATION_SOURCE_TEXT)
    expect(
      ventilationValue?.querySelector('strong, script, [data-injected]')
    ).not.toBeInTheDocument()
  })

  it('renders the Figma panel graphics from sidebar assets', async () => {
    renderBuildingInfoTabs({ activeTabId: 'renovation' })

    await screen.findByTestId('building-info-tab-page-renovation')
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-two-panel.svg"]'
      )
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-three-panel-left.svg"]'
      )
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-energy-lightning.svg"]'
      )
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-renovation-icon-center.svg"]'
      )
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-renovation-building.svg"]'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-graphic-renovation-building')
    ).toHaveAttribute('data-figma-height', '300')
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-renovation-building-small-a.svg"]'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-graphic-renovation-building-small-a')
    ).toHaveAttribute('data-figma-height', '138.003')
    expect(
      document.querySelector(
        'img[src="/files/img/energiakartta/sidebar/building-info-unavailable-value.svg"]'
      )
    ).not.toBeInTheDocument()
  })

  it('renders modeled energy-class help in the label cell with accessible pointer and keyboard behavior', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const energyClassRow = document.querySelector(
      '[data-section-row-id="energyClass"]'
    ) as HTMLElement
    const [labelCell, valueCell] = Array.from(
      energyClassRow.children
    ) as HTMLElement[]
    const stack = within(valueCell).getByTestId(
      'building-info-energy-class-value-stack'
    )
    const indicator = within(labelCell).getByTestId(
      'building-info-modeled-energy-class-indicator'
    )
    const baseLabel = within(labelCell).getByText('row.energy_class.label')
    const modeledLabel = within(labelCell).getByText(
      'sidebar.building_info.panels.building.energy_class_modeled.label'
    )
    const trigger = within(labelCell).getByRole('button', {
      name: 'sidebar.building_info.panels.building.energy_class_modeled.help_aria_label',
    })
    const classValue = within(valueCell).getByText('B')

    expect(energyClassRow).toBeInTheDocument()
    expect(
      document.querySelectorAll('[data-section-row-id="energyClass"]')
    ).toHaveLength(1)
    expect(stack).toHaveStyle({
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    })
    expect(labelCell).toHaveTextContent(
      'row.energy_class.label (sidebar.building_info.panels.building.energy_class_modeled.label)'
    )
    expect(indicator).toHaveAttribute(
      'data-source-properties',
      'is_energy_class_modeled'
    )
    expect(indicator).toHaveStyle({
      display: 'inline-flex',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
    })
    expect(
      baseLabel.compareDocumentPosition(modeledLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      modeledLabel.compareDocumentPosition(trigger) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(labelCell).toContainElement(indicator)
    expect(labelCell).toContainElement(trigger)
    expect(valueCell).toContainElement(classValue)
    expect(valueCell).not.toContainElement(indicator)
    expect(within(valueCell).queryByRole('button')).not.toBeInTheDocument()
    expect(valueCell).not.toHaveTextContent(
      'sidebar.building_info.panels.building.energy_class_modeled.label'
    )
    expect(trigger.tagName).toBe('BUTTON')
    expect(trigger).toHaveAttribute('type', 'button')
    expect(trigger.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(trigger).not.toHaveAttribute('aria-describedby')

    fireEvent.mouseEnter(trigger)
    const tooltip = await screen.findByRole('tooltip')
    const tooltipText =
      'sidebar.building_info.panels.building.energy_class_modeled.tooltip'

    expect(tooltip).toHaveTextContent(tooltipText)
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
    expect(trigger).toHaveAccessibleDescription(tooltipText)
    fireEvent.mouseLeave(trigger)
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
    expect(trigger).not.toHaveAttribute('aria-describedby')

    fireEvent.focus(trigger)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'sidebar.building_info.panels.building.energy_class_modeled.tooltip'
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('toggles modeled energy-class help on click for touch use', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const triggerName =
      'sidebar.building_info.panels.building.energy_class_modeled.help_aria_label'
    const trigger = screen.getByRole('button', { name: triggerName })

    fireEvent.click(trigger)
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent(
      'sidebar.building_info.panels.building.energy_class_modeled.tooltip'
    )
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
    fireEvent.click(
      screen.getByRole('button', {
        name: triggerName,
      })
    )
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it.each([
    ['official', ['energy_class', 'is_energy_class_modeled']],
    ['origin-unknown', ['energy_class']],
  ])(
    'renders the ordinary energy-class row without modeled help for %s provenance',
    async (_origin, sourceProperties) => {
      renderBuildingInfoTabs({
        panels: getPanelsWithoutModeledEnergyClassIndicator(sourceProperties),
      })

      await screen.findByTestId('building-info-tab-page-basic')
      const energyClassRow = document.querySelector(
        '[data-section-row-id="energyClass"]'
      ) as HTMLElement
      const [labelCell, valueCell] = Array.from(
        energyClassRow.children
      ) as HTMLElement[]

      expect(labelCell).toHaveTextContent(/^row\.energy_class\.label$/)
      expect(within(valueCell).getByText('B')).toBeInTheDocument()
      expect(
        within(valueCell).getByText('B').closest('[data-source-properties]')
      ).toHaveAttribute('data-source-properties', sourceProperties.join(','))
      expect(
        screen.queryByTestId('building-info-modeled-energy-class-indicator')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', {
          name: 'sidebar.building_info.panels.building.energy_class_modeled.help_aria_label',
        })
      ).not.toBeInTheDocument()
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      expect(energyClassRow).not.toHaveTextContent(
        'sidebar.building_info.panels.building.energy_class_modeled.label'
      )
    }
  )

  it('renders the building address as a stacked sub-header instead of a table row', async () => {
    renderBuildingInfoTabs()

    await screen.findByTestId('building-info-tab-page-basic')
    const addressSubheader = document.querySelector(
      '[data-building-subheader-row-id="address"]'
    ) as HTMLElement | null

    expect(addressSubheader).toBeInTheDocument()
    expect(
      document.querySelector('[data-row-id="address"]')
    ).not.toBeInTheDocument()
    expect(
      within(addressSubheader as HTMLElement).getByText(/row.address.label/)
        .parentElement
    ).toHaveStyle({ fontWeight: '400' })
    expect(
      within(addressSubheader as HTMLElement)
        .getByText('Test address 1')
        .closest('[data-status]')
    ).toHaveStyle({ fontWeight: '700' })
  })

  it('keeps labels and section titles regular while values stay bold', async () => {
    renderBuildingInfoTabs({ activeTabId: 'renovation' })

    await screen.findByTestId('building-info-tab-page-renovation')
    expect(screen.getByText('scenario.aahp.label').parentElement).toHaveStyle({
      fontWeight: '400',
    })
    expect(
      screen.getByText('panel.renovation.title').parentElement
    ).toHaveStyle({
      fontWeight: '400',
    })
    expect(screen.getByText('12000').closest('[data-status]')).toHaveStyle({
      fontWeight: '700',
    })
  })

  it('renders a lone basic panel without a tab rail, companion cell, or legacy minimum height', async () => {
    const buildingPanel = panels.find(
      (panel) => panel.id === 'buildingDetails'
    ) as EnergymapBuildingInfoPanel

    renderBuildingInfoTabs({ panels: [buildingPanel] })

    await screen.findByTestId('building-info-tab-page-basic')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByTestId('building-info-grid')).toHaveAttribute(
      'data-building-info-content-width',
      '380'
    )
    expect(screen.getByTestId('building-info-grid-row-basic')).toHaveAttribute(
      'data-grid-region-count',
      '1'
    )
    expect(screen.getByTestId('building-info-grid-row-basic')).not.toHaveStyle({
      minHeight: '1256px',
    })
    expect(
      screen.queryByTestId('building-info-grid-section-basic-energy')
    ).not.toBeInTheDocument()
  })

  it('keeps two present-but-sparse basic panels content-height driven', async () => {
    const energyPanel = panels.find(
      (panel) => panel.id === 'energyConsumption'
    ) as EnergymapBuildingInfoPanel
    const buildingPanel = panels.find(
      (panel) => panel.id === 'buildingDetails'
    ) as EnergymapBuildingInfoPanel

    renderBuildingInfoTabs({
      panels: [
        {
          ...energyPanel,
          sections: energyPanel.sections.filter(
            (section) => section.id === 'energyRows'
          ),
        },
        {
          ...buildingPanel,
          sections: buildingPanel.sections.filter(
            (section) => section.id === 'buildingSubheader'
          ),
        },
      ],
    })

    await screen.findByTestId('building-info-tab-page-basic')
    expect(screen.getByTestId('building-info-grid-row-basic')).toHaveAttribute(
      'data-grid-region-count',
      '2'
    )
    expect(screen.getByTestId('building-info-grid')).not.toHaveStyle({
      minHeight: '1256px',
    })
    expect(screen.getByTestId('building-info-grid-row-basic')).not.toHaveStyle({
      minHeight: '1256px',
    })
    expect(
      screen.queryByText('section.energy.estimated.title')
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-section-row-id="energyClass"]')
    ).not.toBeInTheDocument()
  })

  it('keeps three present-but-sparse renovation panels content-height driven', async () => {
    const energyPanel = panels.find(
      (panel) => panel.id === 'energyConsumption'
    ) as EnergymapBuildingInfoPanel
    const renovationPanel = panels.find(
      (panel) => panel.id === 'renovationRecommendations'
    ) as EnergymapBuildingInfoPanel
    const buildingPanel = panels.find(
      (panel) => panel.id === 'buildingDetails'
    ) as EnergymapBuildingInfoPanel

    renderBuildingInfoTabs({
      activeTabId: 'renovation',
      panels: [
        {
          ...energyPanel,
          sections: energyPanel.sections.filter(
            (section) => section.id === 'energyRows'
          ),
        },
        renovationPanel,
        {
          ...buildingPanel,
          sections: buildingPanel.sections.filter(
            (section) => section.id === 'buildingSubheader'
          ),
        },
      ],
    })

    await screen.findByTestId('building-info-tab-page-renovation')
    expect(
      screen.getByTestId('building-info-grid-row-renovationTop')
    ).toHaveAttribute('data-grid-region-count', '3')
    expect(
      screen.getByTestId('building-info-grid-row-renovationTop')
    ).not.toHaveStyle({ minHeight: '1300px' })
    expect(
      screen.getByTestId('building-info-grid-row-renovationComparison')
    ).not.toHaveStyle({ minHeight: '1065px' })
    expect(screen.getByTestId('building-info-grid')).not.toHaveStyle({
      minHeight: '2365px',
    })
    expect(
      screen.queryByText('section.energy.estimated.title')
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-section-row-id="energyClass"]')
    ).not.toBeInTheDocument()
  })

  it('rehomes an invalid basic request to a renovation-only topology', async () => {
    const onActiveTabChange = jest.fn()
    const renovationPanel = panels.find(
      (panel) => panel.id === 'renovationRecommendations'
    ) as EnergymapBuildingInfoPanel
    const renovationWithoutComparison = {
      ...renovationPanel,
      sections: renovationPanel.sections.filter(
        (section) => section.id !== 'scenarioComparison'
      ),
    }

    renderBuildingInfoTabs({
      activeTabId: 'basic',
      onActiveTabChange,
      panels: [renovationWithoutComparison],
    })

    await screen.findByTestId('building-info-tab-page-renovation')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-grid-row-renovationComparison')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-grid-section-bottom-right')
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('renovation')
    })
    expect(onActiveTabChange).not.toHaveBeenCalledWith('basic')
  })

  it('renders a comparison-only renovation topology without an empty top row', async () => {
    const renovationPanel = panels.find(
      (panel) => panel.id === 'renovationRecommendations'
    ) as EnergymapBuildingInfoPanel

    renderBuildingInfoTabs({
      activeTabId: 'renovation',
      panels: [
        {
          ...renovationPanel,
          sections: renovationPanel.sections.filter(
            (section) => section.id === 'scenarioComparison'
          ),
        },
      ],
    })

    await screen.findByTestId('building-info-tab-page-renovation')
    expect(
      screen.queryByTestId('building-info-grid-row-renovationTop')
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-grid-row-renovationComparison')
    ).not.toHaveStyle({ minHeight: '1065px' })
    expect(
      screen.getByTestId('building-info-renovation-effectiveness-content')
    ).toBeInTheDocument()
  })

  it.each([
    {
      label: 'one',
      panelIds: ['renovationRecommendations'] as const,
      slots: ['top-renovation'],
    },
    {
      label: 'two',
      panelIds: ['energyConsumption', 'renovationRecommendations'] as const,
      slots: ['top-energy', 'top-renovation'],
    },
  ])(
    'fills the comparison width with $label retained top region(s)',
    async ({ panelIds, slots }) => {
      const sparsePanels = getPanelsByIds(panelIds)

      renderBuildingInfoTabs({
        activeTabId: 'renovation',
        panels: sparsePanels,
      })

      await screen.findByTestId('building-info-tab-page-renovation')
      const topRow = screen.getByTestId('building-info-grid-row-renovationTop')

      expect(topRow).toHaveAttribute(
        'data-grid-region-count',
        String(panelIds.length)
      )
      expect(topRow).toHaveAttribute('data-grid-content-width', '1440')
      expect(topRow).toHaveStyle({ width: 'min(1440px, 100%)' })
      expect(
        Array.from(topRow.children).map((child) =>
          child.getAttribute('data-grid-slot')
        )
      ).toEqual(slots)
      expect(
        screen.getByTestId('building-info-grid-row-renovationComparison')
      ).toBeInTheDocument()
    }
  )

  it.each([
    {
      label: 'one',
      panelIds: ['renovationRecommendations'] as const,
    },
    {
      label: 'two',
      panelIds: ['energyConsumption', 'renovationRecommendations'] as const,
    },
  ])(
    'uses the same comparison-plus-$label-top-region topology in forced mobile layout',
    async ({ panelIds }) => {
      const sparsePanels = getPanelsByIds(panelIds)

      renderBuildingInfoTabs({
        activeTabId: 'renovation',
        forceMobileLayout: true,
        panels: sparsePanels,
      })

      await screen.findByTestId('building-info-tab-page-renovation')
      expect(screen.queryByTestId('building-info-grid')).not.toBeInTheDocument()
      expect(
        screen
          .getAllByTestId(/building-info-panel-/)
          .map((panel) => panel.dataset.panelId)
      ).toEqual(panelIds)
      expect(screen.getByText('scenario.aahp.label')).toBeInTheDocument()

      if (panelIds.includes('energyConsumption')) {
        expect(
          screen.getByTestId('building-info-calculation-context')
        ).toBeInTheDocument()
      }
    }
  )

  it('renders every section retained by the normalized panel model', async () => {
    const energyPanel = panels.find(
      (panel) => panel.id === 'energyConsumption'
    ) as EnergymapBuildingInfoPanel
    const authoritativeEnergyPanel: EnergymapBuildingInfoPanel = {
      ...energyPanel,
      sections: [
        {
          id: 'calculationContext',
          rows: [
            {
              id: 'retainedCalculationRow',
              label: plain('Retained calculation label'),
              text: plain('Retained calculation value'),
              status: 'real',
            },
          ],
        },
        {
          id: 'futureCertificateSection',
          variant: 'energyCertificate',
          rows: [
            {
              id: 'futureCertificateRow',
              label: plain('Future certificate label'),
              text: plain('Future certificate value'),
              status: 'real',
            },
          ],
        },
      ],
    }

    renderBuildingInfoTabs({ panels: [authoritativeEnergyPanel] })

    await screen.findByTestId('building-info-tab-page-basic')
    expect(screen.getByText('Retained calculation value')).toBeInTheDocument()
    expect(screen.getByText('Future certificate value')).toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-calculation-context')
    ).not.toBeInTheDocument()
  })

  it('omits the shell for a defensively supplied panel with no sections', () => {
    const energyPanel = panels.find(
      (panel) => panel.id === 'energyConsumption'
    ) as EnergymapBuildingInfoPanel

    renderBuildingInfoTabs({
      panels: [{ ...energyPanel, sections: [] }],
    })

    expect(
      screen.queryByTestId('building-info-tab-page-basic')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(
      document.querySelector('.sidebar-panel-extension-page-container-controls')
    ).not.toBeInTheDocument()
  })

  it('replaces complete, sparse, and empty topologies without stale pages or cells', async () => {
    const onActiveTabChange = jest.fn()
    const buildingPanel = panels.find(
      (panel) => panel.id === 'buildingDetails'
    ) as EnergymapBuildingInfoPanel
    const view = renderBuildingInfoTabs({
      activeTabId: 'renovation',
      onActiveTabChange,
    })

    await screen.findByTestId('building-info-tab-page-renovation')
    view.rerenderBuildingInfoTabs({
      activeTabId: 'renovation',
      panels: [buildingPanel],
    })

    await screen.findByTestId('building-info-tab-page-basic')
    expect(
      screen.queryByTestId('building-info-tab-page-renovation')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-grid-section-top-renovation')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(onActiveTabChange).toHaveBeenCalledWith('basic')
    })

    view.rerenderBuildingInfoTabs({ panels: [] })
    expect(
      screen.queryByTestId('building-info-tab-page-basic')
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('.sidebar-panel-extension-page-container-controls')
    ).not.toBeInTheDocument()
  })

  it('replaces a changed sparse control and tab with complete building defaults', async () => {
    const energyPanel = panels.find(
      (panel) => panel.id === 'energyConsumption'
    ) as EnergymapBuildingInfoPanel
    const renovationPanel = panels.find(
      (panel) => panel.id === 'renovationRecommendations'
    ) as EnergymapBuildingInfoPanel
    const sparsePanels = [
      {
        ...energyPanel,
        sections: energyPanel.sections.filter(
          (section) => section.id === 'estimatedConsumption'
        ),
      },
      {
        ...renovationPanel,
        sections: renovationPanel.sections.filter(
          (section) => section.id === 'publishedRecommendations'
        ),
      },
    ]
    const view = renderBuildingInfoTabs({
      panelKey: 'sparse-building',
      panels: sparsePanels,
    })

    await screen.findByTestId('building-info-tab-page-basic')
    const sparseEnergyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    fireEvent.click(
      within(sparseEnergyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.water',
      })
    )
    fireEvent.click(
      within(sparseEnergyPanel).getByRole('switch', {
        name: 'sidebar.building_info.panels.energy.water.change_resident_count',
      })
    )
    expect(
      within(sparseEnergyPanel).getByRole('textbox', {
        name: 'sidebar.building_info.panels.energy.water.resident_count',
      })
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('tab', {
        name: 'Open renovation recommendations',
      })
    )
    await screen.findByTestId('building-info-tab-page-renovation')

    view.rerenderBuildingInfoTabs({
      activeTabId: 'basic',
      panelKey: 'complete-building',
      panels,
    })

    await screen.findByTestId('building-info-tab-page-basic')
    expect(
      screen.queryByTestId('building-info-tab-page-renovation')
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('building-info-grid')).toHaveAttribute(
      'data-building-info-content-width',
      '760'
    )
    expect(screen.getByTestId('building-info-grid-row-basic')).toHaveAttribute(
      'data-grid-region-count',
      '2'
    )
    expect(
      screen.getByTestId('building-info-panel-buildingDetails')
    ).toBeInTheDocument()
    const completeEnergyPanel = screen.getByTestId(
      'building-info-panel-energyConsumption'
    )
    expect(
      within(completeEnergyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.energy',
      })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(completeEnergyPanel).getByRole('button', {
        name: 'sidebar.building_info.panels.energy.primary.water',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      within(completeEnergyPanel).queryByRole('textbox', {
        name: 'sidebar.building_info.panels.energy.water.resident_count',
      })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'Open energy and building information',
      })
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps both collapsed reopen buttons available without owning expanded tab switching', () => {
    const onModeChange = jest.fn()

    renderWithTheme(
      <BuildingInfoActionRail
        activeMode="twoPanel"
        availableModes={['twoPanel', 'threePanel']}
        isCollapsed={true}
        ariaLabels={ariaLabels}
        onModeChange={onModeChange}
      />
    )

    expect(
      screen.getByRole('button', {
        name: 'Open energy and building information',
      })
    ).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('building-info-action-rail')).toHaveAttribute(
      'data-orientation',
      'column'
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open renovation recommendations',
      })
    )

    expect(onModeChange).toHaveBeenCalledWith('threePanel')
  })

  it('renders only available collapsed actions and no rail at zero actions', () => {
    const onModeChange = jest.fn()
    const view = renderWithTheme(
      <BuildingInfoActionRail
        activeMode="twoPanel"
        availableModes={['twoPanel']}
        isCollapsed
        ariaLabels={ariaLabels}
        onModeChange={onModeChange}
      />
    )

    expect(
      screen.getByRole('button', {
        name: 'Open energy and building information',
      })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Open renovation recommendations',
      })
    ).not.toBeInTheDocument()

    view.rerender(
      <AppThemeProvider disableCssBaseline>
        <BuildingInfoActionRail
          activeMode="twoPanel"
          availableModes={[]}
          isCollapsed
          ariaLabels={ariaLabels}
          onModeChange={onModeChange}
        />
      </AppThemeProvider>
    )
    expect(
      screen.queryByTestId('building-info-action-rail')
    ).not.toBeInTheDocument()
  })

  it('keeps expanded building info runtime on the main panel only', () => {
    const desktopOptions = getEnergymapBuildingInfoPanelRuntimeOptions({
      hasBuildingInfo: true,
      isBuildingInfoCollapsed: false,
      isMobileLayout: false,
      desktopContentWidthPx: 760,
    })
    const mobileOptions = getEnergymapBuildingInfoPanelRuntimeOptions({
      hasBuildingInfo: true,
      isBuildingInfoCollapsed: false,
      isMobileLayout: true,
      desktopContentWidthPx: 1440,
    })
    const renovationDesktopOptions =
      getEnergymapBuildingInfoPanelRuntimeOptions({
        hasBuildingInfo: true,
        isBuildingInfoCollapsed: false,
        isMobileLayout: false,
        desktopContentWidthPx: 1440,
      })

    expect(desktopOptions).toMatchObject({
      width: 'wide',
      chrome: 'hidden',
      panelLayout: 'single',
      visiblePanels: ['main'],
      replaceBaseSidebar: true,
      layoutMode: 'default',
      desktopMainPanelWidth: '760px',
      forceMobileLayout: false,
      activePanel: 'main',
      actionRailPlacement: 'inside',
    })
    expect(mobileOptions).toMatchObject({
      width: 'wide',
      chrome: 'hidden',
      panelLayout: 'single',
      visiblePanels: ['main'],
      replaceBaseSidebar: true,
      layoutMode: 'default',
      forceMobileLayout: true,
      activePanel: 'main',
      actionRailPlacement: 'bottomActionRow',
    })
    expect(renovationDesktopOptions).toMatchObject({
      width: 'wide',
      chrome: 'hidden',
      panelLayout: 'single',
      visiblePanels: ['main'],
      replaceBaseSidebar: true,
      layoutMode: 'default',
      desktopMainPanelWidth: `${ENERGYMAP_BUILDING_INFO_RENOVATION_DESKTOP_PANEL_WIDTH_PX}px`,
      forceMobileLayout: false,
      activePanel: 'main',
      actionRailPlacement: 'inside',
    })
    expect(renovationDesktopOptions).not.toHaveProperty(
      'desktopPanelGroupMaxWidth'
    )
    expect(desktopOptions.visiblePanels).not.toContain('secondary')
    expect(desktopOptions.visiblePanels).not.toContain('tertiary')
    expect(mobileOptions.visiblePanels).not.toContain('secondary')
    expect(mobileOptions.visiblePanels).not.toContain('tertiary')
  })

  it('uses explicit desktop fullscreen fallback without forcing mobile layout', () => {
    const fullscreenFallbackOptions =
      getEnergymapBuildingInfoPanelRuntimeOptions({
        hasBuildingInfo: true,
        isBuildingInfoCollapsed: false,
        isMobileLayout: false,
        isDesktopFullscreenFallback: true,
        desktopContentWidthPx: 1440,
      })
    const mobileOptions = getEnergymapBuildingInfoPanelRuntimeOptions({
      hasBuildingInfo: true,
      isBuildingInfoCollapsed: false,
      isMobileLayout: true,
      isDesktopFullscreenFallback: true,
      desktopContentWidthPx: 1440,
    })

    expect(fullscreenFallbackOptions).toMatchObject({
      width: 'wide',
      chrome: 'hidden',
      visiblePanels: ['main'],
      replaceBaseSidebar: true,
      layoutMode: 'fullscreen',
      forceMobileLayout: false,
      activePanel: 'main',
    })
    expect(fullscreenFallbackOptions.desktopMainPanelWidth).toBeUndefined()
    expect(fullscreenFallbackOptions.desktopPanelGroupMaxWidth).toBeUndefined()
    expect(mobileOptions).toMatchObject({
      layoutMode: 'default',
      forceMobileLayout: true,
      actionRailPlacement: 'bottomActionRow',
    })
  })

  it('keeps collapsed building info runtime action rail without visible panels', () => {
    const desktopOptions = getEnergymapBuildingInfoPanelRuntimeOptions({
      hasBuildingInfo: true,
      isBuildingInfoCollapsed: true,
      isMobileLayout: false,
      desktopContentWidthPx: 1440,
    })
    const mobileOptions = getEnergymapBuildingInfoPanelRuntimeOptions({
      hasBuildingInfo: true,
      isBuildingInfoCollapsed: true,
      isMobileLayout: true,
      desktopContentWidthPx: 1440,
    })
    const emptyOptions = getEnergymapBuildingInfoPanelRuntimeOptions({
      hasBuildingInfo: false,
      isBuildingInfoCollapsed: false,
      isMobileLayout: false,
      desktopContentWidthPx: 760,
    })

    expect(desktopOptions).toMatchObject({
      width: 'compact',
      chrome: 'visible',
      panelLayout: 'single',
      visiblePanels: [],
      replaceBaseSidebar: false,
      activePanel: 'main',
      actionRailPlacement: 'sidebarEdgeActionColumn',
    })
    expect(mobileOptions).toMatchObject({
      width: 'compact',
      chrome: 'visible',
      panelLayout: 'single',
      visiblePanels: [],
      replaceBaseSidebar: false,
      activePanel: 'main',
      actionRailPlacement: 'bottomActionRow',
    })
    expect(emptyOptions.visiblePanels).toEqual([])
    expect(emptyOptions.replaceBaseSidebar).toBe(false)
  })

  it('exports building-info desktop minimum widths for page fit checks', () => {
    expect(getEnergymapBuildingInfoDesktopMinWidthPx(760, true)).toBe(
      ENERGYMAP_BUILDING_INFO_BASIC_DESKTOP_MIN_WIDTH_PX
    )
    expect(getEnergymapBuildingInfoDesktopMinWidthPx(1440, true)).toBe(
      ENERGYMAP_BUILDING_INFO_RENOVATION_DESKTOP_MIN_WIDTH_PX
    )
  })
})
