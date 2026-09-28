const fs = require('fs')
const os = require('os')
const path = require('path')
const appletConf = require('../../appletConf.json')
const { resolveCompiledAppletConfig } = require('./appletBuildConfig')

const {
  materializeStandaloneAppletRoutes,
  pruneAppletApiStartRoutes,
  pruneAppletSourceFolders,
  pruneCanonicalStartAppletRoutes,
  pruneStandaloneMainStartRoutes,
} = require('./prebuildFolderPrune')

const makeTempProject = () =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'avoin-prune-test-'))

const routeFile = (routeId) => [
  "import { createFileRoute } from '@tanstack/react-router'",
  '',
  'export const Route = createFileRoute(',
  `  '${routeId}'`,
  ')({})',
  '',
].join('\n')

const writeFile = ({ root, relativePath, content = '' }) => {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  return filePath
}

const writeDir = ({ root, relativePath }) => {
  fs.mkdirSync(path.join(root, relativePath), { recursive: true })
}

const exists = ({ root, relativePath }) =>
  fs.existsSync(path.join(root, relativePath))

const read = ({ root, relativePath }) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8')

const appletRoute = (...segments) =>
  path.join(
    'src',
    'routes',
    '$locale',
    '_map',
    '(applets)',
    ...segments
  )

const mapRoute = (...segments) =>
  path.join('src', 'routes', '$locale', '_map', ...segments)

const apiRoute = (...segments) => path.join('src', 'routes', 'api', ...segments)

const standaloneRoute = (...segments) => mapRoute('(standalone)', ...segments)

const makeBuildConfig = ({ includesMain, selected }) =>
  resolveCompiledAppletConfig({
    appletConf,
    raw: includesMain ? ['main', ...selected] : selected,
    scriptName: 'prebuildFolderPrune.test',
  })

const writeCommonFixture = (root) => {
  for (const namespace of [
    'main',
    'forests',
    'energy',
    'carbon',
    'luonnonmetsakartat',
    'ui-baseline',
  ]) {
    writeDir({ root, relativePath: path.join('src', 'applets', namespace) })
  }

  writeFile({
    root,
    relativePath: mapRoute('index.tsx'),
    content: routeFile('/$locale/_map/'),
  })
  writeFile({
    root,
    relativePath: mapRoute('route.tsx'),
    content: routeFile('/$locale/_map'),
  })
  writeFile({
    root,
    relativePath: apiRoute('hiilikartta', '$.ts'),
    content: 'export const Route = {}',
  })
  writeFile({
    root,
    relativePath: apiRoute('luonnonmetsakartat', '$.ts'),
    content: 'export const Route = {}',
  })

  writeFile({
    root,
    relativePath: appletRoute('forests', 'route.tsx'),
    content: routeFile('/$locale/_map/(applets)/forests'),
  })
  writeFile({
    root,
    relativePath: appletRoute('energy', 'route.tsx'),
    content: routeFile('/$locale/_map/(applets)/energy'),
  })
  writeFile({
    root,
    relativePath: appletRoute('energy', 'index.tsx'),
    content: routeFile('/$locale/_map/(applets)/energy/'),
  })
  writeFile({
    root,
    relativePath: appletRoute('carbon', 'route.tsx'),
    content: routeFile('/$locale/_map/(applets)/carbon'),
  })
  writeFile({
    root,
    relativePath: appletRoute('carbon', 'index.tsx'),
    content: routeFile('/$locale/_map/(applets)/carbon/'),
  })
  writeFile({
    root,
    relativePath: appletRoute('carbon', 'plans', 'route.tsx'),
    content: routeFile('/$locale/_map/(applets)/carbon/plans'),
  })
  writeFile({
    root,
    relativePath: appletRoute(
      'carbon',
      'plans',
      '$planId',
      'areas.tsx'
    ),
    content: routeFile(
      '/$locale/_map/(applets)/carbon/plans/$planId/areas'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute('carbon', 'report.tsx'),
    content: routeFile('/$locale/_map/(applets)/carbon/report'),
  })
  writeFile({
    root,
    relativePath: appletRoute('luonnonmetsakartat', 'route.tsx'),
    content: routeFile('/$locale/_map/(applets)/luonnonmetsakartat'),
  })
  writeFile({
    root,
    relativePath: appletRoute('luonnonmetsakartat', 'index.tsx'),
    content: routeFile('/$locale/_map/(applets)/luonnonmetsakartat/'),
  })
  writeFile({
    root,
    relativePath: appletRoute('luonnonmetsakartat', 'admin', 'route.tsx'),
    content: routeFile(
      '/$locale/_map/(applets)/luonnonmetsakartat/admin'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute('luonnonmetsakartat', 'admin', 'index.tsx'),
    content: routeFile('/$locale/_map/(applets)/luonnonmetsakartat/admin/'),
  })
  writeFile({
    root,
    relativePath: appletRoute('luonnonmetsakartat', 'admin', 'import.tsx'),
    content: routeFile(
      '/$locale/_map/(applets)/luonnonmetsakartat/admin/import'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute(
      'luonnonmetsakartat',
      'admin',
      'layer',
      '$folayerIdSlug',
      'route.tsx'
    ),
    content: routeFile(
      '/$locale/_map/(applets)/luonnonmetsakartat/admin/layer/$folayerIdSlug'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute(
      'luonnonmetsakartat',
      'admin',
      'layer',
      '$folayerIdSlug',
      'index.tsx'
    ),
    content: routeFile(
      '/$locale/_map/(applets)/luonnonmetsakartat/admin/layer/$folayerIdSlug/'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute(
      'luonnonmetsakartat',
      'admin',
      'layer',
      '$folayerIdSlug',
      'settings.tsx'
    ),
    content: routeFile(
      '/$locale/_map/(applets)/luonnonmetsakartat/admin/layer/$folayerIdSlug/settings'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute(
      'luonnonmetsakartat',
      'admin',
      'layer',
      '$folayerIdSlug',
      'pictures.tsx'
    ),
    content: routeFile(
      '/$locale/_map/(applets)/luonnonmetsakartat/admin/layer/$folayerIdSlug/pictures'
    ),
  })
  writeFile({
    root,
    relativePath: appletRoute('ui-baseline', 'route.tsx'),
    content: routeFile('/$locale/_map/(applets)/ui-baseline'),
  })
  writeFile({
    root,
    relativePath: appletRoute('ui-baseline', 'index.tsx'),
    content: routeFile('/$locale/_map/(applets)/ui-baseline/'),
  })
  writeFile({
    root,
    relativePath: appletRoute('ui-baseline', 'dropdowns.tsx'),
    content: routeFile('/$locale/_map/(applets)/ui-baseline/dropdowns'),
  })
}

const runPruneTopology = ({ root, buildConfig }) => {
  const materialized = materializeStandaloneAppletRoutes({
    buildConfig,
    projectRoot: root,
  })
  const removedSource = pruneAppletSourceFolders({
    buildConfig,
    projectRoot: root,
  })
  const removedCanonical = pruneCanonicalStartAppletRoutes({
    buildConfig,
    projectRoot: root,
  })
  const removedStandaloneMain = pruneStandaloneMainStartRoutes({
    buildConfig,
    projectRoot: root,
  })
  const removedApis = pruneAppletApiStartRoutes({
    buildConfig,
    projectRoot: root,
  })

  return {
    materialized,
    removedApis,
    removedCanonical,
    removedSource,
    removedStandaloneMain,
  }
}

describe('prebuildFolderPrune standalone route materialization', () => {
  let root

  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true })
    root = undefined
  })

  it('materializes Hiilikartta root-shaped routes and prunes duplicate topology', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    const result = runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: false,
        selected: ['carbon'],
      }),
    })

    expect(result.materialized.promotedFiles).toEqual(
      expect.arrayContaining([
        standaloneRoute('route.tsx'),
        standaloneRoute('plans', 'route.tsx'),
        standaloneRoute('plans', '$planId', 'areas.tsx'),
        standaloneRoute('report.tsx'),
      ])
    )
    expect(read({ root, relativePath: standaloneRoute('route.tsx') })).toContain(
      "createFileRoute('/$locale/_map/(standalone)')"
    )
    expect(
      read({ root, relativePath: standaloneRoute('plans', 'route.tsx') })
    ).toContain("createFileRoute('/$locale/_map/(standalone)/plans')")
    expect(
      read({
        root,
        relativePath: standaloneRoute(
          'plans',
          '$planId',
          'areas.tsx'
        ),
      })
    ).toContain(
      "createFileRoute('/$locale/_map/(standalone)/plans/$planId/areas')"
    )
    expect(exists({ root, relativePath: appletRoute('carbon') })).toBe(false)
    expect(exists({ root, relativePath: mapRoute('index.tsx') })).toBe(false)
    expect(result.removedStandaloneMain).toEqual([
      mapRoute('index.tsx'),
    ])
    expect(exists({ root, relativePath: mapRoute('plans') })).toBe(false)
    expect(exists({ root, relativePath: apiRoute('hiilikartta') })).toBe(true)
    expect(exists({ root, relativePath: apiRoute('luonnonmetsakartat') })).toBe(
      false
    )
    expect(
      exists({
        root,
        relativePath: path.join('src', 'applets', 'carbon'),
      })
    ).toBe(true)
    expect(
      exists({
        root,
        relativePath: path.join('src', 'applets', 'energy'),
      })
    ).toBe(false)
  })

  it('materializes canonical Luonnonmetsakartat routes and keeps only selected API routes', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    const realAppletPath = appletRoute('luonnonmetsakartat')
    const sourceRoot = path.resolve(__dirname, '../..', realAppletPath)
    fs.cpSync(sourceRoot, path.join(root, realAppletPath), { recursive: true })

    runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: false,
        selected: ['luonnonmetsakartat'],
      }),
    })

    const canonicalRoutes = [
      ['route.tsx', '/$locale/_map/(standalone)'],
      ['index.tsx', '/$locale/_map/(standalone)/'],
      [path.join('admin', 'route.tsx'), '/$locale/_map/(standalone)/admin'],
      [path.join('admin', 'index.tsx'), '/$locale/_map/(standalone)/admin/'],
      [
        path.join('admin', 'import.tsx'),
        '/$locale/_map/(standalone)/admin/import',
      ],
      [
        path.join('admin', 'layer', '$folayerIdSlug', 'route.tsx'),
        '/$locale/_map/(standalone)/admin/layer/$folayerIdSlug',
      ],
      [
        path.join('admin', 'layer', '$folayerIdSlug', 'index.tsx'),
        '/$locale/_map/(standalone)/admin/layer/$folayerIdSlug/',
      ],
      [
        path.join('admin', 'layer', '$folayerIdSlug', 'settings.tsx'),
        '/$locale/_map/(standalone)/admin/layer/$folayerIdSlug/settings',
      ],
      [
        path.join('admin', 'layer', '$folayerIdSlug', 'pictures.tsx'),
        '/$locale/_map/(standalone)/admin/layer/$folayerIdSlug/pictures',
      ],
    ]

    for (const [relativePath, routeId] of canonicalRoutes) {
      expect(
        read({ root, relativePath: standaloneRoute(relativePath) })
      ).toContain(`createFileRoute('${routeId}')`)
      const original = fs.readFileSync(
        path.join(sourceRoot, relativePath),
        'utf8'
      )
      // Promotion changes only the route literal; keys, dynamic IDs, guards,
      // components and metadata remain the actual production declarations.
      expect(read({ root, relativePath: standaloneRoute(relativePath) })).toBe(
        original.replace(
          /createFileRoute\(\s*'[^']+'\s*\)/,
          `createFileRoute('${routeId}')`
        )
      )
    }

    expect(
      exists({ root, relativePath: standaloneRoute('admin', 'tuo.tsx') })
    ).toBe(false)
    expect(
      exists({ root, relativePath: standaloneRoute('admin', 'taso') })
    ).toBe(false)
    expect(exists({ root, relativePath: mapRoute('admin') })).toBe(false)
    expect(
      exists({ root, relativePath: appletRoute('luonnonmetsakartat') })
    ).toBe(false)
    expect(exists({ root, relativePath: apiRoute('luonnonmetsakartat') })).toBe(
      true
    )
    expect(exists({ root, relativePath: apiRoute('hiilikartta') })).toBe(false)
  })

  it('retains actual Luonnonmetsakartat page/API sources in a selected main build', () => {
    root = makeTempProject()
    writeCommonFixture(root)
    const projectRoot = path.resolve(__dirname, '../..')
    const pageRoot = appletRoute('luonnonmetsakartat')
    const apiFile = apiRoute('luonnonmetsakartat', '$.ts')
    fs.cpSync(path.join(projectRoot, pageRoot), path.join(root, pageRoot), {
      recursive: true,
    })
    fs.copyFileSync(path.join(projectRoot, apiFile), path.join(root, apiFile))
    const result = runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: true,
        selected: ['luonnonmetsakartat'],
      }),
    })
    expect(result.materialized.promotedFiles).toEqual([])
    expect(exists({ root, relativePath: standaloneRoute() })).toBe(false)
    expect(exists({ root, relativePath: mapRoute('index.tsx') })).toBe(true)
    for (const relativePath of fs.readdirSync(
      path.join(projectRoot, pageRoot),
      { recursive: true }
    )) {
      if (!relativePath.endsWith('.tsx')) continue
      expect(
        read({ root, relativePath: path.join(pageRoot, relativePath) })
      ).toBe(
        fs.readFileSync(path.join(projectRoot, pageRoot, relativePath), 'utf8')
      )
    }
    expect(read({ root, relativePath: apiFile })).toBe(
      fs.readFileSync(path.join(projectRoot, apiFile), 'utf8')
    )
    expect(
      exists({
        root,
        relativePath: path.join('src', 'applets', 'luonnonmetsakartat'),
      })
    ).toBe(true)
    expect(exists({ root, relativePath: apiRoute('hiilikartta') })).toBe(false)
    expect(exists({ root, relativePath: appletRoute('carbon') })).toBe(false)
    expect(
      exists({
        root,
        relativePath: appletRoute('luonnonmetsakartat', 'admin', 'tuo.tsx'),
      })
    ).toBe(false)
    expect(
      exists({
        root,
        relativePath: appletRoute('luonnonmetsakartat', 'admin', 'taso'),
      })
    ).toBe(false)
  })

  it('materializes Energiakartta from energy and does not promote the legacy folder', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: false,
        selected: ['energy'],
      }),
    })

    expect(read({ root, relativePath: standaloneRoute('route.tsx') })).toContain(
      "createFileRoute('/$locale/_map/(standalone)')"
    )
    expect(read({ root, relativePath: standaloneRoute('index.tsx') })).toContain(
      "createFileRoute('/$locale/_map/(standalone)/')"
    )
    expect(exists({ root, relativePath: appletRoute('energy') })).toBe(false)
    expect(exists({ root, relativePath: appletRoute('energiakartta') })).toBe(
      false
    )
    expect(exists({ root, relativePath: mapRoute('index.tsx') })).toBe(false)
    expect(exists({ root, relativePath: apiRoute('hiilikartta') })).toBe(false)
    expect(exists({ root, relativePath: apiRoute('luonnonmetsakartat') })).toBe(
      false
    )
  })

  it('keeps canonical selected routes and avoids standalone routes in full-app builds', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    const result = runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: true,
        selected: ['carbon'],
      }),
    })

    expect(exists({ root, relativePath: standaloneRoute() })).toBe(false)
    expect(exists({ root, relativePath: appletRoute('carbon') })).toBe(true)
    expect(exists({ root, relativePath: appletRoute('hiilikartta') })).toBe(
      false
    )
    expect(exists({ root, relativePath: appletRoute('energy') })).toBe(false)
    expect(exists({ root, relativePath: appletRoute('forests') })).toBe(true)
    expect(
      exists({ root, relativePath: path.join('src', 'applets', 'forests') })
    ).toBe(true)
    expect(exists({ root, relativePath: mapRoute('plans') })).toBe(false)
    expect(exists({ root, relativePath: mapRoute('kaavat') })).toBe(false)
    expect(exists({ root, relativePath: mapRoute('index.tsx') })).toBe(true)
    expect(result.removedStandaloneMain).toEqual([])
    expect(exists({ root, relativePath: mapRoute('admin') })).toBe(false)
    expect(exists({ root, relativePath: apiRoute('hiilikartta') })).toBe(true)
    expect(exists({ root, relativePath: apiRoute('luonnonmetsakartat') })).toBe(
      false
    )
  })

  it('removes ui-baseline source and routes when it is not selected in a main build', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: true,
        selected: ['energy'],
      }),
    })

    expect(
      exists({
        root,
        relativePath: path.join('src', 'applets', 'ui-baseline'),
      })
    ).toBe(false)
    expect(exists({ root, relativePath: appletRoute('ui-baseline') })).toBe(
      false
    )
  })

  it('keeps ui-baseline source and routes when it is selected in a main build', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: true,
        selected: ['ui-baseline'],
      }),
    })

    expect(
      exists({
        root,
        relativePath: path.join('src', 'applets', 'ui-baseline'),
      })
    ).toBe(true)
    expect(exists({ root, relativePath: appletRoute('ui-baseline') })).toBe(
      true
    )
    expect(exists({ root, relativePath: appletRoute('energy') })).toBe(false)
  })

  it('materializes ui-baseline as an internal standalone route', () => {
    root = makeTempProject()
    writeCommonFixture(root)

    runPruneTopology({
      root,
      buildConfig: makeBuildConfig({
        includesMain: false,
        selected: ['ui-baseline'],
      }),
    })

    expect(read({ root, relativePath: standaloneRoute('route.tsx') })).toContain(
      "createFileRoute('/$locale/_map/(standalone)')"
    )
    expect(
      exists({
        root,
        relativePath: path.join('src', 'applets', 'ui-baseline'),
      })
    ).toBe(true)
    expect(exists({ root, relativePath: appletRoute('ui-baseline') })).toBe(
      false
    )
  })

  it('keeps every selected manifest applet in the full main build', () => {
    root = makeTempProject()
    writeCommonFixture(root)
    const selected = Object.keys(appletConf).filter((applet) => applet !== 'main')

    runPruneTopology({
      root,
      buildConfig: makeBuildConfig({ includesMain: true, selected }),
    })

    for (const applet of selected) {
      expect(
        exists({ root, relativePath: path.join('src', 'applets', applet) })
      ).toBe(true)
      expect(exists({ root, relativePath: appletRoute(applet) })).toBe(true)
    }
    expect(exists({ root, relativePath: appletRoute('forests') })).toBe(true)
  })
})
