const {
  CARBON_MOCK_SCENARIO_SET: REGISTERED_CARBON_MOCK_SCENARIO_SET,
  COMPONENT_FIXTURE_SCENARIO_SET,
  LUONNONMETSAKARTAT_MOCK_SCENARIO_SET:
    REGISTERED_LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
  SUPPORTED_SCENARIO_SETS,
  buildVisualScenarios,
  getCompiledApplets,
  isStandaloneAppletBuild,
  resolveScenarioSet,
} = require('../../utils/visual/scenarios')
const { getAppletRouteSlugInfo } = require('../../utils/scripts/publicRoutes')
const {
  CARBON_MOCK_MASK_SELECTORS,
  CARBON_MOCK_SCENARIO_SET,
} = require('../../utils/visual/carbonMockScenarios')
const {
  LUONNONMETSAKARTAT_MOCK_MASK_SELECTORS,
  LUONNONMETSAKARTAT_MOCK_ROUTE_BASE,
  LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
} = require('../../utils/visual/luonnonmetsakartatMockScenarios')
const { DEFAULT_MASK_SELECTORS } = require('../../utils/visual/constants')
const appletConf = require('../../appletConf.json')
const {
  componentFixtureMetadata,
} = require('../../src/common/component-fixtures/metadata')
const packageJson = require('../../package.json')
const {
  MOCK_COMPARISON_PLAN_SERVER_ID,
  MOCK_EXTERNAL_PLAN_ID,
  MOCK_EXTERNAL_REPORT_ERROR_SERVER_ID,
  MOCK_EXTERNAL_REPORT_SERVER_ID,
  MOCK_INVALID_PLAN_ID,
  MOCK_INVALID_PLAN_SERVER_ID,
  MOCK_LOCAL_PLAN_ID,
  MOCK_LOCAL_PLAN_SERVER_ID,
  MOCK_SERVER_PLAN_ID,
} = require('../../src/applets/carbon/common/mockScenarios/ids')
const {
  MOCK_VISIBLE_LAYER_ID,
} = require('../../src/applets/luonnonmetsakartat/common/mockScenarios/ids')
const {
  MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM,
  MOCK_RESET_QUERY_PARAM,
} = require('../../src/applets/luonnonmetsakartat/common/mockScenarios/config')
const { MOCK_AUTH_QUERY_PARAM } = require('../../src/common/auth/mock')

const CARBON_MOCK_BASE_URL = 'http://127.0.0.1:6900'
const CARBON_MOCK_ENV = {
  PUBLIC_COMPILED_APPLETS: 'main,carbon',
}
const LUONNONMETSAKARTAT_MOCK_BASE_URL = 'http://127.0.0.1:6900'
const LUONNONMETSAKARTAT_MOCK_ENV = {
  PUBLIC_COMPILED_APPLETS: 'main,luonnonmetsakartat',
}

const buildCarbonMockScenarios = () =>
  buildVisualScenarios({
    env: CARBON_MOCK_ENV,
    baseUrl: CARBON_MOCK_BASE_URL,
    scenarioSet: CARBON_MOCK_SCENARIO_SET,
  })

const buildLuonnonmetsakartatMockScenarios = () =>
  buildVisualScenarios({
    env: LUONNONMETSAKARTAT_MOCK_ENV,
    baseUrl: LUONNONMETSAKARTAT_MOCK_BASE_URL,
    scenarioSet: LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
  })

const getScenarioById = ({ scenarios, id }) =>
  scenarios.find((scenario) => scenario.id === id)

const getScenarioUrl = (scenario) => new URL(scenario.url)

const getScenarioPathname = (scenario) => getScenarioUrl(scenario).pathname

describe('visual scenarios', () => {
  test('builds main-mode root scenarios for compiled applets', () => {
    const env = {
      PUBLIC_COMPILED_APPLETS: 'main,energy,carbon,luonnonmetsakartat',
    }

    const scenarios = buildVisualScenarios({
      env,
      baseUrl: 'http://127.0.0.1:6900',
    })

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      'main-root',
      'energy-root',
      'carbon-root',
      'luonnonmetsakartat-root',
    ])

    expect(scenarios.find((s) => s.id === 'main-root').url).toBe(
      'http://127.0.0.1:6900/en'
    )
    expect(scenarios.find((s) => s.id === 'energy-root').url).toBe(
      'http://127.0.0.1:6900/fi/energy'
    )
    expect(scenarios.find((s) => s.id === 'carbon-root').url).toBe(
      'http://127.0.0.1:6900/fi/carbon'
    )
    expect(scenarios.find((s) => s.id === 'luonnonmetsakartat-root').url).toBe(
      'http://127.0.0.1:6900/fi/luonnonmetsakartat'
    )
  })

  test('uses namespace route folders without making internal applets public', () => {
    const scenarios = buildVisualScenarios({
      env: { PUBLIC_COMPILED_APPLETS: 'main,ui-baseline' },
      baseUrl: 'http://127.0.0.1:6900',
    })

    expect(scenarios.find((s) => s.id === 'ui-baseline-root').path).toBe(
      '/en/ui-baseline'
    )
    expect(getAppletRouteSlugInfo('ui-baseline')).toBeNull()
  })

  test('builds standalone applet root scenario', () => {
    const env = { PUBLIC_COMPILED_APPLETS: 'carbon' }

    expect(isStandaloneAppletBuild({ env })).toBe(true)

    const scenarios = buildVisualScenarios({ env, baseUrl: 'http://app' })
    expect(scenarios).toHaveLength(1)
    expect(scenarios[0]).toMatchObject({
      id: 'carbon-root',
      applet: 'carbon',
      path: '/fi',
      url: 'http://app/fi',
    })
  })

  test('uses full-manifest fallback and normalized first-seen order', () => {
    expect(getCompiledApplets({ env: {} })).toEqual(Object.keys(appletConf))
    expect(
      getCompiledApplets({
        env: { PUBLIC_COMPILED_APPLETS: ' Carbon, MAIN,carbon ' },
      })
    ).toEqual(['carbon', 'main'])
  })

  test('rejects unknown and multi-standalone compiled applets', () => {
    expect(() =>
      getCompiledApplets({
        env: { PUBLIC_COMPILED_APPLETS: 'main,unknown,carbon' },
      })
    ).toThrow(/unknown applet/i)
    expect(() =>
      getCompiledApplets({
        env: { PUBLIC_COMPILED_APPLETS: 'carbon,energy' },
      })
    ).toThrow(/exactly one applet/i)
  })

  test.each(Object.keys(appletConf).filter((applet) => applet !== 'main'))(
    'builds the canonical standalone root for %s',
    (applet) => {
      const [scenario] = buildVisualScenarios({
        env: { PUBLIC_COMPILED_APPLETS: applet },
      })

      expect(scenario).toMatchObject({
        id: `${applet}-root`,
        path: `/${appletConf[applet].langs[0]}`,
      })
    }
  )

  test('builds component fixture scenarios in main mode', () => {
    const scenarios = buildVisualScenarios({
      env: { PUBLIC_COMPILED_APPLETS: 'main,energy' },
      baseUrl: 'http://127.0.0.1:6900',
      scenarioSet: COMPONENT_FIXTURE_SCENARIO_SET,
    })

    const expectedFixtureScenarioIds = componentFixtureMetadata.flatMap(
      (fixture) =>
        fixture.states.map(
          (state) => `component-fixture-${fixture.id}-${state.id}`
        )
    )

    expect(scenarios.map((scenario) => scenario.id)).toEqual(
      expectedFixtureScenarioIds
    )

    const firstFixture = componentFixtureMetadata[0]
    const firstState = firstFixture.states[0]
    expect(scenarios[0]).toMatchObject({
      applet: 'component-fixtures',
      locale: 'en',
      path: `/en/dev/component-fixtures/${firstFixture.id}/${firstState.id}`,
      url: `http://127.0.0.1:6900/en/dev/component-fixtures/${firstFixture.id}/${firstState.id}`,
      requiresWebGL: false,
      waitFor: '[data-testid="component-fixture-ready"]',
      maskSelectors: [],
      sourceGlobs: firstFixture.sourceGlobs,
    })
    expect(scenarios[0].tags).toEqual([
      'component-fixture',
      `component:${firstFixture.id}`,
      `state:${firstState.id}`,
    ])
    expect(scenarios.map((scenario) => scenario.id)).toContain(
      'component-fixture-loading-feedback-spinner-size-color-variants'
    )
    expect(scenarios.map((scenario) => scenario.id)).toContain(
      'component-fixture-loading-feedback-modal-overlay'
    )

    expect(
      getScenarioById({
        scenarios,
        id: 'component-fixture-energymap-building-info-panel-certificate-reported-fi-mobile',
      })
    ).toMatchObject({
      locale: 'fi',
      path:
        '/fi/dev/component-fixtures/energymap-building-info-panel/certificate-reported-fi-mobile',
      url:
        'http://127.0.0.1:6900/fi/dev/component-fixtures/energymap-building-info-panel/certificate-reported-fi-mobile',
    })
  })

  test('rejects component fixture scenarios for standalone applet builds', () => {
    expect(() =>
      buildVisualScenarios({
        env: { PUBLIC_COMPILED_APPLETS: 'carbon' },
        baseUrl: 'http://app',
        scenarioSet: COMPONENT_FIXTURE_SCENARIO_SET,
      })
    ).toThrow('requires a main-app build')
  })

  describe('carbon mock scenarios', () => {
    const expectedCarbonScenarioStates = {
      'carbon-mocks-home': 'home',
      'carbon-mocks-plans-empty': 'plans-empty',
      'carbon-mocks-plans-seeded': 'plans-seeded',
      'carbon-mocks-import-placeholder': 'import-placeholder',
      'carbon-mocks-draw-empty-plan': 'draw-empty-plan',
      'carbon-mocks-plan-valid': 'plan-valid',
      'carbon-mocks-plan-invalid-zoning': 'plan-invalid-zoning',
      'carbon-mocks-plan-invalid-land-use': 'plan-invalid-land-use',
      'carbon-mocks-save-login': 'save-login',
      'carbon-mocks-save-ready': 'save-ready',
      'carbon-mocks-save-disabled': 'save-disabled',
      'carbon-mocks-save-saved': 'save-saved',
      'carbon-mocks-calc-not-started': 'calc-not-started',
      'carbon-mocks-calc-initializing': 'calc-initializing',
      'carbon-mocks-calc-calculating': 'calc-calculating',
      'carbon-mocks-calc-errored': 'calc-errored',
      'carbon-mocks-calc-finished': 'calc-finished',
      'carbon-mocks-areas-valid': 'areas-valid',
      'carbon-mocks-areas-invalid-zoning': 'areas-invalid-zoning',
      'carbon-mocks-areas-invalid-land-use': 'areas-invalid-land-use',
      'carbon-mocks-report-no-ids': 'plans-empty',
      'carbon-mocks-report-single-local': 'report-single-local',
      'carbon-mocks-report-comparison': 'report-comparison',
      'carbon-mocks-report-external': 'report-external',
      'carbon-mocks-report-external-api-comparison': 'report-single-local',
      'carbon-mocks-report-invalid-id': 'report-invalid-id',
      'carbon-mocks-report-no-data': 'report-no-data',
    }

    test('registers the carbon-mocks scenario set', () => {
      expect(REGISTERED_CARBON_MOCK_SCENARIO_SET).toBe(CARBON_MOCK_SCENARIO_SET)
      expect(
        resolveScenarioSet({ scenarioSet: CARBON_MOCK_SCENARIO_SET })
      ).toBe(CARBON_MOCK_SCENARIO_SET)
      expect(SUPPORTED_SCENARIO_SETS).toContain(CARBON_MOCK_SCENARIO_SET)
    })

    test('builds the expected carbon mock route-state scenarios', () => {
      const scenarios = buildCarbonMockScenarios()

      expect(scenarios.map((scenario) => scenario.id)).toEqual(
        Object.keys(expectedCarbonScenarioStates)
      )
    })

    test('uses canonical carbon URLs and deterministic seeded query params', () => {
      const scenarios = buildCarbonMockScenarios()

      for (const scenario of scenarios) {
        const url = getScenarioUrl(scenario)
        const expectedState = expectedCarbonScenarioStates[scenario.id]

        expect(scenario.path.startsWith('/fi/carbon')).toBe(true)
        expect(scenario.path).not.toContain('/hiilikartta')
        expect(scenario.path).not.toContain('/kaavat')
        expect(scenario.path).not.toContain('/raportti')
        expect(url.pathname.startsWith('/fi/carbon')).toBe(true)
        expect(scenario.url).toBe(`${CARBON_MOCK_BASE_URL}${scenario.path}`)
        expect(url.searchParams.get('mockReset')).toBe('1')
        expect(url.searchParams.get('mockCarbonState')).toBe(expectedState)
        expect(scenario.tags).toEqual(
          expect.arrayContaining([
            CARBON_MOCK_SCENARIO_SET,
            'applet:carbon',
            `state:${expectedState}`,
          ])
        )
      }
    })

    test('uses stable route and report ids from the mock scenario catalog', () => {
      const scenarios = buildCarbonMockScenarios()

      expect(
        getScenarioPathname(
          getScenarioById({
            scenarios,
            id: 'carbon-mocks-plan-valid',
          })
        )
      ).toBe(`/fi/carbon/plans/${MOCK_LOCAL_PLAN_ID}`)
      expect(
        getScenarioPathname(
          getScenarioById({
            scenarios,
            id: 'carbon-mocks-calc-finished',
          })
        )
      ).toBe(`/fi/carbon/plans/${MOCK_SERVER_PLAN_ID}`)
      for (const id of [
        'carbon-mocks-save-login',
        'carbon-mocks-save-ready',
        'carbon-mocks-save-disabled',
        'carbon-mocks-save-saved',
      ]) {
        expect(
          getScenarioPathname(
            getScenarioById({
              scenarios,
              id,
            })
          )
        ).toBe(`/fi/carbon/plans/${MOCK_LOCAL_PLAN_ID}`)
      }
      expect(
        getScenarioPathname(
          getScenarioById({
            scenarios,
            id: 'carbon-mocks-areas-invalid-land-use',
          })
        )
      ).toBe(`/fi/carbon/plans/${MOCK_INVALID_PLAN_ID}/areas`)

      const noIdsReportUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-no-ids',
        })
      )
      expect(noIdsReportUrl.pathname).toBe('/fi/carbon/report')
      expect(noIdsReportUrl.searchParams.has('planIds')).toBe(false)

      const singleLocalUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-single-local',
        })
      )
      expect(singleLocalUrl.searchParams.get('planIds')).toBe(
        MOCK_LOCAL_PLAN_SERVER_ID
      )
      expect(singleLocalUrl.searchParams.get('prevPageId')).toBe(
        MOCK_LOCAL_PLAN_ID
      )
      expect(singleLocalUrl.searchParams.get('prevPageStep')).toBe('areas')

      const comparisonUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-comparison',
        })
      )
      expect(comparisonUrl.searchParams.get('planIds')).toBe(
        `${MOCK_LOCAL_PLAN_SERVER_ID},${MOCK_COMPARISON_PLAN_SERVER_ID}`
      )
      expect(comparisonUrl.searchParams.get('prevPageId')).toBe(
        MOCK_LOCAL_PLAN_ID
      )
      expect(comparisonUrl.searchParams.get('prevPageStep')).toBe('areas')

      const externalUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-external',
        })
      )
      expect(externalUrl.searchParams.get('planIds')).toBe(
        MOCK_EXTERNAL_PLAN_ID
      )
      expect(externalUrl.searchParams.get('planIds')).not.toBe(
        MOCK_EXTERNAL_REPORT_SERVER_ID
      )
      expect(externalUrl.searchParams.get('planIds')).not.toBe(
        MOCK_EXTERNAL_REPORT_ERROR_SERVER_ID
      )

      const externalApiComparisonUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-external-api-comparison',
        })
      )
      expect(externalApiComparisonUrl.searchParams.get('mockCarbonState')).toBe(
        'report-single-local'
      )
      expect(externalApiComparisonUrl.searchParams.get('planIds')).toBe(
        `${MOCK_LOCAL_PLAN_SERVER_ID},${MOCK_EXTERNAL_REPORT_SERVER_ID}`
      )
      expect(externalApiComparisonUrl.searchParams.get('prevPageId')).toBe(
        MOCK_LOCAL_PLAN_ID
      )
      expect(externalApiComparisonUrl.searchParams.get('prevPageStep')).toBe(
        'areas'
      )

      const invalidReportUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-invalid-id',
        })
      )
      expect(invalidReportUrl.searchParams.get('planIds')).toBe(
        MOCK_INVALID_PLAN_ID
      )

      const noDataReportUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-report-no-data',
        })
      )
      expect(noDataReportUrl.searchParams.get('planIds')).toBe(
        MOCK_INVALID_PLAN_SERVER_ID
      )
      expect(noDataReportUrl.searchParams.get('prevPageId')).toBe(
        MOCK_INVALID_PLAN_ID
      )
      expect(noDataReportUrl.searchParams.get('prevPageStep')).toBe('plan')
    })

    test('maps report graph component changes to report scenarios', () => {
      const scenarios = buildCarbonMockScenarios()
      const expectedReportSourceGlobs = [
        'src/applets/carbon/pages/report/CarbonReportPage.tsx',
        'src/applets/carbon/components/CarbonOverviewGraph/CarbonOverviewGraph.tsx',
        'src/applets/carbon/components/CarbonLineChart/CarbonLineChartInner.tsx',
        'src/applets/carbon/components/CarbonMapGraph/CarbonMapGraphMap.tsx',
      ]

      for (const id of [
        'carbon-mocks-report-single-local',
        'carbon-mocks-report-comparison',
        'carbon-mocks-report-external',
        'carbon-mocks-report-external-api-comparison',
      ]) {
        expect(getScenarioById({ scenarios, id }).sourceGlobs).toEqual(
          expect.arrayContaining(expectedReportSourceGlobs)
        )
      }
    })

    test('makes footer save states reproducible with explicit auth state', () => {
      const scenarios = buildCarbonMockScenarios()

      const saveLoginUrl = getScenarioUrl(
        getScenarioById({
          scenarios,
          id: 'carbon-mocks-save-login',
        })
      )
      expect(saveLoginUrl.searchParams.get('mockAuth')).toBe('unauthenticated')

      for (const id of [
        'carbon-mocks-save-ready',
        'carbon-mocks-save-disabled',
        'carbon-mocks-save-saved',
      ]) {
        const url = getScenarioUrl(
          getScenarioById({
            scenarios,
            id,
          })
        )
        expect(url.searchParams.get('mockAuth')).toBe('authenticated')
      }
    })

    test('marks all carbon mock scenarios as WebGL routes and applies masks', () => {
      const scenarios = buildCarbonMockScenarios()

      for (const scenario of scenarios) {
        expect(scenario.requiresWebGL).toBe(true)
        expect(scenario.maskSelectors).toEqual(
          expect.arrayContaining([
            ...DEFAULT_MASK_SELECTORS,
            ...CARBON_MOCK_MASK_SELECTORS,
          ])
        )
      }
    })

    test('rejects carbon mock scenarios for unsupported builds', () => {
      expect(() =>
        buildVisualScenarios({
          env: { PUBLIC_COMPILED_APPLETS: 'carbon' },
          baseUrl: 'http://app',
          scenarioSet: CARBON_MOCK_SCENARIO_SET,
        })
      ).toThrow(
        'requires a main-app build with PUBLIC_COMPILED_APPLETS including "main" and "carbon"'
      )

      expect(() =>
        buildVisualScenarios({
          env: { PUBLIC_COMPILED_APPLETS: 'main,energy' },
          baseUrl: 'http://app',
          scenarioSet: CARBON_MOCK_SCENARIO_SET,
        })
      ).toThrow(
        'requires a main-app build with PUBLIC_COMPILED_APPLETS including "main" and "carbon"'
      )
    })

    test('exposes a no-start package script for carbon mock visual runs', () => {
      expect(packageJson.scripts['visual:carbon-mocks']).toContain(
        '--scenario-set=carbon-mocks'
      )
      expect(packageJson.scripts['visual:carbon-mocks']).toContain(
        '--base-url=http://127.0.0.1:6900'
      )
      expect(packageJson.scripts['visual:carbon-mocks']).toContain('--no-start')
      expect(packageJson.scripts['visual:carbon-mocks']).not.toContain(
        'PUBLIC_HIILIKARTTA_MOCK_SCENARIOS_ENABLED'
      )
    })

    test('exposes a no-start package script for the carbon mock browser smoke', () => {
      const script = packageJson.scripts['visual:carbon-mocks:smoke']

      expect(script).toContain('carbon-mock-smoke.js')
      expect(script).toContain('--base-url=http://127.0.0.1:6900')
      expect(script).toContain('--no-start')
      expect(script).not.toContain(
        'PUBLIC_HIILIKARTTA_MOCK_SCENARIOS_ENABLED'
      )
      expect(script).not.toContain('HIILIKARTTA_MOCK_API_ENABLED')
      expect(script).not.toContain('PUBLIC_MOCK_AUTH_ENABLED')
      expect(script).not.toContain('HIILIKARTTA_API_URL')
      expect(script).not.toContain('start:dev')
      expect(script).not.toContain('yarn dev')
    })
  })

  describe('luonnonmetsakartat mock scenarios', () => {
    const expectedLuonnonmetsakartatScenarioStates = {
      'luonnonmetsakartat-mocks-public-empty': 'public-empty',
      'luonnonmetsakartat-mocks-public-layers': 'public-layers',
      'luonnonmetsakartat-mocks-admin-unauthenticated': 'admin-unauthenticated',
      'luonnonmetsakartat-mocks-admin-rejected': 'admin-rejected',
      'luonnonmetsakartat-mocks-admin-errored': 'admin-errored',
      'luonnonmetsakartat-mocks-admin-empty': 'admin-empty',
      'luonnonmetsakartat-mocks-admin-layers': 'admin-layers',
      'luonnonmetsakartat-mocks-admin-import': 'admin-layers',
      'luonnonmetsakartat-mocks-layer-detail': 'layer-detail',
      'luonnonmetsakartat-mocks-settings-clean': 'settings-clean',
      'luonnonmetsakartat-mocks-settings-unsynced': 'settings-unsynced',
      'luonnonmetsakartat-mocks-settings-saving': 'settings-saving',
      'luonnonmetsakartat-mocks-pictures-empty': 'pictures-empty',
      'luonnonmetsakartat-mocks-pictures-mapped': 'pictures-mapped',
      'luonnonmetsakartat-mocks-pictures-unmatched': 'pictures-unmatched',
    }

    const expectedLuonnonmetsakartatScenarioSurfaces = {
      'luonnonmetsakartat-mocks-public-empty': 'public',
      'luonnonmetsakartat-mocks-public-layers': 'public',
      'luonnonmetsakartat-mocks-admin-unauthenticated': 'admin',
      'luonnonmetsakartat-mocks-admin-rejected': 'admin',
      'luonnonmetsakartat-mocks-admin-errored': 'admin',
      'luonnonmetsakartat-mocks-admin-empty': 'admin',
      'luonnonmetsakartat-mocks-admin-layers': 'admin',
      'luonnonmetsakartat-mocks-admin-import': 'import',
      'luonnonmetsakartat-mocks-layer-detail': 'layer',
      'luonnonmetsakartat-mocks-settings-clean': 'settings',
      'luonnonmetsakartat-mocks-settings-unsynced': 'settings',
      'luonnonmetsakartat-mocks-settings-saving': 'settings',
      'luonnonmetsakartat-mocks-pictures-empty': 'pictures',
      'luonnonmetsakartat-mocks-pictures-mapped': 'pictures',
      'luonnonmetsakartat-mocks-pictures-unmatched': 'pictures',
    }

    const expectedLuonnonmetsakartatAuthStates = {
      'luonnonmetsakartat-mocks-admin-unauthenticated': 'unauthenticated',
      'luonnonmetsakartat-mocks-admin-rejected': 'rejected',
      'luonnonmetsakartat-mocks-admin-errored': 'missing-token',
      'luonnonmetsakartat-mocks-admin-empty': 'authenticated',
      'luonnonmetsakartat-mocks-admin-layers': 'authenticated',
      'luonnonmetsakartat-mocks-admin-import': 'authenticated',
      'luonnonmetsakartat-mocks-layer-detail': 'authenticated',
      'luonnonmetsakartat-mocks-settings-clean': 'authenticated',
      'luonnonmetsakartat-mocks-settings-unsynced': 'authenticated',
      'luonnonmetsakartat-mocks-settings-saving': 'authenticated',
      'luonnonmetsakartat-mocks-pictures-empty': 'authenticated',
      'luonnonmetsakartat-mocks-pictures-mapped': 'authenticated',
      'luonnonmetsakartat-mocks-pictures-unmatched': 'authenticated',
    }

    test('registers the luonnonmetsakartat-mocks scenario set', () => {
      expect(REGISTERED_LUONNONMETSAKARTAT_MOCK_SCENARIO_SET).toBe(
        LUONNONMETSAKARTAT_MOCK_SCENARIO_SET
      )
      expect(
        resolveScenarioSet({
          scenarioSet: LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
        })
      ).toBe(LUONNONMETSAKARTAT_MOCK_SCENARIO_SET)
      expect(SUPPORTED_SCENARIO_SETS).toContain(
        LUONNONMETSAKARTAT_MOCK_SCENARIO_SET
      )
    })

    test('builds the expected luonnonmetsakartat route-state scenarios', () => {
      const scenarios = buildLuonnonmetsakartatMockScenarios()

      expect(scenarios.map((scenario) => scenario.id)).toEqual(
        Object.keys(expectedLuonnonmetsakartatScenarioStates)
      )
    })

    test('uses canonical main-mode URLs and deterministic seed query params', () => {
      const scenarios = buildLuonnonmetsakartatMockScenarios()

      for (const scenario of scenarios) {
        const url = getScenarioUrl(scenario)
        const expectedState =
          expectedLuonnonmetsakartatScenarioStates[scenario.id]

        expect(
          scenario.path.startsWith(LUONNONMETSAKARTAT_MOCK_ROUTE_BASE)
        ).toBe(true)
        expect(
          url.pathname.startsWith(LUONNONMETSAKARTAT_MOCK_ROUTE_BASE)
        ).toBe(true)
        expect(url.pathname).not.toMatch(/^\/fi\/admin(\/|$)/)
        expect(url.pathname).not.toMatch(/\/(tuo|taso|asetukset|kuvat)(\/|$)/)
        expect(scenario.url).toBe(
          `${LUONNONMETSAKARTAT_MOCK_BASE_URL}${scenario.path}`
        )
        expect(url.searchParams.get(MOCK_RESET_QUERY_PARAM)).toBe('1')
        expect(
          url.searchParams.get(MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM)
        ).toBe(expectedState)
      }

      expect(
        getScenarioById({
          scenarios,
          id: 'luonnonmetsakartat-mocks-public-empty',
        }).path
      ).toBe(
        `${LUONNONMETSAKARTAT_MOCK_ROUTE_BASE}?${MOCK_RESET_QUERY_PARAM}=1&${MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM}=public-empty`
      )
      expect(
        getScenarioById({
          scenarios,
          id: 'luonnonmetsakartat-mocks-admin-unauthenticated',
        }).path
      ).toBe(
        `${LUONNONMETSAKARTAT_MOCK_ROUTE_BASE}/admin?${MOCK_RESET_QUERY_PARAM}=1&${MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM}=admin-unauthenticated&${MOCK_AUTH_QUERY_PARAM}=unauthenticated`
      )
    })

    test('uses explicit auth query states for admin scenarios only', () => {
      const scenarios = buildLuonnonmetsakartatMockScenarios()

      for (const scenario of scenarios) {
        const url = getScenarioUrl(scenario)
        const expectedAuth = expectedLuonnonmetsakartatAuthStates[scenario.id]

        if (expectedAuth == null) {
          expect(url.searchParams.has(MOCK_AUTH_QUERY_PARAM)).toBe(false)
        } else {
          expect(url.searchParams.get(MOCK_AUTH_QUERY_PARAM)).toBe(expectedAuth)
        }
      }
    })

    test('uses the stable seeded visible layer id for dynamic routes', () => {
      const scenarios = buildLuonnonmetsakartatMockScenarios()
      const layerPath = `${LUONNONMETSAKARTAT_MOCK_ROUTE_BASE}/admin/layer/${MOCK_VISIBLE_LAYER_ID}`

      expect(
        getScenarioPathname(
          getScenarioById({
            scenarios,
            id: 'luonnonmetsakartat-mocks-layer-detail',
          })
        )
      ).toBe(layerPath)

      for (const id of [
        'luonnonmetsakartat-mocks-settings-clean',
        'luonnonmetsakartat-mocks-settings-unsynced',
        'luonnonmetsakartat-mocks-settings-saving',
      ]) {
        expect(
          getScenarioPathname(
            getScenarioById({
              scenarios,
              id,
            })
          )
        ).toBe(`${layerPath}/settings`)
      }

      for (const id of [
        'luonnonmetsakartat-mocks-pictures-empty',
        'luonnonmetsakartat-mocks-pictures-mapped',
        'luonnonmetsakartat-mocks-pictures-unmatched',
      ]) {
        expect(
          getScenarioPathname(
            getScenarioById({
              scenarios,
              id,
            })
          )
        ).toBe(`${layerPath}/pictures`)
      }
    })

    test('marks app-level scenarios as WebGL routes with stable tags and masks', () => {
      const scenarios = buildLuonnonmetsakartatMockScenarios()

      for (const scenario of scenarios) {
        const expectedState =
          expectedLuonnonmetsakartatScenarioStates[scenario.id]
        const expectedSurface =
          expectedLuonnonmetsakartatScenarioSurfaces[scenario.id]

        expect(scenario.requiresWebGL).toBe(true)
        expect(scenario.maskSelectors).toEqual(
          LUONNONMETSAKARTAT_MOCK_MASK_SELECTORS
        )
        expect(scenario.tags).toEqual([
          LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
          'applet:luonnonmetsakartat',
          `state:${expectedState}`,
          `surface:${expectedSurface}`,
        ])
      }
    })

    test('rejects luonnonmetsakartat mock scenarios for unsupported builds', () => {
      expect(() =>
        buildVisualScenarios({
          env: { PUBLIC_COMPILED_APPLETS: 'luonnonmetsakartat' },
          baseUrl: 'http://app',
          scenarioSet: LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
        })
      ).toThrow(
        'requires a main-app build with PUBLIC_COMPILED_APPLETS including "main" and "luonnonmetsakartat"'
      )

      for (const compiledApplets of ['main,carbon', 'main,energy']) {
        expect(() =>
          buildVisualScenarios({
            env: { PUBLIC_COMPILED_APPLETS: compiledApplets },
            baseUrl: 'http://app',
            scenarioSet: LUONNONMETSAKARTAT_MOCK_SCENARIO_SET,
          })
        ).toThrow(
          'requires a main-app build with PUBLIC_COMPILED_APPLETS including "main" and "luonnonmetsakartat"'
        )
      }
    })

    test('exposes a no-start package script for luonnonmetsakartat visual runs', () => {
      const script = packageJson.scripts['visual:luonnonmetsakartat-mocks']

      expect(script).toContain('--scenario-set=luonnonmetsakartat-mocks')
      expect(script).toContain('--base-url=http://127.0.0.1:6900')
      expect(script).toContain('--no-start')
      expect(script).not.toContain(
        'PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED'
      )
      expect(script).not.toContain('LUONNONMETSAKARTAT_MOCK_API_ENABLED')
      expect(script).not.toContain('PUBLIC_MOCK_AUTH_ENABLED')
      expect(script).not.toContain('start:dev')
      expect(script).not.toContain('yarn dev')
    })
  })
})
