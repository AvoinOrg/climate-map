import {
  decideRequestRouting,
  getRequestRoutingTargetUrl,
  REQUEST_ROUTING_SKIP_PREFIXES,
} from './requestRouting'
import { getAppletRouteSlugInfo } from './publicRoutes'
import appletConf from '../../../appletConf.json'

const url = (path: string, host = 'localhost') => `https://${host}${path}`

describe('public applet route slug policy', () => {
  it.each(['carbon', 'energy', 'luonnonmetsakartat'])(
    'recognizes canonical public applet slug %s',
    (slug) => {
      expect(getAppletRouteSlugInfo(slug)).toMatchObject({
        canonicalSlug: slug,
        isLegacy: false,
      })
    }
  )

  it.each(['carbonmap', 'energymap', 'energiakartta', 'hiilikartta'])(
    'does not recognize removed applet URL prefix %s',
    (slug) => {
      expect(getAppletRouteSlugInfo(slug)).toBeNull()
    }
  )

  it('does not recognize ui-baseline as a public applet slug', () => {
    expect(getAppletRouteSlugInfo('ui-baseline')).toBeNull()
  })
})

describe('request routing decisions', () => {
  describe('selection semantics', () => {
    it('uses runtime full-manifest fallback for empty selection', () => {
      expect(
        decideRequestRouting({ url: url('/'), compiledApplets: [] })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/en',
        search: '',
      })
    })

    it('normalizes case, whitespace, and duplicates before routing', () => {
      expect(
        decideRequestRouting({
          url: url('/'),
          compiledApplets: [' Carbon ', 'CARBON'],
        })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/fi',
        search: '',
      })
    })

    it.each(['unknown', ['carbon', 'energy']])(
      'rejects invalid non-empty selection %p',
      (selection) => {
        const compiledApplets = Array.isArray(selection)
          ? selection
          : [selection]
        expect(() =>
          decideRequestRouting({ url: url('/'), compiledApplets })
        ).toThrow(/unknown applet|exactly one applet/i)
      }
    )

    it.each(Object.keys(appletConf).filter((name) => name !== 'main'))(
      'routes manifest applet %s as a standalone root',
      (namespace) => {
        const defaultLocale =
          appletConf[namespace as keyof typeof appletConf].langs[0]
        expect(
          decideRequestRouting({ url: url('/'), compiledApplets: [namespace] })
        ).toMatchObject({ type: 'redirect', pathname: `/${defaultLocale}` })
      }
    )
  })

  describe('skipped paths', () => {
    it.each(REQUEST_ROUTING_SKIP_PREFIXES)(
      'passes through %s without locale normalization',
      (prefix) => {
        expect(
          decideRequestRouting({ url: url(`${prefix}/asset.js?x=1`) })
        ).toEqual({ type: 'passThrough' })
      }
    )
  })

  describe('main deployment mode', () => {
    const mainMode = [
      'main',
      'energy',
      'carbon',
      'luonnonmetsakartat',
    ]

    it('redirects root to the default main locale', () => {
      expect(
        decideRequestRouting({ url: url('/'), compiledApplets: mainMode })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/en',
        search: '',
      })
    })

    it('preserves query strings when inserting the main locale', () => {
      expect(
        decideRequestRouting({
          url: url('/unknown/path?x=1'),
          compiledApplets: mainMode,
        })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/en/unknown/path',
        search: '?x=1',
      })
    })

    it('replaces invalid main locales while preserving the path and query', () => {
      expect(
        decideRequestRouting({
          url: url('/sv/search?x=1'),
          compiledApplets: mainMode,
        })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/en/search',
        search: '?x=1',
      })
    })

    it.each(['/adds?x=1', '/sv/adds?x=1'])(
      'keeps common localized path %s outside applet rewriting',
      (path) => {
        expect(
          decideRequestRouting({ url: url(path), compiledApplets: mainMode })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      ['/energy/path?x=1', '/fi/energy/path'],
      ['/carbon/plans?x=1', '/fi/carbon/plans'],
      ['/luonnonmetsakartat/admin?x=1', '/fi/luonnonmetsakartat/admin'],
    ])(
      'redirects missing-locale canonical applet path %s to %s',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each([
      '/en/energy?x=1',
      '/fi/carbon?x=1',
      '/fi/carbon/plans?x=1',
      '/fi/carbon/plans/plan-1/areas?x=1',
      '/fi/carbon/report?x=1',
      '/fi/luonnonmetsakartat/admin?x=1',
      '/fi/ui-baseline?x=1',
      '/fi/ui-baseline/dropdowns?x=1',
      '/fi/ui-baseline/tooltips-and-help?x=1',
    ])(
      'passes through localized canonical applet path %s with a supported locale',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      ['/fi/carbon/kaavat?x=1', '/fi/carbon/plans'],
      [
        '/fi/carbon/kaavat/plan-1/alueet?x=1',
        '/fi/carbon/plans/plan-1/areas',
      ],
      ['/fi/carbon/raportti?x=1', '/fi/carbon/report'],
      ['/en/carbon/raportti?x=1', '/fi/carbon/report'],
    ])(
      'normalizes localized carbon subpath %s under canonical applet scope',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each([
      '/fi/luonnonmetsakartat/admin/tuo?x=1',
      '/fi/luonnonmetsakartat/admin/taso/layer-1?x=1',
      '/fi/luonnonmetsakartat/admin/taso/layer-1/asetukset?x=1',
      '/fi/luonnonmetsakartat/admin/taso/layer-1/kuvat?x=1',
    ])(
      'passes through removed Luonnonmetsakartat legacy subpath %s unchanged',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      '/fi/carbonmap/plans?x=1',
      '/fi/energymap/path?x=1',
      '/fi/energiakartta/path?x=1',
      '/fi/hiilikartta/kaavat?x=1',
    ])(
      'does not treat localized removed applet URL prefix %s as an applet path',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      ['/carbonmap/plans?x=1', '/en/carbonmap/plans'],
      ['/energymap/path?x=1', '/en/energymap/path'],
      ['/energiakartta/path?x=1', '/en/energiakartta/path'],
      ['/hiilikartta/kaavat?x=1', '/en/hiilikartta/kaavat'],
    ])(
      'uses normal main locale insertion for missing-locale removed prefix %s',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each([
      '/fi/plans?x=1',
      '/fi/kaavat?x=1',
      '/fi/report?x=1',
      '/fi/raportti?x=1',
      '/fi/admin?x=1',
      '/fi/admin/import?x=1',
      '/fi/admin/taso/layer-1/asetukset?x=1',
      '/en/kaavat?x=1',
    ])('does not redirect localized main root-shaped applet alias %s', (path) => {
      expect(
        decideRequestRouting({
          url: url(path),
          compiledApplets: mainMode,
        })
      ).toEqual({ type: 'passThrough' })
    })

    it.each([
      ['/plans?x=1', '/en/plans'],
      ['/kaavat?x=1', '/en/kaavat'],
      ['/report?x=1', '/en/report'],
      ['/raportti?x=1', '/en/raportti'],
      ['/admin?x=1', '/en/admin'],
      ['/admin/import?x=1', '/en/admin/import'],
    ])(
      'uses normal main locale insertion for missing-locale root alias %s',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: mainMode,
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )
  })

  describe('standalone applet mode', () => {
    it.each([
      ['energy', '/fi'],
      ['carbon', '/fi'],
      ['luonnonmetsakartat', '/fi'],
    ])('redirects root for %s to its default locale', (namespace, pathname) => {
      expect(
        decideRequestRouting({
          url: url('/?x=1'),
          compiledApplets: [namespace],
        })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname,
        search: '?x=1',
      })
    })

    it.each([
      ['/kaavat?x=1', '/fi/plans'],
      ['/carbon/kaavat?x=1', '/fi/plans'],
      ['/carbonmap/plans?x=1', '/fi/carbonmap/plans'],
    ])(
      'redirects missing-locale Hiilikartta standalone path %s to %s',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: ['carbon'],
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each([
      ['/en/kaavat?x=1', '/fi/plans'],
      ['/en/carbon/kaavat?x=1', '/fi/plans'],
      ['/en/carbonmap/plans?x=1', '/fi/carbonmap/plans'],
    ])(
      'redirects unsupported Hiilikartta standalone locale %s to %s',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: ['carbon'],
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each(['/fi/plans', '/fi/plans/plan-1/areas', '/fi/report'])(
      'passes through generated Hiilikartta root-shaped path %s',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(`${path}?x=1`),
            compiledApplets: ['carbon'],
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      ['/fi/kaavat?x=1', '/fi/plans'],
      ['/fi/kaavat/plan-1/alueet?x=1', '/fi/plans/plan-1/areas'],
      ['/fi/raportti?x=1', '/fi/report'],
    ])(
      'redirects standalone Hiilikartta legacy root subpath %s to %s',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: ['carbon'],
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each([
      '/fi',
      '/fi/admin',
      '/fi/admin/import',
      '/fi/admin/layer/layer-1',
      '/fi/admin/layer/layer-1/settings',
      '/fi/admin/layer/layer-1/pictures',
    ])(
      'passes through generated Luonnonmetsakartat root-shaped path %s',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(`${path}?x=1`),
            compiledApplets: ['luonnonmetsakartat'],
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      '/fi/admin/tuo?x=1',
      '/fi/admin/taso/layer-1?x=1',
      '/fi/admin/taso/layer-1/asetukset?x=1',
      '/fi/admin/taso/layer-1/kuvat?x=1',
    ])(
      'passes through removed standalone Luonnonmetsakartat legacy subpath %s unchanged',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: ['luonnonmetsakartat'],
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      ['/admin/tuo?x=1', '/fi/admin/tuo'],
      [
        '/en/admin/taso/layer-1/kuvat?x=1',
        '/fi/admin/taso/layer-1/kuvat',
      ],
    ])(
      'applies generic standalone locale handling to %s without translating its legacy tail',
      (path, pathname) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets: ['luonnonmetsakartat'],
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each(['/fi', '/en'])(
      'passes through generated Energiakartta root path %s',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(`${path}?x=1`),
            compiledApplets: ['energy'],
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it.each([
      ['/fi/carbon/plans?x=1', '/fi/plans'],
      ['/fi/carbon/kaavat?x=1', '/fi/plans'],
      ['/fi/energy/test?x=1', '/fi/test'],
      ['/fi/luonnonmetsakartat?x=1', '/fi'],
      [
        '/fi/luonnonmetsakartat/admin/taso/layer-1/asetukset?x=1',
        '/fi/admin/taso/layer-1/asetukset',
      ],
    ])(
      'strips duplicated canonical applet prefix %s from standalone paths',
      (path, pathname) => {
        const compiledApplets = path.includes('/energy')
          ? ['energy']
          : path.includes('/luonnonmetsakartat')
            ? ['luonnonmetsakartat']
            : ['carbon']

        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets,
          })
        ).toEqual({
          type: 'redirect',
          status: 308,
          pathname,
          search: '?x=1',
        })
      }
    )

    it.each([
      ['/fi/carbonmap/plans?x=1', ['carbon']],
      ['/fi/energymap/test?x=1', ['energy']],
      ['/fi/energiakartta/test?x=1', ['energy']],
      ['/fi/hiilikartta/kaavat?x=1', ['carbon']],
    ])(
      'does not strip removed old prefix %s from standalone paths',
      (path, compiledApplets) => {
        expect(
          decideRequestRouting({
            url: url(path),
            compiledApplets,
          })
        ).toEqual({ type: 'passThrough' })
      }
    )
  })

  describe('configured applet domains in main builds', () => {
    it('does not treat a configured applet domain root as an applet root', () => {
      expect(
        decideRequestRouting({
          url: url('/?x=1', 'hiilikartta.avoin.org'),
          host: 'hiilikartta.avoin.org',
          compiledApplets: ['main', 'carbon'],
        })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/en',
        search: '?x=1',
      })
    })

    it.each([
      '/fi/report?x=1',
      '/fi/kaavat?x=1',
      '/fi/admin?x=1',
      '/fi/carbonmap/kaavat?x=1',
    ])(
      'does not apply applet-domain root alias policy to %s in main mode',
      (path) => {
        expect(
          decideRequestRouting({
            url: url(path, 'hiilikartta.avoin.org'),
            host: 'hiilikartta.avoin.org',
            compiledApplets: ['main', 'carbon'],
          })
        ).toEqual({ type: 'passThrough' })
      }
    )

    it('still applies canonical applet path policy on configured applet domains', () => {
      expect(
        decideRequestRouting({
          url: url('/fi/carbon/kaavat?x=1', 'hiilikartta.avoin.org'),
          host: 'hiilikartta.avoin.org',
          compiledApplets: ['main', 'carbon'],
        })
      ).toEqual({
        type: 'redirect',
        status: 308,
        pathname: '/fi/carbon/plans',
        search: '?x=1',
      })
    })

  })
})

describe('Luonnonmetsakartat canonical and unsupported route normalization', () => {
  const search = '?tab=areas&tab=pictures&q=A%2BB%20C&empty='
  const host = 'luonnonmetsakarta.netlify.app'
  const canonicalTails = [
    '',
    '/admin',
    '/admin/import',
    '/admin/layer/layer-1',
    '/admin/layer/layer-1/settings',
    '/admin/layer/layer-1/pictures',
  ]
  const unsupportedTails = [
    '/admin/tuo',
    '/admin/taso/layer-1',
    '/admin/taso/layer-1/asetukset',
    '/admin/taso/layer-1/kuvat',
  ]

  describe.each([
    {
      mode: 'main',
      compiledApplets: ['main', 'luonnonmetsakartat'],
      root: '/fi/luonnonmetsakartat',
    },
    {
      mode: 'standalone',
      compiledApplets: ['luonnonmetsakartat'],
      root: '/fi',
    },
  ])('$mode', ({ mode, compiledApplets, root }) => {
    const expectDecision = (path: string, target: string | null) => {
      const requestUrl = url(`${path}${search}`, host)
      const decision = decideRequestRouting({
        url: requestUrl,
        compiledApplets,
      })
      if (target === null) {
        expect(decision).toEqual({ type: 'passThrough' })
        return
      }
      expect(decision).toEqual({
        type: 'redirect',
        status: 308,
        pathname: target,
        search,
      })
      if (decision.type !== 'redirect') throw new Error('Expected redirect')
      const targetUrl = getRequestRoutingTargetUrl(requestUrl, decision)
      expect(targetUrl.toString()).toBe(`https://${host}${target}${search}`)
      expect(decideRequestRouting({ url: targetUrl, compiledApplets })).toEqual(
        { type: 'passThrough' }
      )
    }

    it.each(canonicalTails)(
      'normalizes canonical page %s with preserved search and no loop',
      (tail) => {
        expectDecision(`${root}${tail}`, null)
        for (const prefix of ['', '/en', '/sv']) {
          expectDecision(
            `${prefix}/luonnonmetsakartat${tail}`,
            `${root}${tail}`
          )
        }
        if (mode === 'standalone') {
          expectDecision(`/fi/luonnonmetsakartat${tail}`, `/fi${tail}`)
          expectDecision(tail || '/', `/fi${tail}`)
          expectDecision(`/en${tail}`, `/fi${tail}`)
          expectDecision(`/sv${tail}`, `/fi${tail}`)
        }
      }
    )

    it.each(unsupportedTails)(
      'preserves unsupported tail %s for not-found handling',
      (tail) => {
        // Passing normalization does not assert that a page exists or renders 404.
        expectDecision(
          `/fi/luonnonmetsakartat${tail}`,
          mode === 'main' ? null : `/fi${tail}`
        )
        expectDecision(`/luonnonmetsakartat${tail}`, `${root}${tail}`)
        expectDecision(`/en/luonnonmetsakartat${tail}`, `${root}${tail}`)
        expectDecision(`/fi${tail}`, null)
        expectDecision(tail, `${mode === 'main' ? '/en' : '/fi'}${tail}`)
        expectDecision(`/en${tail}`, mode === 'main' ? null : `/fi${tail}`)
      }
    )

    it('selects root behavior from compiled applets, even on the configured public host', () => {
      expect(appletConf.luonnonmetsakartat.domains).toContain(host)
      expectDecision('/', mode === 'main' ? '/en' : '/fi')
      expectDecision('/fi/admin', null)
    })
  })
})
