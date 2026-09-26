import React from 'react'
import '@testing-library/jest-dom'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { MapGeoJSONFeature } from 'maplibre-gl'

import { useUIStore } from '#/common/store/uiStore'
import SquishedSwitchWithLabel from '#/components/common/SquishedSwitchWithLabel'
import { AppThemeProvider } from '#/common/style/theme'
import { SlotsProvider } from '#/components/context/slotsContext'
import { SidebarBoundary, SidebarRoot } from '#/components/Sidebar'
import type {
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoPanelId,
} from '../common/buildingInfo'
import {
  ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS,
  ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
} from '../common/buildingInfoProvenance'
import {
  ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY,
  ENERGYMAP_BUILDING_KEY_PROPERTY,
  ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
  ENERGYMAP_BUILDING_TYPE_PROPERTY,
  ENERGYMAP_SHARED_BUILDING_LAYER_IDS,
} from '../layers/buildingPolygonsLayerConf'
import { ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER } from '../layers/buildingSource'
import {
  ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
  ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS,
} from '../layers/energyCertificateLayerConf'
import {
  ENERGYMAP_HEATING_FILL_LAYER_ID,
  ENERGYMAP_HEATING_LAYER_IDS,
} from '../layers/heatingLayerConf'
import {
  ENERGYMAP_VENTILATION_CATEGORY_PROPERTY,
  ENERGYMAP_VENTILATION_CATEGORY_VALUES,
} from '../common/ventilation'
import {
  ENERGYMAP_VENTILATION_FILL_LAYER_ID,
  ENERGYMAP_VENTILATION_FILL_OPACITY,
  ENERGYMAP_VENTILATION_LAYER_IDS,
  ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
  ENERGYMAP_VENTILATION_OUTLINE_OPACITY,
  VENTILATION_CATEGORY_COLORS,
} from '../layers/ventilationLayerConf'
import { useAppletStore } from '../state/appletStore'
import EnergyHomePage from './EnergyHomePage'

const mockMissingLabelsByBuildingKey = new Map<string, string>()
const mockBuildingInfoPanelsByBuildingKey = new Map<
  string,
  EnergymapBuildingInfoPanel[]
>()
const mockBuildingInfoPanelFactoryKeys: Array<string | null> = []
const mockBuildingInfoPanelFactoryLocales: string[] = []
let mockIsMobile = false
let mockDesktopWidthMatches = true
let mockTranslationLocale: string | undefined
let mockVisibleLayerGroupIds = [ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID]

const createRegisteredSharedBuildingLayerGroup = () => ({
  [ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID]: {
    layers: Object.fromEntries(
      ENERGYMAP_SHARED_BUILDING_LAYER_IDS.map((layerId) => [layerId, {}])
    ),
  },
})

const mockMapState = {
  setFilter: jest.fn(async () => undefined),
  setLayoutProperty: jest.fn(async () => undefined),
  setPaintProperty: jest.fn(async () => undefined),
  enableLayerGroup: jest.fn(async () => undefined),
  setSelectedFeatures: jest.fn(),
  selectedFeatures: [] as MapGeoJSONFeature[],
  _layerGroups: createRegisteredSharedBuildingLayerGroup(),
}

jest.mock('#/components/common/SquishedSwitchWithLabel', () => {
  const actual = jest.requireActual(
    '#/components/common/SquishedSwitchWithLabel'
  )
  return { __esModule: true, ...actual, default: jest.fn(actual.default) }
})

jest.mock('#/common/store', () => ({
  useMapStore: (selector: (state: typeof mockMapState) => unknown) =>
    selector(mockMapState),
  useUIStore: jest.requireActual('#/common/store/uiStore').useUIStore,
}))

jest.mock('#/common/hooks/map/useVisibleLayerGroupIds', () => ({
  useVisibleLayerGroupIds: () => mockVisibleLayerGroupIds,
}))

jest.mock('#/common/hooks/ui/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

jest.mock('../common/buildingInfo', () => ({
  ...jest.requireActual('../common/buildingInfo'),
  createEnergymapBuildingInfoPresentation: ({
    selectedBuilding,
    locale,
  }: {
    selectedBuilding: { buildingKey: string } | null
    locale: string
  }) => {
    const buildingKey = selectedBuilding?.buildingKey ?? null

    mockBuildingInfoPanelFactoryKeys.push(buildingKey)
    mockBuildingInfoPanelFactoryLocales.push(locale)
    return {
      panels:
        buildingKey == null
          ? null
          : (mockBuildingInfoPanelsByBuildingKey.get(buildingKey) ?? []),
      missingData:
        buildingKey == null
          ? null
          : {
              locale,
              items: [
                {
                  reason: { type: 'plain', text: 'Missing test source' },
                  evidence: {
                    source: 'ryhtiBuildingData',
                    field: 'testMissingField',
                    kind: 'legacy-cause-unestablished',
                    code: 'legacy',
                    evidence: 'published-field',
                  },
                  id: 'buildingDetails.testMissingField',
                  panelId: 'buildingDetails',
                  label: {
                    type: 'plain',
                    text:
                      mockMissingLabelsByBuildingKey.get(buildingKey) ??
                      'Missing field',
                  },
                },
              ],
            },
    }
  },
}))

jest.mock('#/common/navigation/navigation', () => ({
  useAppParams: () => ({ locale: 'fi' }),
}))

jest.mock('@tolgee/react', () => {
  const ReactRuntime = jest.requireActual<typeof import('react')>('react')

  return {
    T: ({ keyName, language }: { keyName: string; language?: string }) => {
      const translationLocale = language ?? mockTranslationLocale

      return ReactRuntime.createElement(
        'span',
        null,
        translationLocale == null ? keyName : `${translationLocale}:${keyName}`
      )
    },
    useTranslate: () => ({
      t: (keyName: string) =>
        mockTranslationLocale == null
          ? keyName
          : `${mockTranslationLocale}:${keyName}`,
    }),
  }
})

jest.mock('overlayscrollbars-react', () => ({
  OverlayScrollbarsComponent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

const resetUIStore = () => {
  useUIStore.setState({
    sidebarBoundaries: {},
    _sidebarBoundaryRegistrationOrder: 0,
    sidebarPanelExtensions: {},
    _sidebarPanelExtensionRegistrationOrder: 0,
    isSidebarOpen: true,
    sidebarWidth: undefined,
  })
}

const createPageElement = (locale = 'fi') => (
  <AppThemeProvider disableCssBaseline>
    <SlotsProvider>
      <SidebarRoot>
        <SidebarBoundary id="energy-home-test" mode="floating">
          <EnergyHomePage locale={locale} />
        </SidebarBoundary>
      </SidebarRoot>
    </SlotsProvider>
  </AppThemeProvider>
)

const renderPage = () => render(createPageElement())

const createMapBuildingFeature = (buildingKey: string): MapGeoJSONFeature =>
  ({
    id: buildingKey,
    source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
    sourceLayer: ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
    layer: { id: ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID },
    properties: { building_key: buildingKey },
  }) as MapGeoJSONFeature

const createPanel = (
  id: EnergymapBuildingInfoPanelId
): EnergymapBuildingInfoPanel => ({
  id,
  title: { type: 'plain', text: `${id} title` },
  sections: [
    {
      id:
        id === 'energyConsumption'
          ? 'actualConsumption'
          : id === 'renovationRecommendations'
            ? 'certificateRecommendations'
            : 'buildingDetails',
      rows: [
        {
          id: `${id}Value`,
          label: { type: 'plain', text: `${id} label` },
          text: { type: 'plain', text: `${id} value` },
          status: 'real',
        },
      ],
    },
  ],
})

const createEnergyClassPanel = ({
  classValue,
  origin,
}: {
  classValue: string
  origin: 'modeled' | 'official' | 'originUnknown'
}): EnergymapBuildingInfoPanel => ({
  id: 'buildingDetails',
  title: { type: 'plain', text: 'Building details' },
  sections: [
    {
      id: 'energyCertificate',
      variant: 'energyCertificate',
      rows: [
        {
          id: 'energyClass',
          label: { type: 'plain', text: 'Energy class' },
          text: { type: 'plain', text: classValue },
          status: 'real',
          sourceProperties:
            origin === 'originUnknown'
              ? ['energy_class']
              : ['energy_class', 'is_energy_class_modeled'],
          provenance:
            origin === 'modeled'
              ? {
                  id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
                  inputIds:
                    ENERGYMAP_MODELED_CLASS_REQUIRED_PROVENANCE_INPUT_IDS,
                }
              : origin === 'official'
                ? {
                    id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_OFFICIAL,
                    inputIds: [
                      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CURRENT_CLASS,
                      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_OFFICIAL,
                    ],
                  }
                : {
                    id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
                    inputIds: [
                      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SELECTED_BUILDING_CURRENT_CLASS,
                    ],
                  },
          ...(origin === 'modeled'
            ? {
                modeledIndicator: {
                  label: {
                    type: 'translation' as const,
                    keyName:
                      'sidebar.building_info.panels.building.energy_class_modeled.label',
                  },
                  tooltip: {
                    type: 'translation' as const,
                    keyName:
                      'sidebar.building_info.panels.building.energy_class_modeled.tooltip',
                  },
                  ariaLabelKey:
                    'sidebar.building_info.panels.building.energy_class_modeled.help_aria_label',
                  sourceProperties: ['is_energy_class_modeled'],
                  provenance: {
                    id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
                    inputIds: [
                      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_MODELED,
                    ],
                  },
                },
              }
            : {}),
        },
      ],
    },
  ],
})

const completePanels = [
  createPanel('energyConsumption'),
  createPanel('renovationRecommendations'),
  createPanel('buildingDetails'),
]

const selectBuilding = ({
  buildingKey,
  panels,
}: {
  buildingKey: string
  panels: EnergymapBuildingInfoPanel[]
}) => {
  mockBuildingInfoPanelsByBuildingKey.set(buildingKey, panels)
  mockMissingLabelsByBuildingKey.set(
    buildingKey,
    `${buildingKey} missing field`
  )
  mockMapState.selectedFeatures = [createMapBuildingFeature(buildingKey)]
}

describe('EnergyHomePage', () => {
  const originalMatchMedia = window.matchMedia

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: mockDesktopWidthMatches,
        media: '',
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  afterAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    resetUIStore()
    mockBuildingInfoPanelsByBuildingKey.clear()
    mockMissingLabelsByBuildingKey.clear()
    mockBuildingInfoPanelFactoryKeys.length = 0
    mockBuildingInfoPanelFactoryLocales.length = 0
    mockMapState.selectedFeatures = []
    mockIsMobile = false
    mockDesktopWidthMatches = true
    mockTranslationLocale = undefined
    mockVisibleLayerGroupIds = [ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID]
    mockMapState._layerGroups = createRegisteredSharedBuildingLayerGroup()
    useAppletStore.getState().resetBuildingFilters()
    useAppletStore.getState().resetEnergyCertificateClassFilters()
    useAppletStore.getState().clearSelectedBuilding()
  })

  it.each([
    ['desktop', false],
    ['mobile', true],
  ])(
    'keeps the surrounding controls unchanged while activating ventilation on %s',
    (_viewport, isMobile) => {
      mockIsMobile = isMobile
      renderPage()

      expect(
        screen.queryByText('sidebar.front_page.layers.other_energy_sources')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', {
          name: 'sidebar.front_page.aria.other_energy_sources_upcoming',
        })
      ).not.toBeInTheDocument()

      expect(
        screen.getByRole('button', {
          name: 'sidebar.front_page.aria.toggle_energy_classes',
        })
      ).toBeInTheDocument()
      const heatingButton = screen.getByRole('button', {
        name: 'sidebar.front_page.aria.toggle_heating',
      })
      expect(heatingButton).toBeInTheDocument()
      const ventilationButton = screen.getByRole('button', {
        name: 'sidebar.front_page.aria.toggle_ventilation',
      })
      expect(ventilationButton).toHaveAttribute('aria-expanded', 'false')

      fireEvent.click(heatingButton)

      expect(
        screen.getByRole('switch', {
          name: 'sidebar.front_page.heating.legend.solar',
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('switch', {
          name: 'sidebar.front_page.heating.legend.other',
        })
      ).toBeInTheDocument()
    }
  )

  it('widens all three accordion rows and keeps the expanded highlight aligned', () => {
    renderPage()

    const energyClassesButton = screen.getByRole('button', {
      name: 'sidebar.front_page.aria.toggle_energy_classes',
    })
    const heatingButton = screen.getByRole('button', {
      name: 'sidebar.front_page.aria.toggle_heating',
    })
    const ventilationButton = screen.getByRole('button', {
      name: 'sidebar.front_page.aria.toggle_ventilation',
    })
    const thematicButtons = [
      energyClassesButton,
      heatingButton,
      ventilationButton,
    ]

    thematicButtons.forEach((button) => {
      expect(button).toHaveStyle({
        width: 'calc(100% + 0.75rem)',
        marginLeft: '-0.375rem',
        marginRight: '-0.375rem',
      })
      expect(
        button.querySelector('[data-slot="layer-status-icon-slot"]')
      ).toHaveStyle({ justifyContent: 'flex-start' })
    })

    expect(energyClassesButton).not.toHaveStyle({
      backgroundColor: '#e6efff',
    })

    fireEvent.click(energyClassesButton)

    expect(energyClassesButton).toHaveAttribute('aria-expanded', 'true')
    expect(energyClassesButton).toHaveStyle({
      width: 'calc(100% + 0.75rem)',
      marginLeft: '-0.375rem',
      marginRight: '-0.375rem',
      backgroundColor: '#e6efff',
    })
  })

  it('exposes four localized, initially checked ventilation switches', () => {
    renderPage()

    const ventilationButton = screen.getByRole('button', {
      name: 'sidebar.front_page.aria.toggle_ventilation',
    })

    expect(ventilationButton.tagName).toBe('BUTTON')
    expect(ventilationButton).toHaveAttribute('aria-expanded', 'false')
    expect(ventilationButton).toHaveAttribute('aria-controls')

    fireEvent.click(ventilationButton)

    expect(ventilationButton).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText('sidebar.front_page.ventilation.body')
    ).toBeInTheDocument()

    const switches = ENERGYMAP_VENTILATION_CATEGORY_VALUES.map((category) =>
      screen.getByRole('switch', {
        name: `sidebar.front_page.ventilation.legend.${category}`,
      })
    )

    expect(switches).toHaveLength(4)
    switches.forEach((ventilationSwitch, index) => {
      expect(ventilationSwitch).toBeChecked()
      expect(SquishedSwitchWithLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          ariaLabel: `sidebar.front_page.ventilation.legend.${ENERGYMAP_VENTILATION_CATEGORY_VALUES[index]}`,
          checked: true,
          checkedTrackColor:
            VENTILATION_CATEGORY_COLORS[
              ENERGYMAP_VENTILATION_CATEGORY_VALUES[index]
            ],
        }),
        undefined
      )
    })
  })

  it.each(ENERGYMAP_VENTILATION_CATEGORY_VALUES)(
    'toggles only %s and restores its checked state',
    (category) => {
      renderPage()
      fireEvent.click(
        screen.getByRole('button', {
          name: 'sidebar.front_page.aria.toggle_ventilation',
        })
      )
      const control = screen.getByRole('switch', {
        name: `sidebar.front_page.ventilation.legend.${category}`,
      })

      fireEvent.click(control)
      for (const id of ENERGYMAP_VENTILATION_CATEGORY_VALUES) {
        expect(
          screen.getByRole('switch', {
            name: `sidebar.front_page.ventilation.legend.${id}`,
          })
        ).toHaveProperty('checked', id !== category)
      }

      fireEvent.click(control)
      expect(control).toBeChecked()
    }
  )

  it('filters ventilation strictly for subsets and for no active options', async () => {
    renderPage()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.front_page.aria.toggle_ventilation',
      })
    )

    fireEvent.click(
      screen.getByRole('switch', {
        name: 'sidebar.front_page.ventilation.legend.gravity',
      })
    )

    const subsetFilter = [
      'all',
      ['has', ENERGYMAP_BUILDING_KEY_PROPERTY],
      [
        'in',
        ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
        ['literal', ['mechanical', 'other', 'no_info']],
      ],
    ]

    await waitFor(() => {
      for (const layerId of ENERGYMAP_VENTILATION_LAYER_IDS) {
        expect(mockMapState.setFilter).toHaveBeenCalledWith(
          layerId,
          subsetFilter
        )
      }
    })

    for (const category of ['mechanical', 'other', 'no_info'] as const) {
      fireEvent.click(
        screen.getByRole('switch', {
          name: `sidebar.front_page.ventilation.legend.${category}`,
        })
      )
    }

    const noneFilter = [
      'all',
      ['has', ENERGYMAP_BUILDING_KEY_PROPERTY],
      [
        '==',
        ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
        '__avoin_no_matching_ventilation_category__',
      ],
    ]

    await waitFor(() => {
      for (const layerId of ENERGYMAP_VENTILATION_LAYER_IDS) {
        expect(mockMapState.setFilter).toHaveBeenCalledWith(layerId, noneFilter)
      }
    })

    ENERGYMAP_VENTILATION_CATEGORY_VALUES.forEach((category) => {
      expect(
        screen.getByRole('switch', {
          name: `sidebar.front_page.ventilation.legend.${category}`,
        })
      ).not.toBeChecked()
    })
    expect(
      mockMapState.setFilter.mock.calls.some(
        ([layerId, filter]) =>
          String(layerId).startsWith(
            `${ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID}-`
          ) &&
          JSON.stringify(filter).includes(
            ENERGYMAP_VENTILATION_CATEGORY_PROPERTY
          )
      )
    ).toBe(false)
  })

  it('composes ventilation categories with building type and decade filters', async () => {
    useAppletStore.getState().setBuildingTypeFilter('05')
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowOnlySelectedDecade(true)
    renderPage()

    const completionYearExpression = [
      'to-number',
      [
        'slice',
        ['to-string', ['get', ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY]],
        0,
        4,
      ],
      -1,
    ]
    const expectedFilter = [
      'all',
      [
        'all',
        ['==', ['get', ENERGYMAP_BUILDING_TYPE_PROPERTY], '05'],
        [
          'all',
          ['>=', completionYearExpression, 1970],
          ['<', completionYearExpression, 1980],
        ],
      ],
      [
        'in',
        ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
        ['literal', ENERGYMAP_VENTILATION_CATEGORY_VALUES],
      ],
    ]

    await waitFor(() => {
      for (const layerId of ENERGYMAP_VENTILATION_LAYER_IDS) {
        expect(mockMapState.setFilter).toHaveBeenCalledWith(
          layerId,
          expectedFilter
        )
      }
    })
  })

  it('keeps ventilation exclusive and returns to neutral shared buildings when toggled off', async () => {
    renderPage()
    mockMapState.setLayoutProperty.mockClear()
    mockMapState.setPaintProperty.mockClear()

    const ventilationButton = screen.getByRole('button', {
      name: 'sidebar.front_page.aria.toggle_ventilation',
    })
    fireEvent.click(ventilationButton)

    await waitFor(() => {
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'visibility',
        'visible'
      )
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
        'visibility',
        'none'
      )
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_HEATING_FILL_LAYER_ID,
        'visibility',
        'none'
      )
      expect(mockMapState.setPaintProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'fill-opacity',
        ENERGYMAP_VENTILATION_FILL_OPACITY
      )
      expect(mockMapState.setPaintProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
        'line-opacity',
        ENERGYMAP_VENTILATION_OUTLINE_OPACITY
      )
      expect(mockMapState.setPaintProperty).toHaveBeenCalledWith(
        ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
        'fill-opacity',
        0
      )
      expect(mockMapState.setPaintProperty).toHaveBeenCalledWith(
        ENERGYMAP_HEATING_FILL_LAYER_ID,
        'fill-opacity',
        0
      )
    })

    mockMapState.setLayoutProperty.mockClear()
    mockMapState.setPaintProperty.mockClear()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.front_page.aria.toggle_heating',
      })
    )

    await waitFor(() => {
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_HEATING_FILL_LAYER_ID,
        'visibility',
        'visible'
      )
      for (const layerId of ENERGYMAP_VENTILATION_LAYER_IDS) {
        expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
          layerId,
          'visibility',
          'none'
        )
      }
      expect(mockMapState.setPaintProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'fill-opacity',
        0
      )
    })

    mockMapState.setLayoutProperty.mockClear()
    fireEvent.click(ventilationButton)
    await waitFor(() => {
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'visibility',
        'visible'
      )
      for (const layerId of ENERGYMAP_HEATING_LAYER_IDS) {
        expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
          layerId,
          'visibility',
          'none'
        )
      }
    })

    mockMapState.setLayoutProperty.mockClear()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.front_page.aria.toggle_energy_classes',
      })
    )
    await waitFor(() => {
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
        'visibility',
        'visible'
      )
      for (const layerId of ENERGYMAP_VENTILATION_LAYER_IDS) {
        expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
          layerId,
          'visibility',
          'none'
        )
      }
    })
    mockMapState.setLayoutProperty.mockClear()
    fireEvent.click(ventilationButton)
    await waitFor(() => {
      expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'visibility',
        'visible'
      )
      for (const layerId of ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS) {
        expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
          layerId,
          'visibility',
          'none'
        )
      }
    })

    mockMapState.setLayoutProperty.mockClear()
    mockMapState.setPaintProperty.mockClear()
    fireEvent.click(ventilationButton)

    await waitFor(() => {
      for (const layerId of [
        ...ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS,
        ...ENERGYMAP_HEATING_LAYER_IDS,
        ...ENERGYMAP_VENTILATION_LAYER_IDS,
      ]) {
        expect(mockMapState.setLayoutProperty).toHaveBeenCalledWith(
          layerId,
          'visibility',
          'none'
        )
      }
      expect(mockMapState.setPaintProperty).toHaveBeenCalledWith(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'fill-opacity',
        0
      )
    })

    expect(mockMapState.enableLayerGroup).not.toHaveBeenCalled()
    expect(
      mockMapState.setLayoutProperty.mock.calls.some(([layerId]) =>
        String(layerId).startsWith(
          `${ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID}-`
        )
      )
    ).toBe(false)
  })

  it('enables only the shared building group when ventilation opens from a hidden group', async () => {
    mockVisibleLayerGroupIds = []
    renderPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.front_page.aria.toggle_ventilation',
      })
    )

    await waitFor(() => {
      expect(mockMapState.enableLayerGroup).toHaveBeenCalledWith(
        ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID,
        expect.objectContaining({ isHidden: false })
      )
    })
    expect(mockMapState.enableLayerGroup).toHaveBeenCalledTimes(1)
  })

  it('registers the extension from filtered content and replaces it with sparse and empty topologies', async () => {
    selectBuilding({ buildingKey: 'complete', panels: completePanels })
    const view = renderPage()

    await screen.findByTestId('building-info-tab-page-basic')
    await waitFor(() => {
      expect(
        useUIStore.getState().sidebarPanelExtensions[
          'energiakartta-building-info-panel'
        ]?.runtimeOptions
      ).toMatchObject({
        desktopMainPanelWidth: '760px',
        layoutMode: 'default',
        visiblePanels: ['main'],
      })
    })
    expect(screen.getByRole('tablist')).toBeInTheDocument()

    selectBuilding({
      buildingKey: 'sparse',
      panels: [createPanel('buildingDetails')],
    })
    view.rerender(createPageElement())

    await waitFor(() => {
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.getByTestId('building-info-grid')).toHaveAttribute(
        'data-building-info-content-width',
        '380'
      )
      expect(
        screen.queryByText('renovationRecommendations value')
      ).not.toBeInTheDocument()
      expect(
        useUIStore.getState().sidebarPanelExtensions[
          'energiakartta-building-info-panel'
        ]?.runtimeOptions
      ).toMatchObject({ desktopMainPanelWidth: '380px' })
    })

    selectBuilding({ buildingKey: 'empty', panels: [] })
    view.rerender(createPageElement())

    await waitFor(() => {
      expect(
        useUIStore.getState().sidebarPanelExtensions[
          'energiakartta-building-info-panel'
        ]
      ).toBeUndefined()
    })
    expect(
      screen.queryByTestId('building-info-tab-page-basic')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-action-rail')
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'sidebar.front_page.footer.edit_building_details',
      })
    ).toHaveAttribute('data-mobile-building-info-action-count', '0')
  })

  it('never renders the previous building topology or collapsed state for a new map selection', async () => {
    selectBuilding({ buildingKey: 'building-a', panels: completePanels })
    const view = renderPage()

    await screen.findByTestId('building-info-tab-page-basic')
    fireEvent.click(
      screen.getByRole('tab', {
        name: 'sidebar.building_info.aria.open_renovation',
      })
    )
    await screen.findByTestId('building-info-tab-page-renovation')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.building_info.aria.collapse',
      })
    )
    await screen.findByTestId('building-info-action-rail')

    mockBuildingInfoPanelFactoryKeys.length = 0
    selectBuilding({
      buildingKey: 'building-b',
      panels: [createPanel('buildingDetails')],
    })
    view.rerender(
      <AppThemeProvider disableCssBaseline>
        <SlotsProvider>
          <SidebarRoot>
            <SidebarBoundary id="energy-home-test" mode="floating">
              <EnergyHomePage locale="fi" />
            </SidebarBoundary>
          </SidebarRoot>
        </SlotsProvider>
      </AppThemeProvider>
    )

    expect(mockBuildingInfoPanelFactoryKeys).not.toContain('building-a')
    expect(mockBuildingInfoPanelFactoryKeys).toContain('building-b')
    expect(
      screen.queryByTestId('building-info-action-rail')
    ).not.toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-tab-page-basic')
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getByText('buildingDetails value')).toBeInTheDocument()
    expect(
      screen.queryByText('renovationRecommendations value')
    ).not.toBeInTheDocument()

    mockBuildingInfoPanelFactoryKeys.length = 0
    mockMapState.selectedFeatures = []
    view.rerender(
      <AppThemeProvider disableCssBaseline>
        <SlotsProvider>
          <SidebarRoot>
            <SidebarBoundary id="energy-home-test" mode="floating">
              <EnergyHomePage locale="fi" />
            </SidebarBoundary>
          </SidebarRoot>
        </SlotsProvider>
      </AppThemeProvider>
    )

    expect(mockBuildingInfoPanelFactoryKeys).not.toContain('building-b')
    expect(mockBuildingInfoPanelFactoryKeys).toContain(null)
    expect(
      screen.queryByTestId('building-info-tab-page-basic')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('building-info-action-rail')
    ).not.toBeInTheDocument()
  })

  it('does not retain modeled energy-class label help across official and origin-unknown selections', async () => {
    const helpName =
      'sidebar.building_info.panels.building.energy_class_modeled.help_aria_label'
    const modeledLabel =
      'sidebar.building_info.panels.building.energy_class_modeled.label'
    const getEnergyClassCells = () => {
      const row = document.querySelector(
        '[data-section-row-id="energyClass"]'
      ) as HTMLElement
      const [labelCell, valueCell] = Array.from(row.children) as HTMLElement[]

      return { labelCell, valueCell }
    }

    selectBuilding({
      buildingKey: 'modeled',
      panels: [createEnergyClassPanel({ classValue: 'C', origin: 'modeled' })],
    })
    const view = renderPage()

    await screen.findByTestId('building-info-modeled-energy-class-indicator')
    const { labelCell, valueCell } = getEnergyClassCells()

    expect(labelCell).toHaveTextContent(`Energy class (${modeledLabel})`)
    expect(
      within(labelCell).getByRole('button', { name: helpName })
    ).toBeInTheDocument()
    expect(within(valueCell).getByText('C')).toBeInTheDocument()
    expect(valueCell).not.toHaveTextContent(modeledLabel)

    selectBuilding({
      buildingKey: 'official',
      panels: [createEnergyClassPanel({ classValue: 'B', origin: 'official' })],
    })
    view.rerender(createPageElement())

    await waitFor(() => {
      expect(
        screen.queryByTestId('building-info-modeled-energy-class-indicator')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: helpName })
      ).not.toBeInTheDocument()
      expect(getEnergyClassCells().labelCell).toHaveTextContent(
        /^Energy class$/
      )
      expect(
        within(getEnergyClassCells().valueCell).getByText('B')
      ).toBeInTheDocument()
    })

    selectBuilding({
      buildingKey: 'origin-unknown',
      panels: [
        createEnergyClassPanel({
          classValue: 'A',
          origin: 'originUnknown',
        }),
      ],
    })
    view.rerender(createPageElement())

    await waitFor(() => {
      expect(
        screen.queryByTestId('building-info-modeled-energy-class-indicator')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: helpName })
      ).not.toBeInTheDocument()
      expect(getEnergyClassCells().labelCell).toHaveTextContent(
        /^Energy class$/
      )
      expect(
        within(getEnergyClassCells().valueCell).getByText('A')
      ).toBeInTheDocument()
    })
  })

  it('uses current ventilation facts across A → B → cleared selections and same-key updates', async () => {
    const factory = jest.requireActual<typeof import('../common/buildingInfo')>(
      '../common/buildingInfo'
    ).createEnergymapBuildingInfoPanels
    const select = (
      buildingKey: string,
      properties: Record<string, unknown>
    ) => {
      const feature = createMapBuildingFeature(buildingKey)
      feature.properties = {
        building_key: buildingKey,
        permanent_building_identifier: buildingKey,
        ...properties,
      }
      const panels = factory({
        selectedBuilding: {
          id: buildingKey,
          buildingKey,
          properties: feature.properties,
          source: 'energymap_building_polygons',
          sourceLayer: 'energymap_building_polygons',
          layerId: 'energymap_building_polygons-fill',
        },
        locale: 'fi',
      })!
      mockBuildingInfoPanelsByBuildingKey.set(buildingKey, panels)
      mockMapState.selectedFeatures = [feature]
    }
    select('A', {
      energy_certificate_ventilation_type_id: '0',
      energy_certificate_ventilation_type_label_fi: 'Label A',
      energy_certificate_ventilation_description_sv: 'Description A',
      ventilation_category: 'gravity',
    })
    const view = renderPage()
    expect(await screen.findByText('Label A')).toBeVisible()
    fireEvent.click(screen.getByTestId('building-info-provenance-trigger'), {
      detail: 0,
    })
    await waitFor(() =>
      expect(
        screen.getByTestId('building-info-provenance-heading')
      ).toHaveFocus()
    )

    select('A', {
      energy_certificate_ventilation_type_label_sv: 'Updated label A',
      energy_certificate_ventilation_description_fi: 'Updated description A',
      ventilation_category: 'no_info',
    })
    view.rerender(createPageElement())
    await waitFor(() =>
      expect(screen.queryByText('Label A')).not.toBeInTheDocument()
    )
    expect(
      screen.getByText('Updated label A').closest('[lang]')
    ).toHaveAttribute('lang', 'sv')
    expect(
      screen.getByText('Updated description A').closest('[lang]')
    ).toHaveAttribute('lang', 'fi')
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toHaveTextContent(
      'sidebar.building_info.provenance.inputs.certificate_ventilation_code'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toHaveTextContent(
      'sidebar.building_info.provenance.fields.ventilation_category'
    )

    select('B', {
      energy_certificate_ventilation_description_fi: 'Description B',
    })
    view.rerender(createPageElement())
    expect(await screen.findByText('Description B')).toBeVisible()
    expect(screen.queryByText('Updated label A')).not.toBeInTheDocument()
    expect(
      screen.getByTestId('building-info-provenance-trigger')
    ).toHaveAttribute('aria-expanded', 'false')
    mockMapState.selectedFeatures = []
    view.rerender(createPageElement())
    await waitFor(() =>
      expect(screen.queryByText('Description B')).not.toBeInTheDocument()
    )
    expect(
      screen.queryByTestId('building-info-provenance-trigger')
    ).not.toBeInTheDocument()
  })

  it('resets an open provenance view and its relationships for a new or cleared building', async () => {
    selectBuilding({
      buildingKey: 'official-provenance',
      panels: [createEnergyClassPanel({ classValue: 'B', origin: 'official' })],
    })
    const view = renderPage()

    const initialTrigger = await screen.findByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    const initialRegionId = initialTrigger.getAttribute('aria-controls')
    fireEvent.click(initialTrigger)

    await waitFor(() => {
      expect(screen.getByTestId('building-info-provenance-view')).toBeVisible()
    })
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent('official-provenance missing field')

    selectBuilding({
      buildingKey: 'unknown-provenance',
      panels: [
        createEnergyClassPanel({
          classValue: 'A',
          origin: 'originUnknown',
        }),
      ],
    })
    view.rerender(createPageElement())

    const nextTrigger = await screen.findByRole('button', {
      name: 'sidebar.building_info.provenance.view.open',
    })
    expect(nextTrigger).toHaveAttribute('aria-expanded', 'false')
    expect(nextTrigger.getAttribute('aria-controls')).not.toBe(initialRegionId)
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toBeVisible()
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent('unknown-provenance missing field')
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toHaveTextContent('official-provenance missing field')

    fireEvent.click(nextTrigger)
    await waitFor(() => {
      expect(screen.getByTestId('building-info-provenance-view')).toBeVisible()
    })

    mockMapState.selectedFeatures = []
    view.rerender(createPageElement())

    await waitFor(() => {
      expect(
        screen.queryByTestId('building-info-provenance-trigger')
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId('building-info-provenance-view')
      ).not.toBeInTheDocument()
    })
  })

  it('updates an open same-building provenance view atomically with locale', async () => {
    mockTranslationLocale = 'fi'
    selectBuilding({
      buildingKey: 'locale-provenance',
      panels: [createEnergyClassPanel({ classValue: 'B', origin: 'official' })],
    })
    const view = renderPage()
    const trigger = await screen.findByRole('button', {
      name: 'fi:sidebar.building_info.provenance.view.open',
    })
    const regionId = trigger.getAttribute('aria-controls')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(
        screen.getByTestId('building-info-provenance-view')
      ).toHaveAttribute('data-missing-data-locale', 'fi')
    })
    expect(
      screen.getByTestId('building-info-provenance-heading')
    ).toHaveTextContent('fi:sidebar.building_info.provenance.view.heading')

    mockTranslationLocale = 'en'
    view.rerender(createPageElement('en'))

    const englishTrigger = screen.getByTestId(
      'building-info-provenance-trigger'
    )
    expect(englishTrigger).toHaveAttribute(
      'aria-label',
      'en:sidebar.building_info.provenance.view.open'
    )
    expect(englishTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(englishTrigger).toHaveAttribute('aria-controls', regionId)
    expect(screen.getByTestId('building-info-provenance-view')).toHaveAttribute(
      'id',
      regionId
    )
    expect(screen.getByTestId('building-info-provenance-view')).toHaveAttribute(
      'data-missing-data-locale',
      'en'
    )
    expect(
      screen.getByTestId('building-info-provenance-heading')
    ).toHaveTextContent('en:sidebar.building_info.provenance.view.heading')
    expect(
      screen.getByTestId('building-info-provenance-heading')
    ).not.toHaveTextContent('fi:sidebar.building_info.provenance.view.heading')
    expect(mockBuildingInfoPanelFactoryLocales).toEqual(
      expect.arrayContaining(['fi', 'en'])
    )
  })

  it('replaces a sparse active tab with the complete building default topology', async () => {
    selectBuilding({
      buildingKey: 'sparse',
      panels: [
        createPanel('energyConsumption'),
        createPanel('renovationRecommendations'),
      ],
    })
    const view = renderPage()

    await screen.findByTestId('building-info-tab-page-basic')
    fireEvent.click(
      screen.getByRole('tab', {
        name: 'sidebar.building_info.aria.open_renovation',
      })
    )
    await screen.findByTestId('building-info-tab-page-renovation')
    await waitFor(() => {
      expect(
        useUIStore.getState().sidebarPanelExtensions[
          'energiakartta-building-info-panel'
        ]?.runtimeOptions
      ).toMatchObject({ desktopMainPanelWidth: '1000px' })
    })

    selectBuilding({ buildingKey: 'complete', panels: completePanels })
    view.rerender(
      <AppThemeProvider disableCssBaseline>
        <SlotsProvider>
          <SidebarRoot>
            <SidebarBoundary id="energy-home-test" mode="floating">
              <EnergyHomePage locale="fi" />
            </SidebarBoundary>
          </SidebarRoot>
        </SlotsProvider>
      </AppThemeProvider>
    )

    await screen.findByTestId('building-info-tab-page-basic')
    expect(
      screen.queryByTestId('building-info-tab-page-renovation')
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('tab', {
        name: 'sidebar.building_info.aria.open_overview',
      })
    ).toHaveAttribute('aria-selected', 'true')
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
    await waitFor(() => {
      expect(
        useUIStore.getState().sidebarPanelExtensions[
          'energiakartta-building-info-panel'
        ]?.runtimeOptions
      ).toMatchObject({ desktopMainPanelWidth: '760px' })
    })

    mockIsMobile = true
    view.rerender(
      <AppThemeProvider disableCssBaseline>
        <SlotsProvider>
          <SidebarRoot>
            <SidebarBoundary id="energy-home-test" mode="floating">
              <EnergyHomePage locale="fi" />
            </SidebarBoundary>
          </SidebarRoot>
        </SlotsProvider>
      </AppThemeProvider>
    )

    await screen.findByTestId('building-info-tab-page-basic')
    expect(screen.queryByTestId('building-info-grid')).not.toBeInTheDocument()
    expect(
      screen
        .getAllByTestId(/building-info-panel-/)
        .map((panel) => panel.dataset.panelId)
    ).toEqual(['energyConsumption', 'buildingDetails'])
  })

  it('reserves mobile footer space for the actual collapsed action count', async () => {
    mockIsMobile = true
    selectBuilding({
      buildingKey: 'mobile-sparse',
      panels: [createPanel('buildingDetails')],
    })
    renderPage()

    await screen.findByTestId('building-info-tab-page-basic')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.building_info.aria.collapse',
      })
    )

    await screen.findByTestId('building-info-action-rail')
    expect(
      screen.getByTestId('building-info-action-rail').querySelectorAll('button')
    ).toHaveLength(1)
    expect(
      screen.getByRole('button', {
        name: 'sidebar.front_page.footer.edit_building_details',
      })
    ).toHaveAttribute('data-mobile-building-info-action-count', '1')
  })

  it('uses fullscreen fallback from the active topology width', async () => {
    mockDesktopWidthMatches = false
    selectBuilding({ buildingKey: 'fallback', panels: completePanels })
    renderPage()

    await waitFor(() => {
      expect(
        useUIStore.getState().sidebarPanelExtensions[
          'energiakartta-building-info-panel'
        ]?.runtimeOptions
      ).toMatchObject({
        layoutMode: 'fullscreen',
        replaceBaseSidebar: true,
      })
    })
    expect(
      useUIStore.getState().sidebarPanelExtensions[
        'energiakartta-building-info-panel'
      ]?.runtimeOptions.desktopMainPanelWidth
    ).toBeUndefined()
  })
})
