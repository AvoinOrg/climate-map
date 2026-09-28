const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  generateNetlifyRedirects,
  writeRedirectsFile,
} = require('./writeNetlifyRedirects')
const { parseCompiledApplets } = require('./appletBuildConfig')
const manifestAppletConf = require('../../appletConf.json')

const appletConf = {
  ...manifestAppletConf,
  carbon: {
    ...manifestAppletConf.carbon,
    domains: ['hiilikartta.avoin.org'],
  },
  luonnonmetsakartat: {
    ...manifestAppletConf.luonnonmetsakartat,
    domains: ['luonnonmetsakartat.avoin.org'],
  },
}

const parseGeneratedRules = (redirects) =>
  redirects
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/)
      return { from, to, status }
    })

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const matchSourcePattern = (pattern, value) => {
  const source = escapeRegExp(pattern).replace(/\\\*/g, '(?<splat>.*)')
  return value.match(new RegExp(`^${source}$`))
}

const firstMatchingRule = (redirects, value) => {
  for (const rule of parseGeneratedRules(redirects)) {
    const match = matchSourcePattern(rule.from, value)
    if (!match) continue

    const splat = match.groups?.splat || ''
    return {
      ...rule,
      resolvedTo: rule.to.replace(':splat', splat),
    }
  }

  return null
}

const expectOrderedCarbonRedirects = ({ redirects, fromBase, toBase }) => {
  const expected = [
    [`${fromBase}/kaavat/*/alueet`, `${toBase}/plans/:splat/areas`],
    [`${fromBase}/kaavat`, `${toBase}/plans`],
    [`${fromBase}/kaavat/*`, `${toBase}/plans/:splat`],
    [`${fromBase}/raportti`, `${toBase}/report`],
  ]
  const rules = parseGeneratedRules(redirects)

  for (const [index, [from, to]] of expected.entries()) {
    expect(rules).toContainEqual({ from, to, status: '301!' })
    if (index > 0) {
      expect(
        rules.findIndex(
          ({ from: ruleFrom }) => ruleFrom === expected[index - 1][0]
        )
      ).toBeLessThan(rules.findIndex(({ from: ruleFrom }) => ruleFrom === from))
    }
  }

  expect(
    firstMatchingRule(redirects, `${fromBase}/kaavat/plan-1/alueet`)
  ).toMatchObject({
    from: `${fromBase}/kaavat/*/alueet`,
    resolvedTo: `${toBase}/plans/plan-1/areas`,
    status: '301!',
  })
}

describe('writeNetlifyRedirects', () => {
  const mainBaseUrl = 'https://main.example.netlify.app'
  const standaloneBaseUrl = 'https://hiilikartta-context.example.netlify.app'
  const hiilikarttaDomain = 'https://hiilikartta.avoin.org'

  it('parses compiled applets like the applet build config', () => {
    expect(parseCompiledApplets('main, Carbon,main')).toEqual([
      'main',
      'carbon',
    ])
  })

  it('rejects empty, unknown, and multi-standalone deployment selections', () => {
    for (const compiledApplets of ['', 'main,unknown', 'carbon,energy']) {
      expect(() =>
        generateNetlifyRedirects({
          appletConf,
          baseUrl: mainBaseUrl,
          compiledApplets,
          env: {},
        })
      ).toThrow(/selection is empty|unknown applet|exactly one applet/i)
    }
  })

  it('rejects invalid selection before creating a redirects output path', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avoin-redirects-test-'))
    const outputPath = path.join(root, 'nested', '_redirects')

    try {
      expect(() =>
        writeRedirectsFile({
          appletConf,
          baseUrl: mainBaseUrl,
          compiledApplets: '',
          outputPath,
        })
      ).toThrow(/selection is empty/i)
      expect(fs.existsSync(path.dirname(outputPath))).toBe(false)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('accepts the full manifest and every configured standalone selection', () => {
    const manifestApplets = Object.keys(appletConf)
    const selections = [
      manifestApplets,
      ...manifestApplets
        .filter((applet) => applet !== 'main')
        .map((applet) => [applet]),
    ]

    for (const compiledApplets of selections) {
      expect(() =>
        generateNetlifyRedirects({
          appletConf,
          baseUrl: mainBaseUrl,
          compiledApplets,
          env: {},
        })
      ).not.toThrow()
    }
  })

  it('generates main-mode applet-domain rules only for common and canonical applet paths', () => {
    const redirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: mainBaseUrl,
      compiledApplets: parseCompiledApplets('main,carbon'),
      env: {},
    })

    expect(redirects).toContain(
      `${hiilikarttaDomain}/assets/* ${mainBaseUrl}/assets/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/_build/* ${mainBaseUrl}/_build/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/_serverFn/* ${mainBaseUrl}/_serverFn/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/files/* ${mainBaseUrl}/files/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/lib/* ${mainBaseUrl}/lib/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/api/* ${mainBaseUrl}/api/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/adds/* ${mainBaseUrl}/fi/adds/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/api/* ` +
        `${mainBaseUrl}/api/hiilikartta/:splat 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/carbon/kaavat /fi/carbon/plans 301!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/carbon/raportti /fi/carbon/report 301!`
    )
    expectOrderedCarbonRedirects({
      redirects,
      fromBase: `${hiilikarttaDomain}/fi/carbon`,
      toBase: '/fi/carbon',
    })
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/carbon ${mainBaseUrl}/fi/carbon 200!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/carbon/* ` +
        `${mainBaseUrl}/fi/carbon/:splat 200!`
    )

    expect(redirects).not.toContain('carbonmap')
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi/hiilikartta`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi/plans`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi/kaavat`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi/admin`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi ${mainBaseUrl}`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi/* ${mainBaseUrl}`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/ /fi 301!`)
    expect(redirects).not.toContain(`${hiilikarttaDomain}/* /fi/:splat 301!`)
    expect(redirects).toContain('/* /.netlify/functions/server 200')
    expect(redirects.trim().endsWith('/* /.netlify/functions/server 200')).toBe(
      true
    )
    expect(redirects).not.toContain('_next')
    expect(redirects).not.toContain('.next')

    expect(firstMatchingRule(redirects, `${hiilikarttaDomain}/`)).toBeNull()
    expect(firstMatchingRule(redirects, `${hiilikarttaDomain}/fi`)).toBeNull()
    expect(
      firstMatchingRule(redirects, `${hiilikarttaDomain}/fi/plans`)
    ).toBeNull()
    expect(
      firstMatchingRule(redirects, `${hiilikarttaDomain}/fi/carbon/kaavat`)
    ).toMatchObject({
      from: `${hiilikarttaDomain}/fi/carbon/kaavat`,
      resolvedTo: '/fi/carbon/plans',
      status: '301!',
    })

    expect(redirects.indexOf('/assets/*')).toBeLessThan(
      redirects.indexOf(`${hiilikarttaDomain}/fi/carbon/*`)
    )
    expect(redirects.indexOf('/fi/api/*')).toBeLessThan(
      redirects.indexOf(`${hiilikarttaDomain}/fi/carbon/*`)
    )
    expect(redirects.indexOf('/fi/carbon/kaavat')).toBeLessThan(
      redirects.indexOf(`${hiilikarttaDomain}/fi/carbon/*`)
    )
  })

  it('does not generate Luonnonmetsakartat legacy redirects in main or standalone mode', () => {
    const luonnonmetsakartatDomain = 'https://luonnonmetsakartat.avoin.org'
    const mainRedirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: mainBaseUrl,
      compiledApplets: parseCompiledApplets('main,luonnonmetsakartat'),
      env: {},
    })
    const standaloneRedirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: standaloneBaseUrl,
      compiledApplets: parseCompiledApplets('luonnonmetsakartat'),
      env: {},
    })

    for (const redirects of [mainRedirects, standaloneRedirects]) {
      const legacyRedirectRules = parseGeneratedRules(redirects).filter(
        ({ from, status }) =>
          status === '301!' &&
          (from.includes('/admin/tuo') || from.includes('/admin/taso'))
      )

      expect(legacyRedirectRules).toEqual([])
    }

    expect(
      firstMatchingRule(
        mainRedirects,
        `${luonnonmetsakartatDomain}/fi/luonnonmetsakartat/admin/taso/layer-1/asetukset`
      )
    ).toMatchObject({
      from: `${luonnonmetsakartatDomain}/fi/luonnonmetsakartat/*`,
      resolvedTo: `${mainBaseUrl}/fi/luonnonmetsakartat/admin/taso/layer-1/asetukset`,
      status: '200!',
    })
    expect(
      firstMatchingRule(
        standaloneRedirects,
        `${luonnonmetsakartatDomain}/fi/admin/tuo`
      )
    ).toMatchObject({
      from: `${luonnonmetsakartatDomain}/fi/*`,
      resolvedTo: `${standaloneBaseUrl}/fi/admin/tuo`,
      status: '200!',
    })
    expect(
      firstMatchingRule(
        standaloneRedirects,
        `${luonnonmetsakartatDomain}/fi/luonnonmetsakartat/admin/taso/layer-1/asetukset`
      )
    ).toMatchObject({
      from: `${luonnonmetsakartatDomain}/fi/luonnonmetsakartat/*`,
      resolvedTo: '/fi/admin/taso/layer-1/asetukset',
      status: '301!',
    })
  })

  it('does not generate applet-domain rules for non-public applets', () => {
    const internalDomain = 'https://ui-baseline.example.test'
    const redirects = generateNetlifyRedirects({
      appletConf: {
        ...appletConf,
        'ui-baseline': {
          ...appletConf['ui-baseline'],
          domains: [internalDomain],
        },
      },
      baseUrl: mainBaseUrl,
      compiledApplets: parseCompiledApplets('main,ui-baseline'),
      env: {},
    })

    expect(redirects).not.toContain(internalDomain)
    expect(redirects).toContain('/* /.netlify/functions/server 200')
  })

  it('generates env-backed main-mode applet-domain rules without old prefix or root behavior', () => {
    const energyDomain = 'https://energy.example.test'
    const redirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: mainBaseUrl,
      compiledApplets: parseCompiledApplets('main,energy'),
      env: {
        PUBLIC_APPLET_ENERGY_DOMAIN: energyDomain,
      },
    })

    expect(redirects).toContain(
      `${energyDomain}/en/energy ${mainBaseUrl}/en/energy 200!`
    )
    expect(redirects).toContain(
      `${energyDomain}/en/energy/* ${mainBaseUrl}/en/energy/:splat 200!`
    )
    expect(redirects).not.toContain(`${energyDomain}/en/energymap`)
    expect(redirects).not.toContain(`${energyDomain}/en/energiakartta`)
    expect(redirects).not.toContain(`${energyDomain}/en ${mainBaseUrl}`)
    expect(redirects).not.toContain(`${energyDomain}/en/* ${mainBaseUrl}`)
  })

  it('generates standalone applet-domain root rules and canonical duplicate-prefix redirects', () => {
    const redirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: standaloneBaseUrl,
      compiledApplets: parseCompiledApplets('carbon'),
      env: {},
    })

    expect(redirects).toContain(`${hiilikarttaDomain}/ /fi 301!`)
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/api/* ` +
        `${standaloneBaseUrl}/api/hiilikartta/:splat 200!`
    )
    expect(redirects).toContain(`${hiilikarttaDomain}/fi/kaavat /fi/plans 301!`)
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/carbon/kaavat /fi/plans 301!`
    )
    expectOrderedCarbonRedirects({
      redirects,
      fromBase: `${hiilikarttaDomain}/fi/carbon`,
      toBase: '/fi',
    })
    expectOrderedCarbonRedirects({
      redirects,
      fromBase: `${hiilikarttaDomain}/fi`,
      toBase: '/fi',
    })
    expect(redirects).toContain(`${hiilikarttaDomain}/fi/carbon /fi 301!`)
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/carbon/* /fi/:splat 301!`
    )
    expect(redirects).toContain(
      `${hiilikarttaDomain}/fi/* ${standaloneBaseUrl}/fi/:splat 200!`
    )
    expect(redirects).toContain(`${hiilikarttaDomain}/en/* /fi/:splat 301!`)
    expect(redirects).toContain(`${hiilikarttaDomain}/* /fi/:splat 301!`)

    expect(redirects).not.toContain('carbonmap')
    expect(redirects).not.toContain(`${hiilikarttaDomain}/fi/hiilikartta`)
    expect(redirects).not.toContain('/fi/hiilikartta/:splat')
    expect(
      firstMatchingRule(redirects, `${hiilikarttaDomain}/kaavat`)
    ).toMatchObject({
      from: `${hiilikarttaDomain}/kaavat`,
      resolvedTo: '/fi/plans',
      status: '301!',
    })
    expect(
      firstMatchingRule(redirects, `${hiilikarttaDomain}/fi/carbon/plans`)
    ).toMatchObject({
      from: `${hiilikarttaDomain}/fi/carbon/*`,
      resolvedTo: '/fi/plans',
      status: '301!',
    })
    expect(
      firstMatchingRule(redirects, `${hiilikarttaDomain}/fi/carbonmap/plans`)
    ).toMatchObject({
      from: `${hiilikarttaDomain}/fi/*`,
      resolvedTo: `${standaloneBaseUrl}/fi/carbonmap/plans`,
      status: '200!',
    })
    expect(redirects.indexOf('/fi/carbon/*')).toBeLessThan(
      redirects.indexOf(`${hiilikarttaDomain}/fi/*`)
    )
    expect(redirects.indexOf('/fi/*')).toBeLessThan(
      redirects.indexOf(`${hiilikarttaDomain}/en/*`)
    )
    expect(redirects).not.toContain('luonnonmetsakartat.avoin.org')
    expect(redirects.trim().endsWith('/* /.netlify/functions/server 200')).toBe(
      true
    )
  })

  it('does not generate old standalone prefix redirects for env-backed Energiakartta domains', () => {
    const energyDomain = 'https://energy.example.test'
    const redirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: 'https://energy-context.example.netlify.app',
      compiledApplets: parseCompiledApplets('energy'),
      env: {
        PUBLIC_APPLET_ENERGY_DOMAIN: energyDomain,
      },
    })

    expect(redirects).toContain(`${energyDomain}/en/energy /en 301!`)
    expect(redirects).toContain(`${energyDomain}/en/energy/* /en/:splat 301!`)
    expect(redirects).not.toContain(`${energyDomain}/en/energymap`)
    expect(redirects).not.toContain(`${energyDomain}/en/energiakartta`)
    expect(
      firstMatchingRule(redirects, `${energyDomain}/en/energymap/test`)
    ).toMatchObject({
      from: `${energyDomain}/en/*`,
      resolvedTo:
        'https://energy-context.example.netlify.app/en/energymap/test',
      status: '200!',
    })
  })

  it('keeps a same-site Netlify server fallback when no applet domains are configured', () => {
    const redirects = generateNetlifyRedirects({
      appletConf,
      baseUrl: null,
      compiledApplets: parseCompiledApplets('energy'),
      env: {},
    })

    const rules = parseGeneratedRules(redirects)

    expect(rules).toEqual([
      {
        from: '/*',
        to: '/.netlify/functions/server',
        status: '200',
      },
    ])
    expect(redirects).not.toContain('_next')
    expect(redirects).not.toContain('.next')
  })
})

describe('configured Luonnonmetsakartat Netlify host', () => {
  const host = 'luonnonmetsakarta.netlify.app'
  const baseUrl = 'https://target.example.test'
  const legacyTails = [
    'admin/tuo',
    'admin/taso/layer-1',
    'admin/taso/layer-1/asetukset',
    'admin/taso/layer-1/kuvat',
  ]

  it.each(['main,luonnonmetsakartat', 'luonnonmetsakartat'])(
    'uses the unmodified manifest and ordered adapter rules for %s',
    (compiledApplets) => {
      expect(manifestAppletConf.luonnonmetsakartat.domains).toContain(host)
      const standalone = compiledApplets === 'luonnonmetsakartat'
      const redirects = generateNetlifyRedirects({
        appletConf: manifestAppletConf,
        baseUrl,
        compiledApplets,
        env: {},
      })
      const rules = parseGeneratedRules(redirects)
      for (const protocol of ['https', 'http']) {
        const domain = `${protocol}://${host}`
        const cases = [
          ['/api/layer', `${baseUrl}/api/layer`, '200!'],
          ['/fi/api/layer', `${baseUrl}/api/luonnonmetsakartat/layer`, '200!'],
          ...['assets', '_build', '_serverFn', 'files', 'lib'].map((prefix) => [
            `/${prefix}/asset`,
            `${baseUrl}/${prefix}/asset`,
            '200!',
          ]),
          ...[
            'admin/import',
            'admin/layer/layer-1/settings',
            ...legacyTails,
          ].map((tail) => [
            `/fi/luonnonmetsakartat/${tail}`,
            standalone
              ? `/fi/${tail}`
              : `${baseUrl}/fi/luonnonmetsakartat/${tail}`,
            standalone ? '301!' : '200!',
          ]),
        ]
        if (standalone) {
          cases.push(['/', '/fi', '301!'], ['/en/admin', '/fi/admin', '301!'])
          for (const tail of ['admin', ...legacyTails]) {
            cases.push([`/fi/${tail}`, `${baseUrl}/fi/${tail}`, '200!'])
          }
        } else {
          for (const path of ['/', '/fi', '/fi/admin', '/en/admin']) {
            expect(firstMatchingRule(redirects, `${domain}${path}`)).toBeNull()
          }
        }
        for (const [path, resolvedTo, status] of cases) {
          expect(
            firstMatchingRule(redirects, `${domain}${path}`)
          ).toMatchObject({ resolvedTo, status })
        }
        const ruleIndex = (from) =>
          rules.findIndex((rule) => rule.from === `${domain}${from}`)
        const pageIndex = ruleIndex('/fi/luonnonmetsakartat/*')
        expect(pageIndex).toBeGreaterThan(-1)
        for (const path of [
          '/api/*',
          '/fi/api/*',
          '/assets/*',
          '/_build/*',
          '/_serverFn/*',
          '/files/*',
          '/lib/*',
        ]) {
          expect(ruleIndex(path)).toBeGreaterThan(-1)
          expect(ruleIndex(path)).toBeLessThan(pageIndex)
        }
        if (standalone) {
          expect(pageIndex).toBeLessThan(ruleIndex('/fi/*'))
          expect(ruleIndex('/fi/*')).toBeLessThan(ruleIndex('/en/*'))
        }
      }
      expect(
        rules.filter(({ from, to }) =>
          [from, to].some((value) =>
            /\/(tuo|taso|asetukset|kuvat)(\/|$)/.test(value)
          )
        )
      ).toEqual([])
      expect(rules.at(-1)).toEqual({
        from: '/*',
        to: '/.netlify/functions/server',
        status: '200',
      })
    }
  )

  it('emits no configured-host rules when the applet is unselected', () => {
    const redirects = generateNetlifyRedirects({
      appletConf: manifestAppletConf,
      baseUrl,
      compiledApplets: 'main,carbon',
      env: {},
    })
    expect(redirects).not.toContain(host)
    expect(redirects).not.toContain('luonnonmetsakartat.avoin.org')
  })
})
