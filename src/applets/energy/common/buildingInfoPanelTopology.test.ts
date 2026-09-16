import type {
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoSection,
} from './buildingInfo'
import { createEnergymapBuildingInfoPanels } from './buildingInfo'
import {
  deriveEnergymapBuildingInfoPanelTopology,
  resolveEnergymapBuildingInfoMode,
  resolveEnergymapBuildingInfoTab,
} from './buildingInfoPanelTopology'
import type { EnergymapSelectedBuilding } from './types'

const text = (value: string) => ({ type: 'plain' as const, text: value })

const rowSection = (id: string): EnergymapBuildingInfoSection => ({
  id,
  rows: [
    {
      id: `${id}-row`,
      label: text(`${id} label`),
      text: text(`${id} value`),
      status: 'real',
    },
  ],
})

const comparisonSection = (): EnergymapBuildingInfoSection => ({
  id: 'scenarioComparison',
  scenarios: [
    {
      id: 'solar',
      label: text('Solar'),
      values: [
        {
          id: 'annualTotal',
          label: text('Annual total'),
          text: text('100'),
          status: 'estimate',
        },
      ],
    },
  ],
})

const panel = ({
  id,
  sections = [rowSection(`${id}-section`)],
}: {
  id: EnergymapBuildingInfoPanel['id']
  sections?: EnergymapBuildingInfoSection[]
}): EnergymapBuildingInfoPanel => ({
  id,
  title: text(`${id} title`),
  sections,
})

const certificateBuilding = ({
  extraProperties = {},
  reference = false,
}: {
  extraProperties?: EnergymapSelectedBuilding['properties']
  reference?: boolean
} = {}): EnergymapSelectedBuilding => {
  const identifier = 'TOPOLOGY-CERTIFICATE'
  return {
    id: 'topology-certificate',
    buildingKey: 'topology-certificate',
    source: 'energymap_building_polygons',
    sourceLayer: 'energymap_building_polygons',
    layerId: 'energymap_building_polygons-fill',
    properties: {
      permanent_building_identifier: identifier,
      ...(reference
        ? {
            heating_method: '01',
            heating_energy_source: '01',
            floor_area: 100,
            distr_default_total: 100,
            distr_default_heat: 75,
            distr_default_elec: 25,
          }
        : {}),
      ...extraProperties,
      energy_certificate_consumption: JSON.stringify({
        schema_version: 1,
        basis: 'standardized_calculation',
        unit: 'kWh/year',
        certificate_version: 2018,
        certificate_id: 'TOPOLOGY-CERT',
        building_identifier: identifier,
        completeness: 'complete',
        components: [
          { carrier: 'electricity', annual_kwh: 1 },
          { carrier: 'district_heat', annual_kwh: 2 },
          { carrier: 'district_cooling', annual_kwh: 3 },
          { carrier: 'fossil_fuel', annual_kwh: 4 },
          { carrier: 'renewable_fuel', annual_kwh: 5 },
        ],
        total_kwh_year: 15,
      }),
    },
  }
}

describe('deriveEnergymapBuildingInfoPanelTopology', () => {
  it('creates a single basic tab for property-only identity', () => {
    const panels = createEnergymapBuildingInfoPanels({
      selectedBuilding: {
        ...certificateBuilding(),
        properties: { property_identifier: '00000000000001' },
      },
      locale: 'fi',
    })
    const topology = deriveEnergymapBuildingInfoPanelTopology(panels)
    expect(topology.hasTabRail).toBe(false)
    expect(topology.availableTabs).toHaveLength(1)
    expect(topology.availableTabs[0]).toMatchObject({
      id: 'basic',
      panels: [{ id: 'buildingDetails' }],
    })
  })

  it('returns no tabs for absent, empty, or structurally empty panels', () => {
    expect(
      deriveEnergymapBuildingInfoPanelTopology(null).availableTabs
    ).toEqual([])
    expect(deriveEnergymapBuildingInfoPanelTopology([]).availableTabs).toEqual(
      []
    )
    expect(
      deriveEnergymapBuildingInfoPanelTopology([
        panel({ id: 'energyConsumption', sections: [] }),
      ]).availableTabs
    ).toEqual([])
  })

  it.each([
    ['energyConsumption', 380],
    ['buildingDetails', 380],
  ] as const)('creates one basic tab for a lone %s panel', (id, width) => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([panel({ id })])

    expect(topology.hasTabRail).toBe(false)
    expect(topology.availableTabs).toHaveLength(1)
    expect(topology.availableTabs[0]).toMatchObject({
      id: 'basic',
      mode: 'twoPanel',
      desktopContentWidthPx: width,
    })
    expect(topology.availableTabs[0].panels.map((item) => item.id)).toEqual([
      id,
    ])
  })

  it('keeps two present-but-sparse basic panels content-height driven', () => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({ id: 'energyConsumption' }),
      panel({ id: 'buildingDetails' }),
    ])
    const basicTab = topology.availableTabs[0]

    expect(basicTab.desktopContentWidthPx).toBe(760)
    expect(basicTab.desktopRows[0]).toMatchObject({
      id: 'basic',
      contentWidthPx: 760,
    })
    expect(basicTab.desktopRows[0]).not.toHaveProperty('minHeightPx')
  })

  it('preserves every section retained by the normalized panel model', () => {
    const retainedSections: EnergymapBuildingInfoSection[] = [
      rowSection('calculationContext'),
      {
        ...rowSection('futureCertificateSection'),
        variant: 'energyCertificate',
      },
    ]
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({ id: 'energyConsumption', sections: retainedSections }),
    ])
    const basicRow = topology.availableTabs[0].desktopRows[0]

    expect(basicRow.kind).toBe('panels')
    expect(
      basicRow.kind === 'panels' ? basicRow.regions[0].sections : []
    ).toEqual(retainedSections)
    expect(topology.availableTabs[0].panels[0].sections).toEqual(
      retainedSections
    )
  })

  it('creates renovation as the only tab when only recommendation content remains', () => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({
        id: 'renovationRecommendations',
        sections: [rowSection('publishedRecommendations')],
      }),
    ])

    expect(topology.hasTabRail).toBe(false)
    expect(topology.availableTabs).toHaveLength(1)
    expect(topology.availableTabs[0]).toMatchObject({
      id: 'renovation',
      mode: 'threePanel',
      desktopContentWidthPx: 560,
    })
    expect(topology.availableTabs[0].desktopRows).toHaveLength(1)
  })

  it('omits the renovation comparison row when only published recommendations remain', () => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({ id: 'energyConsumption' }),
      panel({
        id: 'renovationRecommendations',
        sections: [rowSection('publishedRecommendations')],
      }),
    ])
    const renovationTab = topology.availableTabs[1]

    expect(renovationTab.desktopContentWidthPx).toBe(1000)
    expect(renovationTab.desktopRows.map((row) => row.id)).toEqual([
      'renovationTop',
    ])
  })

  it('renders comparison and its companion without an empty top row', () => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({
        id: 'renovationRecommendations',
        sections: [comparisonSection()],
      }),
    ])
    const renovationTab = topology.availableTabs[0]

    expect(renovationTab.desktopContentWidthPx).toBe(1440)
    expect(renovationTab.desktopRows).toHaveLength(1)
    expect(renovationTab.desktopRows[0]).toMatchObject({
      kind: 'comparison',
      id: 'renovationComparison',
      contentWidthPx: 1440,
    })
  })

  it('keeps three present-but-sparse renovation panels content-height driven', () => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({ id: 'buildingDetails' }),
      panel({
        id: 'renovationRecommendations',
        sections: [rowSection('publishedRecommendations'), comparisonSection()],
      }),
      panel({
        id: 'energyConsumption',
        sections: [
          rowSection('estimatedConsumption'),
          {
            ...rowSection('calculationContext'),
            title: text('Calculation context'),
          },
        ],
      }),
    ])
    const renovationTab = topology.availableTabs[1]

    expect(topology.hasTabRail).toBe(true)
    expect(renovationTab.panels.map((item) => item.id)).toEqual([
      'energyConsumption',
      'renovationRecommendations',
      'buildingDetails',
    ])
    expect(renovationTab.desktopContentWidthPx).toBe(1440)
    expect(renovationTab.desktopRows).toMatchObject([
      {
        kind: 'panels',
        id: 'renovationTop',
        contentWidthPx: 1440,
      },
      {
        kind: 'comparison',
        id: 'renovationComparison',
        contentWidthPx: 1440,
      },
    ])
    expect(renovationTab.desktopRows).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ minHeightPx: expect.any(Number) }),
      ])
    )
    expect(
      renovationTab.desktopRows[0].kind === 'panels'
        ? renovationTab.desktopRows[0].regions[0].sections.map(
            (section) => section.id
          )
        : []
    ).toEqual(['estimatedConsumption', 'calculationContext'])
  })

  it.each([
    {
      label: 'one',
      panels: [
        panel({
          id: 'renovationRecommendations',
          sections: [
            rowSection('publishedRecommendations'),
            comparisonSection(),
          ],
        }),
      ],
      regionIds: ['renovationRecommendations'],
    },
    {
      label: 'two',
      panels: [
        panel({ id: 'energyConsumption' }),
        panel({
          id: 'renovationRecommendations',
          sections: [
            rowSection('publishedRecommendations'),
            comparisonSection(),
          ],
        }),
      ],
      regionIds: ['energyConsumption', 'renovationRecommendations'],
    },
  ])(
    'expands a comparison topology with $label top region(s) to the comparison width',
    ({ panels: sparsePanels, regionIds }) => {
      const topology = deriveEnergymapBuildingInfoPanelTopology(sparsePanels)
      const renovationTab = topology.availableTabs.find(
        (tab) => tab.id === 'renovation'
      )
      const topRow = renovationTab?.desktopRows.find(
        (row) => row.id === 'renovationTop'
      )

      expect(renovationTab?.desktopContentWidthPx).toBe(1440)
      expect(topRow).toMatchObject({
        kind: 'panels',
        contentWidthPx: 1440,
      })
      expect(
        topRow?.kind === 'panels'
          ? topRow.regions.map((region) => region.panel.id)
          : []
      ).toEqual(regionIds)
    }
  )

  it('assigns the same retained energy sections to desktop and stacked renovation content', () => {
    const energySections = [
      rowSection('estimatedConsumption'),
      {
        ...rowSection('calculationContext'),
        title: text('Calculation context'),
      },
    ]
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({ id: 'energyConsumption', sections: energySections }),
      panel({
        id: 'renovationRecommendations',
        sections: [rowSection('publishedRecommendations')],
      }),
    ])
    const renovationTab = topology.availableTabs.find(
      (tab) => tab.id === 'renovation'
    )
    const topRow = renovationTab?.desktopRows.find(
      (row) => row.id === 'renovationTop'
    )
    const desktopEnergyRegion =
      topRow?.kind === 'panels'
        ? topRow.regions.find(
            (region) => region.panel.id === 'energyConsumption'
          )
        : undefined
    const stackedEnergyPanel = renovationTab?.panels.find(
      (item) => item.id === 'energyConsumption'
    )

    expect(desktopEnergyRegion?.sections).toEqual(energySections)
    expect(stackedEnergyPanel?.sections).toEqual(energySections)
  })

  it('resolves invalid requested tabs and modes to the first available tab', () => {
    const topology = deriveEnergymapBuildingInfoPanelTopology([
      panel({
        id: 'renovationRecommendations',
        sections: [rowSection('publishedRecommendations')],
      }),
    ])

    expect(
      resolveEnergymapBuildingInfoTab({
        topology,
        requestedTabId: 'basic',
      })?.id
    ).toBe('renovation')
    expect(
      resolveEnergymapBuildingInfoMode({
        topology,
        requestedMode: 'twoPanel',
      })
    ).toBe('threePanel')
    expect(
      resolveEnergymapBuildingInfoTab({
        topology: deriveEnergymapBuildingInfoPanelTopology([]),
        requestedTabId: 'basic',
      })
    ).toBeUndefined()
  })

  it('passes normalized certificate-only and Water-plus-certificate sections through unchanged', () => {
    for (const building of [
      certificateBuilding(),
      certificateBuilding({ extraProperties: { floor_area: 100 } }),
    ]) {
      const panels = createEnergymapBuildingInfoPanels({
        selectedBuilding: building,
        locale: 'en-US',
      }) as EnergymapBuildingInfoPanel[]
      const certificateSection = panels
        .find(({ id }) => id === 'energyConsumption')
        ?.sections.find(({ id }) => id === 'certificateConsumption')
      const topology = deriveEnergymapBuildingInfoPanelTopology(panels)
      const topologyEnergyPanel = topology.availableTabs
        .find(({ id }) => id === 'basic')
        ?.panels.find(({ id }) => id === 'energyConsumption')

      expect(certificateSection).toBeDefined()
      expect(topologyEnergyPanel?.sections).toContain(certificateSection)
    }
  })

  it('suppresses certificates for complete reference Energy and does not fabricate a panel with neither source', () => {
    const completePanels = createEnergymapBuildingInfoPanels({
      selectedBuilding: certificateBuilding({ reference: true }),
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    expect(
      completePanels
        .find(({ id }) => id === 'energyConsumption')
        ?.sections.some(({ id }) => id === 'certificateConsumption')
    ).toBe(false)

    const neither = createEnergymapBuildingInfoPanels({
      selectedBuilding: {
        ...certificateBuilding(),
        properties: { building_key: 'neither-topology' },
      },
      locale: 'en-US',
    }) as EnergymapBuildingInfoPanel[]
    expect(
      deriveEnergymapBuildingInfoPanelTopology(neither).availableTabs.some(
        ({ panels }) => panels.some(({ id }) => id === 'energyConsumption')
      )
    ).toBe(false)
  })
})
