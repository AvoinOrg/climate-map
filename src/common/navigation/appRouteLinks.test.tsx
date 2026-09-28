import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  APP_ROUTE_KEYS,
  type AppRouteMetadata,
} from '#/common/routing/routeMetadata'

import {
  collectAppRouteEntries,
  resolveAppRouteHref,
  selectAppRouteEntry,
  type AppRouteEntry,
} from './appRouteLinks'

const makeRoute = ({
  id,
  fullPath,
  to = fullPath,
  metadata,
}: {
  id: string
  fullPath: string
  to?: string
  metadata: AppRouteMetadata
}) => ({
  id,
  fullPath,
  to,
  options: {
    staticData: {
      appRoute: metadata,
    },
  },
})

const makeRouter = () => ({
  buildLocation: jest.fn(
    ({
      to,
      params = {},
      search,
    }: {
      to: string
      params?: Record<string, string>
      search?: Record<string, unknown>
    }) => {
      const pathname = Object.entries(params).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to
      )
      const query = new URLSearchParams(
        Object.entries(search ?? {}).flatMap(([key, value]) =>
          value == null
            ? []
            : Array.isArray(value)
              ? value.map((item) => [key, String(item)])
              : [[key, String(value)]]
        )
      ).toString()

      return {
        href: query ? `${pathname}?${query}` : pathname,
      }
    }
  ),
})

const mainRoutesById = {
  canonicalHome: makeRoute({
    id: 'canonicalHome',
    fullPath: '/$locale/carbon',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_HOME,
      appletNamespace: 'carbon',
      variant: 'canonical',
      home: true,
    },
  }),
  canonicalPlans: makeRoute({
    id: 'canonicalPlans',
    fullPath: '/$locale/carbon/plans',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_PLANS,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  canonicalReport: makeRoute({
    id: 'canonicalReport',
    fullPath: '/$locale/carbon/report',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_REPORT,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  canonicalPlan: makeRoute({
    id: 'canonicalPlan',
    fullPath: '/$locale/carbon/plans/$planId',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_PLAN,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  canonicalPlanAreas: makeRoute({
    id: 'canonicalPlanAreas',
    fullPath: '/$locale/carbon/plans/$planId/areas',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_PLAN_AREAS,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  canonicalFolayer: makeRoute({
    id: 'canonicalFolayer',
    fullPath: '/$locale/luonnonmetsakartat/admin/layer/$folayerIdSlug',
    metadata: {
      key: APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER,
      appletNamespace: 'luonnonmetsakartat',
      variant: 'canonical',
    },
  }),
}

const standaloneCarbonRoutesById = {
  standaloneHome: makeRoute({
    id: 'standaloneHome',
    fullPath: '/$locale/',
    to: '/$locale',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_HOME,
      appletNamespace: 'carbon',
      variant: 'canonical',
      home: true,
    },
  }),
  standalonePlans: makeRoute({
    id: 'standalonePlans',
    fullPath: '/$locale/plans',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_PLANS,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  standaloneReport: makeRoute({
    id: 'standaloneReport',
    fullPath: '/$locale/report',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_REPORT,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  standalonePlan: makeRoute({
    id: 'standalonePlan',
    fullPath: '/$locale/plans/$planId',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_PLAN,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
  standalonePlanAreas: makeRoute({
    id: 'standalonePlanAreas',
    fullPath: '/$locale/plans/$planId/areas',
    metadata: {
      key: APP_ROUTE_KEYS.CARBON_PLAN_AREAS,
      appletNamespace: 'carbon',
      variant: 'canonical',
    },
  }),
}

const uiBaselineRoutesById = {
  uiBaselineHome: makeRoute({
    id: 'uiBaselineHome',
    fullPath: '/$locale/ui-baseline',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_HOME,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
      home: true,
    },
  }),
  uiBaselineContent: makeRoute({
    id: 'uiBaselineContent',
    fullPath: '/$locale/ui-baseline/content',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_CONTENT,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineDropdowns: makeRoute({
    id: 'uiBaselineDropdowns',
    fullPath: '/$locale/ui-baseline/dropdowns',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_DROPDOWNS,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineTooltipsAndHelp: makeRoute({
    id: 'uiBaselineTooltipsAndHelp',
    fullPath: '/$locale/ui-baseline/tooltips-and-help',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_TOOLTIPS_AND_HELP,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineButtonsToggles: makeRoute({
    id: 'uiBaselineButtonsToggles',
    fullPath: '/$locale/ui-baseline/buttons-toggles',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_BUTTONS_TOGGLES,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineLayers: makeRoute({
    id: 'uiBaselineLayers',
    fullPath: '/$locale/ui-baseline/layers',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_LAYERS,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineInputs: makeRoute({
    id: 'uiBaselineInputs',
    fullPath: '/$locale/ui-baseline/inputs',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_INPUTS,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineNotifications: makeRoute({
    id: 'uiBaselineNotifications',
    fullPath: '/$locale/ui-baseline/notifications',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_NOTIFICATIONS,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselinePanels: makeRoute({
    id: 'uiBaselinePanels',
    fullPath: '/$locale/ui-baseline/panels',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_PANELS,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineDrawing: makeRoute({
    id: 'uiBaselineDrawing',
    fullPath: '/$locale/ui-baseline/drawing',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_DRAWING,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineNodeFlow: makeRoute({
    id: 'uiBaselineNodeFlow',
    fullPath: '/$locale/ui-baseline/node-flow',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_NODE_FLOW,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
  uiBaselineModals: makeRoute({
    id: 'uiBaselineModals',
    fullPath: '/$locale/ui-baseline/modals',
    metadata: {
      key: APP_ROUTE_KEYS.UI_BASELINE_MODALS,
      appletNamespace: 'ui-baseline',
      variant: 'canonical',
    },
  }),
}

describe('appRouteLinks', () => {
  it('resolves canonical route keys through main-build TanStack route entries', () => {
    const router = makeRouter()
    const entries = collectAppRouteEntries(mainRoutesById)

    expect(
      resolveAppRouteHref({
        router,
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_PLANS,
        routeParams: { locale: 'fi' },
      })
    ).toBe('/fi/carbon/plans')

    expect(router.buildLocation).toHaveBeenCalledWith({
      to: '/$locale/carbon/plans',
      params: { locale: 'fi' },
      search: undefined,
    })
  })

  it('resolves standalone promoted routes through the same canonical keys', () => {
    const entries = collectAppRouteEntries(standaloneCarbonRoutesById)

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_HOME,
        routeParams: { locale: 'fi' },
      })
    ).toBe('/fi')

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_PLANS,
        routeParams: { locale: 'fi' },
      })
    ).toBe('/fi/plans')

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_REPORT,
        routeParams: { locale: 'fi' },
      })
    ).toBe('/fi/report')
  })

  it.each([
    [APP_ROUTE_KEYS.UI_BASELINE_HOME, '/fi/ui-baseline'],
    [APP_ROUTE_KEYS.UI_BASELINE_CONTENT, '/fi/ui-baseline/content'],
    [APP_ROUTE_KEYS.UI_BASELINE_DROPDOWNS, '/fi/ui-baseline/dropdowns'],
    [
      APP_ROUTE_KEYS.UI_BASELINE_TOOLTIPS_AND_HELP,
      '/fi/ui-baseline/tooltips-and-help',
    ],
    [
      APP_ROUTE_KEYS.UI_BASELINE_BUTTONS_TOGGLES,
      '/fi/ui-baseline/buttons-toggles',
    ],
    [APP_ROUTE_KEYS.UI_BASELINE_LAYERS, '/fi/ui-baseline/layers'],
    [APP_ROUTE_KEYS.UI_BASELINE_INPUTS, '/fi/ui-baseline/inputs'],
    [
      APP_ROUTE_KEYS.UI_BASELINE_NOTIFICATIONS,
      '/fi/ui-baseline/notifications',
    ],
    [APP_ROUTE_KEYS.UI_BASELINE_PANELS, '/fi/ui-baseline/panels'],
    [APP_ROUTE_KEYS.UI_BASELINE_DRAWING, '/fi/ui-baseline/drawing'],
    [APP_ROUTE_KEYS.UI_BASELINE_NODE_FLOW, '/fi/ui-baseline/node-flow'],
    [APP_ROUTE_KEYS.UI_BASELINE_MODALS, '/fi/ui-baseline/modals'],
  ])('resolves ui-baseline route key %s', (routeKey, expectedHref) => {
    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries: collectAppRouteEntries(uiBaselineRoutesById),
        routeKey,
        routeParams: { locale: 'fi' },
      })
    ).toBe(expectedHref)
  })

  it('selects exactly the requested canonical route key', () => {
    const entries = collectAppRouteEntries(mainRoutesById)

    expect(
      selectAppRouteEntry({
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_REPORT,
      }).routeId
    ).toBe('canonicalReport')
  })

  it('passes query params to TanStack href materialization', () => {
    const entries = collectAppRouteEntries(mainRoutesById)

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_PLANS,
        routeParams: { locale: 'fi' },
        search: new URLSearchParams({ tab: 'own' }),
      })
    ).toBe('/fi/carbon/plans?tab=own')
  })

  it('resolves report scenario query params and close-link plan targets with local ids', () => {
    const entries = collectAppRouteEntries(mainRoutesById)
    const reportSearch = new URLSearchParams({
      mockReset: '1',
      mockCarbonState: 'report-single-local',
      planIds: 'mock-plan-local',
      prevPageId: 'mock-local-plan',
      prevPageStep: 'areas',
    })

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_REPORT,
        routeParams: { locale: 'fi' },
        search: reportSearch,
      })
    ).toBe(
      '/fi/carbon/report?mockReset=1&mockCarbonState=report-single-local&planIds=mock-plan-local&prevPageId=mock-local-plan&prevPageStep=areas'
    )

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_PLAN,
        routeParams: { locale: 'fi', planId: 'mock-local-plan' },
      })
    ).toBe('/fi/carbon/plans/mock-local-plan')

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries,
        routeKey: APP_ROUTE_KEYS.CARBON_PLAN_AREAS,
        routeParams: { locale: 'fi', planId: 'mock-local-plan' },
      })
    ).toBe('/fi/carbon/plans/mock-local-plan/areas')
  })

  it('passes dynamic folayerIdSlug params and repeated URLSearchParams values', () => {
    const search = new URLSearchParams()
    search.append('tab', 'areas')
    search.append('tab', 'pictures')

    expect(
      resolveAppRouteHref({
        router: makeRouter(),
        entries: collectAppRouteEntries(mainRoutesById),
        routeKey: APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER,
        routeParams: { locale: 'fi', folayerIdSlug: 'layer-1' },
        search,
      })
    ).toBe(
      '/fi/luonnonmetsakartat/admin/layer/layer-1?tab=areas&tab=pictures'
    )
  })

  it('throws for a route key that is not present in the current route entries', () => {
    expect(() =>
      selectAppRouteEntry({
        entries: collectAppRouteEntries(standaloneCarbonRoutesById),
        routeKey: APP_ROUTE_KEYS.ENERGY_HOME,
      })
    ).toThrow('Unknown AppRouteKey "energy.home"')
  })

  it('throws for duplicate canonical route keys in a single entry set', () => {
    const [homeEntry] = collectAppRouteEntries(standaloneCarbonRoutesById)
    const duplicateHomeEntry: AppRouteEntry = {
      ...homeEntry,
      routeId: 'duplicateStandaloneHome',
    }

    expect(() =>
      selectAppRouteEntry({
        entries: [homeEntry, duplicateHomeEntry],
        routeKey: APP_ROUTE_KEYS.CARBON_HOME,
      })
    ).toThrow(/Duplicate AppRouteKey "carbon.home"/)
  })
})

// These fixtures are checked against the actual route declarations below. The
// pruning suite separately promotes those same source files without losing metadata.
const luonnonmetsakartatPages = [
  {
    file: 'route.tsx',
    key: 'LUONNONMETSAKARTAT_HOME',
    tail: '',
    mainHref: '/fi/luonnonmetsakartat',
    standaloneHref: '/fi',
  },
  {
    file: 'admin/route.tsx',
    key: 'LUONNONMETSAKARTAT_ADMIN',
    tail: '/admin',
    mainHref: '/fi/luonnonmetsakartat/admin',
    standaloneHref: '/fi/admin',
  },
  {
    file: 'admin/import.tsx',
    key: 'LUONNONMETSAKARTAT_ADMIN_IMPORT',
    tail: '/admin/import',
    mainHref: '/fi/luonnonmetsakartat/admin/import',
    standaloneHref: '/fi/admin/import',
  },
  {
    file: 'admin/layer/$folayerIdSlug/route.tsx',
    key: 'LUONNONMETSAKARTAT_ADMIN_FOLAYER',
    tail: '/admin/layer/$folayerIdSlug',
    mainHref: '/fi/luonnonmetsakartat/admin/layer/layer-1',
    standaloneHref: '/fi/admin/layer/layer-1',
  },
  {
    file: 'admin/layer/$folayerIdSlug/settings.tsx',
    key: 'LUONNONMETSAKARTAT_ADMIN_FOLAYER_SETTINGS',
    tail: '/admin/layer/$folayerIdSlug/settings',
    mainHref: '/fi/luonnonmetsakartat/admin/layer/layer-1/settings',
    standaloneHref: '/fi/admin/layer/layer-1/settings',
  },
  {
    file: 'admin/layer/$folayerIdSlug/pictures.tsx',
    key: 'LUONNONMETSAKARTAT_ADMIN_FOLAYER_PICTURES',
    tail: '/admin/layer/$folayerIdSlug/pictures',
    mainHref: '/fi/luonnonmetsakartat/admin/layer/layer-1/pictures',
    standaloneHref: '/fi/admin/layer/layer-1/pictures',
  },
] as const

describe('Luonnonmetsakartat route-key hrefs', () => {
  it.each(luonnonmetsakartatPages)(
    'binds $key fixtures to the actual $file declaration',
    ({ file, key, tail }) => {
      const source = readFileSync(
        path.resolve(
          __dirname,
          '../../routes/$locale/_map/(applets)/luonnonmetsakartat',
          file
        ),
        'utf8'
      )
      expect(source.match(/createFileRoute\(\s*'([^']+)'\s*\)/)?.[1]).toBe(
        `/$locale/_map/(applets)/luonnonmetsakartat${tail}`
      )
      // Anchor to staticData (not a coincidental import or another route key).
      expect(
        source.match(
          /staticData:\s*defineAppRouteStaticData\(\{\s*key:\s*APP_ROUTE_KEYS\.(\w+),/
        )?.[1]
      ).toBe(key)
      expect(source).toContain("appletNamespace: 'luonnonmetsakartat'")
      expect(source).toContain("variant: 'canonical'")
    }
  )

  describe.each(['main', 'standalone'] as const)('%s', (mode) => {
    const entries = collectAppRouteEntries(
      Object.fromEntries(
        luonnonmetsakartatPages.map(({ key, tail }) => [
          key,
          makeRoute({
            id: key,
            fullPath: `/$locale${mode === 'main' ? '/luonnonmetsakartat' : ''}${tail}`,
            metadata: {
              key: APP_ROUTE_KEYS[key],
              appletNamespace: 'luonnonmetsakartat',
              variant: 'canonical',
            },
          }),
        ])
      )
    )

    it.each(luonnonmetsakartatPages)(
      'resolves $key and delegates params/search to TanStack',
      ({ key, mainHref, standaloneHref }) => {
        const router = makeRouter()
        const routeParams = { locale: 'fi', folayerIdSlug: 'layer-1' }
        const expectedHref = mode === 'main' ? mainHref : standaloneHref
        expect(
          resolveAppRouteHref({
            router,
            entries,
            routeKey: APP_ROUTE_KEYS[key],
            routeParams,
          })
        ).toBe(expectedHref)
        const search = new URLSearchParams(
          'tab=areas&tab=pictures&q=A%2BB%20C&empty='
        )
        resolveAppRouteHref({
          router,
          entries,
          routeKey: APP_ROUTE_KEYS[key],
          routeParams,
          search,
        })
        expect(router.buildLocation).toHaveBeenLastCalledWith({
          to: selectAppRouteEntry({ entries, routeKey: APP_ROUTE_KEYS[key] })
            .to,
          params: routeParams,
          search: { tab: ['areas', 'pictures'], q: 'A+B C', empty: '' },
        })
        // This stub proves delegation; requestRouting tests prove redirect query bytes.
      }
    )
  })
})
