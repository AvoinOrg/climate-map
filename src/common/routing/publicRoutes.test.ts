import appletConf from '../../../appletConf.json'
import {
  PUBLIC_APPLET_NAMESPACES,
  PUBLIC_APPLET_ROUTE_FACTS,
  createPublicRouteContract,
  getAppletRouteSlugInfo,
  getLegacySubpathRedirects,
  getPublicAppletRouteSlug,
  getRouteFolderForApplet,
  isPublicAppletNamespace,
  normalizeLegacyAppletRootSubpathSegments,
  normalizeLegacyAppletSubpathSegments,
} from './publicRoutes'

// CommonJS is a supported adapter boundary and is compared directly here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const scriptRoutes = require('../../../utils/scripts/publicRoutes')

const publicRoute = ({
  slug,
  legacySlugs = [],
  legacySubpathRedirects = [],
}: {
  slug: string
  legacySlugs?: string[]
  legacySubpathRedirects?: Array<{ from: string[]; to: string[] }>
}) => ({
  langs: ['en'],
  publicRoute: { slug, legacySlugs, legacySubpathRedirects },
})

describe('public route manifest contract', () => {
  it('uses publicRoute presence as the public lookup boundary', () => {
    expect(PUBLIC_APPLET_NAMESPACES).toEqual([
      'carbon',
      'luonnonmetsakartat',
      'energy',
    ])
    expect(PUBLIC_APPLET_NAMESPACES).toEqual(
      Object.entries(appletConf)
        .filter(([, config]) => 'publicRoute' in config)
        .map(([namespace]) => namespace)
    )

    for (const namespace of PUBLIC_APPLET_NAMESPACES) {
      expect(isPublicAppletNamespace(namespace)).toBe(true)
    }
    for (const namespace of ['main', 'ui-baseline', 'forests', 'unknown']) {
      expect(isPublicAppletNamespace(namespace)).toBe(false)
      expect(getPublicAppletRouteSlug(namespace)).toBeNull()
    }
  })

  it('separates strict public lookup from route-folder fallback', () => {
    for (const slug of ['energy', 'carbon', 'luonnonmetsakartat']) {
      expect(getAppletRouteSlugInfo(slug.toUpperCase())).toEqual({
        namespace: slug,
        canonicalSlug: slug,
        isLegacy: false,
      })
      expect(getRouteFolderForApplet(slug)).toBe(slug)
    }

    for (const slug of [
      'main',
      'ui-baseline',
      'forests',
      'carbonmap',
      'energymap',
      'energiakartta',
      'hiilikartta',
      'unknown',
    ]) {
      expect(getAppletRouteSlugInfo(slug)).toBeNull()
    }
    expect(getRouteFolderForApplet('ui-baseline')).toBe('ui-baseline')
    expect(getRouteFolderForApplet('forests')).toBe('forests')
  })

  it('preserves only the ordered Carbon legacy subpath redirects', () => {
    expect(getLegacySubpathRedirects('carbon')).toEqual([
      { from: ['kaavat', '*', 'alueet'], to: ['plans', '*', 'areas'] },
      { from: ['kaavat'], to: ['plans'] },
      { from: ['kaavat', '*'], to: ['plans', '*'] },
      { from: ['raportti'], to: ['report'] },
    ])
    expect(getLegacySubpathRedirects('energy')).toEqual([])
    expect(getLegacySubpathRedirects('luonnonmetsakartat')).toEqual([])

    expect(
      normalizeLegacyAppletSubpathSegments({
        namespace: 'carbon',
        segments: ['kaavat', 'plan-1', 'alueet', 'raportti'],
      })
    ).toEqual(['plans', 'plan-1', 'areas', 'report'])
    expect(
      normalizeLegacyAppletRootSubpathSegments({
        namespace: 'carbon',
        segments: ['other', 'alueet'],
      })
    ).toEqual(['other', 'alueet'])
  })

  it('keeps Luonnonmetsakartat Finnish-only with no legacy translations', () => {
    expect(appletConf.luonnonmetsakartat.langs).toEqual(['fi'])
    expect(appletConf.luonnonmetsakartat.publicRoute).toEqual({
      slug: 'luonnonmetsakartat',
      legacySlugs: [],
      legacySubpathRedirects: [],
    })
    for (const tail of [
      'admin/tuo',
      'admin/taso/layer-1',
      'admin/taso/layer-1/asetukset',
      'admin/taso/layer-1/kuvat',
    ]) {
      for (const adapter of [
        {
          normalizeLegacyAppletSubpathSegments,
          normalizeLegacyAppletRootSubpathSegments,
        },
        scriptRoutes,
      ]) {
        const input = {
          namespace: 'luonnonmetsakartat',
          segments: tail.split('/'),
        }
        expect(adapter.normalizeLegacyAppletSubpathSegments(input)).toEqual(
          input.segments
        )
        expect(adapter.normalizeLegacyAppletRootSubpathSegments(input)).toEqual(
          input.segments
        )
      }
    }
  })

  it('keeps the TypeScript and CommonJS adapters in parity', () => {
    expect(scriptRoutes.createPublicRouteContract).toBe(
      createPublicRouteContract
    )
    expect(scriptRoutes.PUBLIC_APPLET_NAMESPACES).toEqual(
      PUBLIC_APPLET_NAMESPACES
    )
    expect(scriptRoutes.PUBLIC_APPLET_ROUTE_FACTS).toEqual(
      PUBLIC_APPLET_ROUTE_FACTS
    )

    for (const value of [
      'CARBON',
      'energy',
      'luonnonmetsakartat',
      'ui-baseline',
      'hiilikartta',
    ]) {
      expect(scriptRoutes.getAppletRouteSlugInfo(value)).toEqual(
        getAppletRouteSlugInfo(value)
      )
      expect(scriptRoutes.getRouteFolderForApplet(value)).toBe(
        getRouteFolderForApplet(value)
      )
    }
  })

  it('rejects duplicate canonical or legacy slugs deterministically', () => {
    const invalidConfig = {
      first: publicRoute({ slug: 'Shared' }),
      second: publicRoute({ slug: 'second', legacySlugs: ['shared'] }),
    }

    expect(() => createPublicRouteContract(invalidConfig)).toThrow(
      /duplicate normalized slug "shared"/i
    )
  })

  it('rejects conflicting aliases and malformed wildcard patterns', () => {
    const conflictingAliases = {
      example: publicRoute({
        slug: 'example',
        legacySubpathRedirects: [
          { from: ['old'], to: ['first'] },
          { from: ['old'], to: ['second'] },
        ],
      }),
    }
    const malformedWildcard = {
      example: publicRoute({
        slug: 'example',
        legacySubpathRedirects: [
          { from: ['old', '*'], to: ['new', 'literal'] },
        ],
      }),
    }

    expect(() => createPublicRouteContract(conflictingAliases)).toThrow(
      /conflicting redirect mapping/i
    )
    expect(() => createPublicRouteContract(malformedWildcard)).toThrow(
      /compatible wildcard|wildcard placement/i
    )
  })
})
