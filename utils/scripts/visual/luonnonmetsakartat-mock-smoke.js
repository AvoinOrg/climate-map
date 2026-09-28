#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const {
  BROWSER_MODE_XVFB_WEBGL,
  SUPPORTED_BROWSER_MODES,
  assertWebGLAvailable,
  getChromiumLaunchOptions,
  maybeReexecInsideXvfb,
  resolveBrowserMode,
} = require('./browserRuntime')
const {
  buildPlaywrightContextOptions,
  waitForAppHydration,
} = require('./playwrightContext')
const {
  buildLuonnonmetsakartatMockQuery,
  getLuonnonmetsakartatMockSourceLiterals,
} = require('../../visual/luonnonmetsakartatMockScenarios')

const DEFAULT_BASE_URL = 'http://127.0.0.1:6900'
const DEFAULT_TIMEOUT_MS = 60000
const DEFAULT_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }
const PREFLIGHT_DONE_ENV_KEY =
  'AVOIN_MAP_LUONNONMETSAKARTAT_SMOKE_PREFLIGHT_DONE'
const FIXTURE_DIR = path.resolve(process.cwd(), 'test-data/luonnonmetsakartat')
const VALID_LAYER_FIXTURE_PATH = path.join(FIXTURE_DIR, 'valid-layer.zip')
const DUPLICATE_ID_LAYER_FIXTURE_PATH = path.join(
  FIXTURE_DIR,
  'duplicate-id-layer.zip'
)
const MOCK_LAYER_NAME = 'Mock visible forest layer'
const IMPORT_LAYER_NAME_PREFIX = 'Smoke imported forest layer'
const REQUIRED_COLUMNS = [
  'id',
  'nimi',
  'kunta',
  'maakunta',
  'kuvaus',
  'pinta_ala',
]

const HELP_TEXT = `\
Usage:
  node utils/scripts/visual/luonnonmetsakartat-mock-smoke.js [--base-url=${DEFAULT_BASE_URL}] [--no-start]

Options:
  --base-url <url>       Already-running TanStack Start dev server URL (default: ${DEFAULT_BASE_URL})
  --browser-mode <mode>  Browser mode: ${SUPPORTED_BROWSER_MODES.join('|')} (default: ${BROWSER_MODE_XVFB_WEBGL})
  --timeout <ms>         Timeout per major step (default: ${DEFAULT_TIMEOUT_MS})
  --no-start             Fail if the dev server is unreachable; never start one
  --help                 Show this help

Behavior:
  This smoke utility only reuses an already-running mock-enabled dev server. It
  creates a fresh Chromium context, uploads committed shapefile ZIP fixtures from
  test-data/luonnonmetsakartat, and exercises canonical /fi/luonnonmetsakartat
  public/admin routes, import, settings, and pictures.
`

const parseArgs = (argv) => {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    browserMode: BROWSER_MODE_XVFB_WEBGL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    noStart: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (token === '--help' || token === '-h') {
      args.help = true
      continue
    }

    if (token === '--no-start') {
      args.noStart = true
      continue
    }

    if (token.startsWith('--base-url=')) {
      args.baseUrl = token.slice('--base-url='.length)
      continue
    }
    if (token === '--base-url') {
      args.baseUrl = argv[i + 1]
      i++
      continue
    }

    if (token.startsWith('--browser-mode=')) {
      args.browserMode = token.slice('--browser-mode='.length)
      continue
    }
    if (token === '--browser-mode') {
      args.browserMode = argv[i + 1]
      i++
      continue
    }

    if (token.startsWith('--timeout=')) {
      args.timeoutMs = Number(token.slice('--timeout='.length))
      continue
    }
    if (token === '--timeout') {
      args.timeoutMs = Number(argv[i + 1])
      i++
      continue
    }

    throw new Error(`Unknown argument: ${token}`)
  }

  args.baseUrl = trimTrailingSlash(args.baseUrl || DEFAULT_BASE_URL)

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    throw new Error(`Invalid --timeout value: ${args.timeoutMs}`)
  }

  return args
}

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

const getBrowserNavigationBaseUrl = (baseUrl) => {
  try {
    const url = new URL(baseUrl)
    if (url.hostname === '127.0.0.1') {
      url.hostname = 'localhost'
      return trimTrailingSlash(url.toString())
    }
  } catch {
    // Keep non-standard values unchanged; URL construction will report errors.
  }

  return trimTrailingSlash(baseUrl)
}

const buildAbsoluteUrl = ({ baseUrl, path: routePath }) =>
  `${trimTrailingSlash(baseUrl)}${routePath}`

const buildSmokeUrl = ({
  baseUrl,
  path: routePath,
  queryParams = {},
  sourceLiterals = getLuonnonmetsakartatMockSourceLiterals(),
  state,
}) =>
  buildAbsoluteUrl({
    baseUrl,
    path: `${routePath}${buildLuonnonmetsakartatMockQuery({
      queryParams,
      sourceLiterals,
      state,
    })}`,
  })

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isServerAvailable = async (baseUrl) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    })
    return response.status > 0
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

const assertServerAvailable = async ({ baseUrl, noStart }) => {
  if (await isServerAvailable(baseUrl)) {
    return
  }

  if (noStart) {
    throw new Error(
      `Dev server is unreachable at ${baseUrl}; --no-start was set, so luonnonmetsakartat-mock-smoke will not start it.`
    )
  }

  throw new Error(
    `Dev server is unreachable at ${baseUrl}. luonnonmetsakartat-mock-smoke only uses an already-running dev server and will not start one.`
  )
}

const requireOrThrow = ({ id, installHint }) => {
  try {
    return require(id)
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `Missing dependency "${id}". Run \`yarn install\` and then ${
          installHint || '`yarn visual:install`'
        }.`
      )
    }
    throw error
  }
}

const getAuthenticatedQueryParams = (sourceLiterals) => ({
  [sourceLiterals.MOCK_AUTH_QUERY_PARAM]: 'authenticated',
})

const isFatalConsoleError = (message) =>
  [
    'Luonnonmetsakartat mock scenario bootstrap failed',
    'Missing access token for Luonnonmetsakartat',
    'Mock admin authorization required',
    'Mock admin access rejected',
    'Unsupported Luonnonmetsakartat mock API endpoint',
    'Unsupported Luonnonmetsakartat mock GeoServer endpoint',
    'Luonnonmetsakartat mock API cannot be enabled',
    'Luonnonmetsakartat mock scenarios cannot be enabled',
    'Mock auth cannot be enabled',
  ].some((pattern) => message.includes(pattern))

const createPageIssueCollector = (page) => {
  const pageErrors = []
  const consoleErrors = []

  page.on('pageerror', (error) => {
    pageErrors.push(error.message || String(error))
  })

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return
    }

    consoleErrors.push(message.text())
  })

  return {
    assertNoFatalIssues: () => {
      if (pageErrors.length > 0) {
        throw new Error(`Browser page error: ${pageErrors.join('\n')}`)
      }

      const fatalConsoleErrors = consoleErrors.filter(isFatalConsoleError)
      if (fatalConsoleErrors.length > 0) {
        throw new Error(
          `Fatal browser console error: ${fatalConsoleErrors.join('\n')}`
        )
      }
    },
    getConsoleErrors: () => [...consoleErrors],
  }
}

const assertPathname = async ({ page, expectedPathname }) => {
  const currentUrl = new URL(page.url())
  if (currentUrl.pathname !== expectedPathname) {
    throw new Error(
      `Expected pathname ${expectedPathname}, got ${currentUrl.pathname} (${page.url()})`
    )
  }
}

const gotoAndAssertOk = async ({ page, url, timeoutMs }) => {
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  })
  const status = response ? response.status() : null
  if (status && status >= 400) {
    throw new Error(`Route returned HTTP ${status} for ${url}`)
  }

  await waitForAppHydration({
    page,
    timeoutMs,
    minBodyHeight: 100,
    settleMs: 250,
  })

  await page.waitForFunction(
    () => {
      const bodyText = document.body?.innerText?.trim() ?? ''
      return (
        bodyText.length > 0 ||
        !!document.querySelector(
          '#map, main, .layout-container, .map-actions-wrapper, [data-slot]'
        )
      )
    },
    null,
    { timeout: timeoutMs }
  )

  return response
}

const assertMockBootstrapAvailable = async ({ page, timeoutMs }) => {
  await page.waitForFunction(
    () =>
      typeof window.__avoinLuonnonmetsakartatMocks?.reset === 'function' &&
      typeof window.__avoinLuonnonmetsakartatMocks?.seed === 'function',
    null,
    { timeout: timeoutMs }
  )
}

const waitForApiResponse = async ({
  page,
  method,
  pathPart,
  status = 200,
  timeoutMs,
}) =>
  page.waitForResponse(
    (response) => {
      const request = response.request()
      const requestUrl = new URL(response.url())
      return (
        request.method().toUpperCase() === method.toUpperCase() &&
        requestUrl.pathname.includes(pathPart) &&
        response.status() === status
      )
    },
    { timeout: timeoutMs }
  )

const waitForVisible = async ({ locator, timeoutMs }) => {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs })
  return locator
}

const fillTextbox = async ({ page, name, value, timeoutMs }) => {
  const textbox = page.getByRole('textbox', { name }).first()
  await waitForVisible({ locator: textbox, timeoutMs })
  await textbox.fill(value)
}

const createAutoFileChooserUpload = ({ page, fixturePath }) => {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Shapefile fixture not found: ${fixturePath}`)
  }

  let handled = false
  let resolveUpload
  let rejectUpload
  const uploadPromise = new Promise((resolve, reject) => {
    resolveUpload = resolve
    rejectUpload = reject
  })

  const handler = async (fileChooser) => {
    handled = true
    try {
      await fileChooser.setFiles(fixturePath)
      resolveUpload()
    } catch (error) {
      rejectUpload(error)
    }
  }

  page.once('filechooser', handler)

  return {
    dispose: () => {
      if (!handled) {
        page.off('filechooser', handler)
      }
    },
    isHandled: () => handled,
    waitForAutoUpload: async (timeoutMs = 500) => {
      await Promise.race([
        uploadPromise.catch(() => undefined),
        delay(timeoutMs),
      ])
      return handled
    },
    waitForSettled: () => (handled ? uploadPromise : Promise.resolve()),
  }
}

const uploadShapefileFixture = async ({
  autoFileChooserUpload,
  page,
  fixturePath,
  timeoutMs,
}) => {
  if (autoFileChooserUpload) {
    const autoHandled = await autoFileChooserUpload.waitForAutoUpload(500)

    if (autoHandled) {
      await autoFileChooserUpload.waitForSettled()
      return
    }

    autoFileChooserUpload.dispose()
  }

  await page
    .locator('input[type="file"][accept=".zip"]')
    .first()
    .setInputFiles(fixturePath, { timeout: timeoutMs })
}

const assertDetectedColumns = async ({ page, timeoutMs }) => {
  await page.waitForFunction(
    (columns) => {
      const selectedValues = Array.from(
        document.querySelectorAll('[data-slot="trigger"] [data-slot="value"]')
      ).map((element) => element.textContent?.trim() ?? '')

      return columns.every((column) => selectedValues.includes(column))
    },
    REQUIRED_COLUMNS,
    { timeout: timeoutMs }
  )
}

const clickButtonByName = async ({ page, name, timeoutMs }) => {
  const button = page.getByRole('button', { name }).first()
  await waitForVisible({ locator: button, timeoutMs })
  await button.click()
  return button
}

const runPublicRouteSmoke = async ({ page, baseUrl, timeoutMs }) => {
  await gotoAndAssertOk({
    page,
    url: buildSmokeUrl({
      baseUrl,
      path: '/fi/luonnonmetsakartat',
      state: 'public-layers',
    }),
    timeoutMs,
  })
  await assertMockBootstrapAvailable({ page, timeoutMs })
  await assertPathname({ page, expectedPathname: '/fi/luonnonmetsakartat' })
  await waitForVisible({
    locator: page.getByText(MOCK_LAYER_NAME, { exact: true }).first(),
    timeoutMs,
  })
}

const runAdminRouteSmoke = async ({
  page,
  baseUrl,
  sourceLiterals,
  timeoutMs,
}) => {
  await gotoAndAssertOk({
    page,
    url: buildSmokeUrl({
      baseUrl,
      path: '/fi/luonnonmetsakartat/admin',
      state: 'admin-layers',
      queryParams: getAuthenticatedQueryParams(sourceLiterals),
      sourceLiterals,
    }),
    timeoutMs,
  })
  await assertMockBootstrapAvailable({ page, timeoutMs })
  await assertPathname({
    page,
    expectedPathname: '/fi/luonnonmetsakartat/admin',
  })
  await waitForVisible({
    locator: page.getByRole('link', { name: `Open ${MOCK_LAYER_NAME}` }),
    timeoutMs,
  })
}

const runValidImportSmoke = async ({
  page,
  baseUrl,
  sourceLiterals,
  timeoutMs,
}) => {
  const autoFileChooserUpload = createAutoFileChooserUpload({
    page,
    fixturePath: VALID_LAYER_FIXTURE_PATH,
  })

  await gotoAndAssertOk({
    page,
    url: buildSmokeUrl({
      baseUrl,
      path: '/fi/luonnonmetsakartat/admin/import',
      state: 'admin-layers',
      queryParams: getAuthenticatedQueryParams(sourceLiterals),
      sourceLiterals,
    }),
    timeoutMs,
  })
  await assertMockBootstrapAvailable({ page, timeoutMs })
  await assertPathname({
    page,
    expectedPathname: '/fi/luonnonmetsakartat/admin/import',
  })

  await uploadShapefileFixture({
    autoFileChooserUpload,
    page,
    fixturePath: VALID_LAYER_FIXTURE_PATH,
    timeoutMs,
  })
  await assertDetectedColumns({ page, timeoutMs })

  const layerName = `${IMPORT_LAYER_NAME_PREFIX} ${Date.now()}`
  await fillTextbox({
    page,
    name: 'Karttatason nimi',
    value: layerName,
    timeoutMs,
  })

  const createResponsePromise = waitForApiResponse({
    page,
    method: 'POST',
    pathPart: '/api/luonnonmetsakartat/layer',
    status: 201,
    timeoutMs,
  })
  await clickButtonByName({
    page,
    name: 'Accept imported forest layer',
    timeoutMs,
  })
  const createResponse = await createResponsePromise
  const createPayload = await createResponse.json().catch(() => ({}))
  const createdLayerId = createPayload.id

  if (!createdLayerId || typeof createdLayerId !== 'string') {
    throw new Error('Mock layer create response did not include a layer id')
  }

  await page.waitForURL(
    (url) =>
      url.pathname === `/fi/luonnonmetsakartat/admin/layer/${createdLayerId}`,
    { timeout: timeoutMs }
  )

  return { createdLayerId }
}

const runDuplicateImportSmoke = async ({
  page,
  baseUrl,
  sourceLiterals,
  timeoutMs,
}) => {
  const autoFileChooserUpload = createAutoFileChooserUpload({
    page,
    fixturePath: DUPLICATE_ID_LAYER_FIXTURE_PATH,
  })

  await gotoAndAssertOk({
    page,
    url: buildSmokeUrl({
      baseUrl,
      path: '/fi/luonnonmetsakartat/admin/import',
      state: 'admin-layers',
      queryParams: getAuthenticatedQueryParams(sourceLiterals),
      sourceLiterals,
    }),
    timeoutMs,
  })
  await assertMockBootstrapAvailable({ page, timeoutMs })

  await uploadShapefileFixture({
    autoFileChooserUpload,
    page,
    fixturePath: DUPLICATE_ID_LAYER_FIXTURE_PATH,
    timeoutMs,
  })
  await assertDetectedColumns({ page, timeoutMs })

  await fillTextbox({
    page,
    name: 'Karttatason nimi',
    value: `${IMPORT_LAYER_NAME_PREFIX} duplicate`,
    timeoutMs,
  })

  const createRequests = []
  const observeCreate = (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/luonnonmetsakartat/layer'
    ) {
      createRequests.push(request.url())
    }
  }
  page.on('request', observeCreate)
  try {
    await clickButtonByName({
      page,
      name: 'Accept imported forest layer',
      timeoutMs,
    })
    await page
      .getByRole('alert')
      .filter({
        hasText: 'Datassa on kohteita, joilla on sama ID: lm-duplicate-1',
      })
      .waitFor({ state: 'visible', timeout: timeoutMs })
    await assertPathname({
      page,
      expectedPathname: '/fi/luonnonmetsakartat/admin/import',
    })
    if (createRequests.length)
      throw new Error('Duplicate-ID input sent a create request')
  } finally {
    page.off('request', observeCreate)
  }
}

const runSettingsEditSaveSmoke = async ({
  page,
  baseUrl,
  sourceLiterals,
  timeoutMs,
}) => {
  const layerId = sourceLiterals.MOCK_VISIBLE_LAYER_ID
  await gotoAndAssertOk({
    page,
    url: buildSmokeUrl({
      baseUrl,
      path: `/fi/luonnonmetsakartat/admin/layer/${layerId}/settings`,
      state: 'settings-clean',
      queryParams: getAuthenticatedQueryParams(sourceLiterals),
      sourceLiterals,
    }),
    timeoutMs,
  })
  await assertMockBootstrapAvailable({ page, timeoutMs })
  await assertPathname({
    page,
    expectedPathname: `/fi/luonnonmetsakartat/admin/layer/${layerId}/settings`,
  })

  const nextName = `${MOCK_LAYER_NAME} smoke`
  await fillTextbox({
    page,
    name: 'Tason nimi',
    value: nextName,
    timeoutMs,
  })

  const patchResponsePromise = waitForApiResponse({
    page,
    method: 'PATCH',
    pathPart: `/api/luonnonmetsakartat/layer/${layerId}`,
    status: 200,
    timeoutMs,
  })
  await clickButtonByName({
    page,
    name: 'Tallenna muutokset',
    timeoutMs,
  })
  const patchResponse = await patchResponsePromise
  const patchPayload = await patchResponse.json().catch(() => ({}))

  if (patchPayload.id !== layerId) {
    throw new Error(
      `Expected settings PATCH response for ${layerId}, got ${patchPayload.id}`
    )
  }

  if (patchPayload.name !== nextName) {
    throw new Error(
      `Expected settings PATCH response name "${nextName}", got "${patchPayload.name}"`
    )
  }
}

const runPicturesMappedSaveSmoke = async ({
  page,
  baseUrl,
  sourceLiterals,
  timeoutMs,
}) => {
  const layerId = sourceLiterals.MOCK_VISIBLE_LAYER_ID
  await gotoAndAssertOk({
    page,
    url: buildSmokeUrl({
      baseUrl,
      path: `/fi/luonnonmetsakartat/admin/layer/${layerId}/pictures`,
      state: 'pictures-mapped',
      queryParams: getAuthenticatedQueryParams(sourceLiterals),
      sourceLiterals,
    }),
    timeoutMs,
  })
  await assertMockBootstrapAvailable({ page, timeoutMs })
  await assertPathname({
    page,
    expectedPathname: `/fi/luonnonmetsakartat/admin/layer/${layerId}/pictures`,
  })
  await waitForVisible({
    locator: page.getByTestId('folayer-import-pictures-mapping-list'),
    timeoutMs,
  })

  const patchResponsePromise = waitForApiResponse({
    page,
    method: 'PATCH',
    pathPart: `/api/luonnonmetsakartat/layer/${layerId}`,
    status: 200,
    timeoutMs,
  })
  await clickButtonByName({
    page,
    name: 'Tallenna kuvat',
    timeoutMs,
  })
  const patchResponse = await patchResponsePromise
  const patchPayload = await patchResponse.json().catch(() => ({}))

  if (patchPayload.id !== layerId) {
    throw new Error(
      `Expected pictures PATCH response for ${layerId}, got ${patchPayload.id}`
    )
  }
}

const runStep = async ({ name, results, task }) => {
  process.stdout.write(`[luonnonmetsakartat-smoke] ${name}... `)
  const startedAt = Date.now()
  await task()
  const durationMs = Date.now() - startedAt
  results.push({ name, durationMs })
  process.stdout.write(`ok (${durationMs}ms)\n`)
}

const runSmoke = async (args) => {
  const browserBaseUrl = getBrowserNavigationBaseUrl(args.baseUrl)
  const results = []
  const preflightAlreadyDone = process.env[PREFLIGHT_DONE_ENV_KEY] === '1'

  if (preflightAlreadyDone) {
    results.push({ name: 'server preflight', durationMs: 0 })
  } else {
    await runStep({
      name: 'server preflight',
      results,
      task: () =>
        assertServerAvailable({
          baseUrl: args.baseUrl,
          noStart: args.noStart,
        }),
    })
  }

  const effectiveBrowserMode = resolveBrowserMode({
    browserMode: args.browserMode,
    scenarios: [{ requiresWebGL: true }],
  })
  const reexecResult = maybeReexecInsideXvfb({
    browserMode: effectiveBrowserMode,
    env: {
      ...process.env,
      [PREFLIGHT_DONE_ENV_KEY]: '1',
    },
  })
  if (reexecResult.reexecuted) {
    process.exit(reexecResult.exitCode ?? 1)
  }

  const sourceLiterals = getLuonnonmetsakartatMockSourceLiterals()
  const { chromium } = requireOrThrow({
    id: 'playwright',
    installHint: '`yarn visual:install`',
  })
  let browser
  let context
  let page
  let issueCollector

  try {
    browser = await chromium.launch(
      getChromiumLaunchOptions({ browserMode: effectiveBrowserMode })
    )
    await assertWebGLAvailable({
      browser,
      browserMode: effectiveBrowserMode,
    })
    context = await browser.newContext(
      buildPlaywrightContextOptions({ viewport: DEFAULT_VIEWPORT })
    )
    page = await context.newPage()
    issueCollector = createPageIssueCollector(page)

    await runStep({
      name: 'fresh context/browser launch',
      results,
      task: async () => {
        await delay(0)
      },
    })

    await runStep({
      name: 'public route',
      results,
      task: () =>
        runPublicRouteSmoke({
          page,
          baseUrl: browserBaseUrl,
          timeoutMs: args.timeoutMs,
        }),
    })

    await runStep({
      name: 'admin route',
      results,
      task: () =>
        runAdminRouteSmoke({
          page,
          baseUrl: browserBaseUrl,
          sourceLiterals,
          timeoutMs: args.timeoutMs,
        }),
    })

    await runStep({
      name: 'valid shapefile import',
      results,
      task: () =>
        runValidImportSmoke({
          page,
          baseUrl: browserBaseUrl,
          sourceLiterals,
          timeoutMs: args.timeoutMs,
        }),
    })

    await runStep({
      name: 'duplicate-ID validation',
      results,
      task: () =>
        runDuplicateImportSmoke({
          issueCollector,
          page,
          baseUrl: browserBaseUrl,
          sourceLiterals,
          timeoutMs: args.timeoutMs,
        }),
    })

    await runStep({
      name: 'settings edit/save',
      results,
      task: () =>
        runSettingsEditSaveSmoke({
          page,
          baseUrl: browserBaseUrl,
          sourceLiterals,
          timeoutMs: args.timeoutMs,
        }),
    })

    await runStep({
      name: 'pictures mapped/save',
      results,
      task: () =>
        runPicturesMappedSaveSmoke({
          page,
          baseUrl: browserBaseUrl,
          sourceLiterals,
          timeoutMs: args.timeoutMs,
        }),
    })

    issueCollector.assertNoFatalIssues()

    console.log('[luonnonmetsakartat-smoke] result:', {
      ok: true,
      baseUrl: args.baseUrl,
      browserBaseUrl,
      browserMode: effectiveBrowserMode,
      steps: results.map((result) => result.name),
    })

    const consoleErrors = issueCollector.getConsoleErrors()
    if (consoleErrors.length > 0) {
      console.warn(
        `[luonnonmetsakartat-smoke] observed ${consoleErrors.length} non-fatal browser console error(s)`
      )
    }
  } finally {
    if (context) {
      await context.close()
    }
    if (browser) {
      await browser.close()
    }
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(HELP_TEXT)
    return
  }

  await runSmoke(args)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[luonnonmetsakartat-smoke] ${error.message}`)
    process.exitCode = 1
  })
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  DUPLICATE_ID_LAYER_FIXTURE_PATH,
  VALID_LAYER_FIXTURE_PATH,
  assertServerAvailable,
  buildAbsoluteUrl,
  buildSmokeUrl,
  getBrowserNavigationBaseUrl,
  isServerAvailable,
  parseArgs,
  trimTrailingSlash,
}
