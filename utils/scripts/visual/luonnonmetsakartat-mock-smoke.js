#!/usr/bin/env node

const assert = require('node:assert/strict')
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
  readStringLiteralExportsFromTypeScript,
  MOCK_AUTH_SOURCE_PATH,
  getLuonnonmetsakartatMockSourceLiterals,
} = require('../../visual/luonnonmetsakartatMockScenarios')

const DEFAULT_BASE_URL = 'http://127.0.0.1:6900'
const DEFAULT_TIMEOUT_MS = 60000
const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
const DEFAULT_VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1 }
const PREFLIGHT_DONE_ENV_KEY =
  'AVOIN_MAP_LUONNONMETSAKARTAT_SMOKE_PREFLIGHT_DONE'
const FIXTURE_DIR = path.resolve(process.cwd(), 'test-data/luonnonmetsakartat')
const VALID_LAYER_FIXTURE_PATH = path.join(FIXTURE_DIR, 'valid-layer.zip')
const DUPLICATE_ID_LAYER_FIXTURE_PATH = path.join(
  FIXTURE_DIR,
  'duplicate-id-layer.zip'
)
const DUPLICATE_PAIR_LAYER_FIXTURE_PATH = path.join(
  FIXTURE_DIR,
  'duplicate-name-municipality-layer.zip'
)
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
  --fail-after-import    Deliberately fail after import/readback; verify owned cleanup
  --help                 Show this help

Behavior:
  This smoke utility only reuses an already-running mock-enabled dev server. It
  uses fresh mock identities and real UI/API reads, validates both duplicate ZIPs,
  imports one owned layer, edits settings/areas/pictures, and deletes it. Finally
  cleanup runs on success and failure. Live mode follows the verified build; no
  scenario state or server reset is used.
`

const parseArgs = (argv) => {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    browserMode: BROWSER_MODE_XVFB_WEBGL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    noStart: false,
    help: false,
    failAfterImport: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    if (token === '--help' || token === '-h') {
      args.help = true
      continue
    }

    if (token === '--fail-after-import') {
      args.failAfterImport = true
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

const {
  API_PATH,
  layerPath,
  createRun,
  ownName,
  registerCreated,
  matchesRequest,
  captureFormSubmissions,
  observeCreates,
  requireStatus,
  requireAbsent,
  cleanupOwned,
  executeLifecycle,
  formatError,
  createIssueCollector,
} = require('./luonnonmetsakartat-smoke-lifecycle')

const runtimeMode = (env) => {
  const enabled = (value) =>
    ['1', 'true', 'yes', 'on'].includes(value?.trim().toLowerCase())
  assert.notEqual(
    env.NODE_ENV,
    'production',
    'Smoke requires a development mock runtime'
  )
  for (const flag of [
    'PUBLIC_MOCK_AUTH_ENABLED',
    'PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED',
    'LUONNONMETSAKARTAT_MOCK_API_ENABLED',
  ]) {
    assert(
      enabled(env[flag]),
      `Required runtime flag ${flag} is not enabled; invoke runtime_doctor`
    )
  }
  const applets =
    env.PUBLIC_COMPILED_APPLETS?.split(',').map((value) => value.trim()) ?? []
  assert(
    applets.includes('luonnonmetsakartat'),
    'Luonnonmetsakartat is not selected'
  )
  if (applets.includes('main')) return 'main'
  assert.deepEqual(
    applets,
    ['luonnonmetsakartat'],
    'Ambiguous standalone selection'
  )
  return 'standalone'
}
const buildLifecycleRoutes = ({ mode, id = '' }) => {
  assert(['main', 'standalone'].includes(mode), 'Unknown runtime mode')
  const home = mode === 'main' ? '/fi/luonnonmetsakartat' : '/fi'
  const admin = `${home}/admin`
  const detail = `${admin}/layer/${encodeURIComponent(id)}`
  return {
    home,
    admin,
    import: `${admin}/import`,
    detail,
    settings: `${detail}/settings`,
    pictures: `${detail}/pictures`,
    legacy: [
      `${admin}/tuo`,
      `${admin}/taso/${encodeURIComponent(id)}`,
      `${admin}/taso/${encodeURIComponent(id)}/asetukset`,
      `${admin}/taso/${encodeURIComponent(id)}/kuvat`,
    ],
  }
}
const buildLifecycleUrl = ({ baseUrl, pathname, identity, search = '' }) => {
  const url = new URL(pathname, baseUrl)
  url.search = search
  if (identity)
    url.searchParams.set(
      getLuonnonmetsakartatMockSourceLiterals().MOCK_AUTH_QUERY_PARAM,
      identity
    )
  return url.href
}
const normalizedPath = (url) => trimTrailingSlash(new URL(url).pathname)
const wfsTypeName = (id) => `mock:forest_areas_${id.replace(/-/g, '')}_centroid`
const matchesWfs = ({ request, baseUrl, id }) =>
  matchesRequest({
    request,
    baseUrl,
    method: 'GET',
    pathname: `${API_PATH}/geoserver/mock/ows`,
  }) && new URL(request.url()).searchParams.get('typeName') === wfsTypeName(id)

const runSmoke = async (args) => {
  const results = []
  if (process.env[PREFLIGHT_DONE_ENV_KEY] !== '1')
    await assertServerAvailable(args)
  const mode = runtimeMode(process.env)
  const baseUrl = getBrowserNavigationBaseUrl(args.baseUrl)
  assert(
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname),
    'Smoke writes require the local doctor-verified mock runtime'
  )
  const effectiveBrowserMode = resolveBrowserMode({
    browserMode: args.browserMode,
    scenarios: [{ requiresWebGL: true }],
  })
  const reexec = maybeReexecInsideXvfb({
    browserMode: effectiveBrowserMode,
    env: { ...process.env, [PREFLIGHT_DONE_ENV_KEY]: '1' },
  })
  if (reexec.reexecuted) {
    process.exitCode = reexec.exitCode ?? 1
    return
  }
  const { chromium, expect: baseExpect } = requireOrThrow({
    id: '@playwright/test',
    installHint: '`yarn visual:install`',
  })
  const expect = baseExpect.configure({ timeout: args.timeoutMs })
  const { MOCK_AUTH_ACCESS_TOKEN: token } =
    readStringLiteralExportsFromTypeScript({
      filePath: MOCK_AUTH_SOURCE_PATH,
      exportNames: ['MOCK_AUTH_ACCESS_TOKEN'],
    })
  const api = async ({ pathname, method = 'GET', anonymous = false }) => {
    const response = await fetch(new URL(pathname, baseUrl), {
      method,
      headers: anonymous ? {} : { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(args.timeoutMs),
      redirect: 'error',
    })
    return { status: response.status, body: await response.json() }
  }
  requireStatus(
    await api({ pathname: `${API_PATH}/admin/validate` }),
    200,
    'mock validation preflight'
  )
  const run = createRun(
    requireStatus(
      await api({ pathname: `${API_PATH}/layers` }),
      200,
      'baseline list'
    )
  )
  let browser
  let phase = 'launch'
  let failedPhase
  const contexts = []
  const collectors = []
  const detachCreates = []
  const formsByContext = new Map()
  const readSubmittedForm = (request) =>
    formsByContext.get(request.frame().page().context()).read(request)
  const routes = (id) => buildLifecycleRoutes({ mode, id })
  const step = async (name, task) => {
    phase = name
    console.log(`[luonnonmetsakartat-smoke] ${run.runId}: ${name}`)
    try {
      await task()
      await Promise.all(collectors.map((collector) => collector.flush()))
      collectors.forEach((collector) => collector.assertNoIssues())
    } catch (error) {
      failedPhase = name
      throw error
    }
    results.push(name)
  }
  const newPage = async () => {
    const context = await browser.newContext(
      buildPlaywrightContextOptions({ viewport: DEFAULT_VIEWPORT })
    )
    contexts.push(context)
    formsByContext.set(
      context,
      await captureFormSubmissions({
        context,
        baseUrl,
        timeoutMs: args.timeoutMs,
      })
    )
    context.setDefaultTimeout(args.timeoutMs)
    context.setDefaultNavigationTimeout(args.timeoutMs)
    const issues = createIssueCollector({
      context,
      getPhase: () => phase,
      baseUrl,
    })
    collectors.push(issues)
    detachCreates.push(
      observeCreates({
        context,
        run,
        baseUrl,
        getPhase: () => phase,
        readForm: readSubmittedForm,
      })
    )
    return { page: await context.newPage(), issues }
  }
  const goto = async ({
    page,
    pathname,
    identity = 'authenticated',
    search,
  }) => {
    const response = await page.goto(
      buildLifecycleUrl({ baseUrl, pathname, identity, search }),
      { waitUntil: 'domcontentloaded' }
    )
    assert(
      response && response.status() < 400,
      `Navigation ${pathname}: HTTP ${response?.status()}`
    )
    await waitForAppHydration({
      page,
      timeoutMs: args.timeoutMs,
      minBodyHeight: 100,
      settleMs: 0,
    })
    await page.waitForFunction(
      () => typeof window.__avoinLuonnonmetsakartatMocks?.reset === 'function'
    )
    return response
  }
  // Wait for the endpoint, then validate its status; errors never masquerade as
  // timeouts waiting only for a successful status. Arm before the user action.
  const responseDuring = async ({
    page,
    method = 'GET',
    pathname,
    predicate,
    status = 200,
    action,
  }) => {
    const [response] = await Promise.all([
      page.waitForResponse((res) =>
        predicate
          ? predicate(res.request())
          : matchesRequest({
              request: res.request(),
              baseUrl,
              method,
              pathname,
            })
      ),
      action(),
    ])
    assert.equal(
      response.status(),
      status,
      `${method} ${pathname || 'WFS'} returned HTTP ${response.status()}`
    )
    return response
  }
  const readDetail = async ({ page, id, target = 'detail' }) => {
    const [response, areasResponse] = await Promise.all([
      responseDuring({
        page,
        pathname: layerPath(id),
        action: () => goto({ page, pathname: routes(id)[target] }),
      }),
      page.waitForResponse((res) =>
        matchesWfs({ request: res.request(), baseUrl, id })
      ),
    ])
    assert.equal(areasResponse.status(), 200, 'Fresh WFS read failed')
    assert(
      (await response.request().allHeaders()).authorization,
      'Detail must be authenticated'
    )
    assert(
      (await areasResponse.request().allHeaders()).authorization,
      'Admin WFS must be authenticated'
    )
    const layer = await response.json()
    assert.equal(layer.id, id)
    const areas = (await areasResponse.json()).features
    assert(areas.length >= 2, 'Imported mock layer needs two synthetic areas')
    if (target === 'detail') {
      await expect(
        page.getByRole('heading', { name: layer.name, exact: true })
      ).toBeVisible()
      for (const area of areas)
        await expect(
          page.getByRole('button', { name: area.properties.name, exact: true })
        ).toBeVisible()
    } else if (target === 'settings') {
      await expect(
        page.getByRole('textbox', { name: 'Tason nimi', exact: true })
      ).toHaveValue(layer.name)
      await expect(
        page.getByRole('switch', { name: 'Näytä taso julkisesti' })
      ).toBeChecked({ checked: !layer.is_hidden })
      await expect(
        page
          .getByRole('button', { name: 'Tason väri', exact: true })
          .locator('span')
          .first()
      ).toHaveCSS('background-color', hexToRgb(layer.color_code))
    }
    return { layer, areas }
  }
  const publicRead = async (owned) => {
    const { page } = await newPage()
    const response = await responseDuring({
      page,
      pathname: `${API_PATH}/layers`,
      action: () =>
        goto({ page, pathname: routes().home, identity: 'unauthenticated' }),
    })
    assert.equal(
      (await response.request().allHeaders()).authorization,
      undefined,
      'Public request sent Authorization'
    )
    const layers = await response.json()
    for (const layer of layers)
      await expect(
        page.getByText(layer.name, { exact: true }).first()
      ).toBeVisible()
    if (owned) {
      const found = layers.find((layer) => layer.id === owned.id)
      if (owned.is_hidden) {
        assert.equal(found, undefined, 'Hidden layer leaked publicly')
        await expect(page.getByText(owned.name, { exact: true })).toHaveCount(0)
      } else {
        assert(found, 'Saved visible layer missing publicly')
        assert.equal(found.name, owned.name)
        assert.equal(found.color_code, owned.color_code)
      }
    }
    await page.close()
    return layers
  }
  const upload = async ({ page, fixture, name, pair = false }) => {
    await goto({ page, pathname: routes().import })
    await page
      .locator('input[type="file"][accept=".zip"]')
      .setInputFiles(fixture)
    await page.waitForFunction((columns) => {
      const values = [
        ...document.querySelectorAll(
          '[data-slot="trigger"] [data-slot="value"]'
        ),
      ].map((el) => el.textContent.trim())
      return columns.every((column) => values.includes(column))
    }, REQUIRED_COLUMNS)
    if (pair) {
      await page.getByRole('combobox', { name: 'Indeksointitapa' }).click()
      await page
        .getByRole('option', { name: 'Nimi + kunta', exact: true })
        .click()
    }
    await page.getByRole('textbox', { name: 'Karttatason nimi' }).fill(name)
  }
  let createdId
  try {
    await executeLifecycle({
      task: async () => {
        browser = await chromium.launch(
          getChromiumLaunchOptions({ browserMode: effectiveBrowserMode })
        )
        await assertWebGLAvailable({
          browser,
          browserMode: effectiveBrowserMode,
        })
        const { page } = await newPage()
        await step('public and anonymous admin gate', async () => {
          const layers = await publicRead()
          assert(layers.length > 0, 'Runtime has no visible layers to list')
          const { page: anonymous } = await newPage()
          const protectedRequests = []
          anonymous.on('request', (request) => {
            if (new URL(request.url()).pathname.startsWith(API_PATH))
              protectedRequests.push(request)
          })
          await goto({
            page: anonymous,
            pathname: routes().import,
            identity: 'unauthenticated',
          })
          await expect(
            anonymous.getByText(
              'Tervetuloa admin-paneeliin. Kirjaudu sisään alareunasta aloittaaksesi.'
            )
          ).toBeVisible()
          await expect(anonymous.locator('input[type="file"]')).toHaveCount(0)
          await anonymous.close()
          assert.equal(
            protectedRequests.length,
            0,
            'Logged-out admin made protected requests'
          )
        })
        await step('rejected admin gate', async () => {
          const { page: rejected, issues } = await newPage()
          const protectedRequests = []
          rejected.on('request', (request) => {
            const pathname = new URL(request.url()).pathname
            if (
              pathname.startsWith(API_PATH) &&
              pathname !== `${API_PATH}/admin/validate`
            )
              protectedRequests.push(request)
          })
          const denial = await responseDuring({
            page: rejected,
            pathname: `${API_PATH}/admin/validate`,
            status: 403,
            action: () =>
              goto({
                page: rejected,
                pathname: routes().import,
                identity: 'rejected',
              }),
          })
          assert.deepEqual(await denial.json(), {
            error: 'Mock admin access rejected',
            is_editor: false,
            is_admin: false,
          })
          await expect(
            rejected.getByText(
              'Käyttäjälläsi ei ole muokkausoikeuksia. Ota yhteyttä ylläpitäjään.'
            )
          ).toBeVisible()
          await rejected.waitForURL(
            (url) => trimTrailingSlash(url.pathname) === routes().admin
          )
          await expect(rejected.locator('input[type="file"]')).toHaveCount(0)
          issues.allowNegativeResponse({
            response: denial,
            page: rejected,
            phase,
          })
          await rejected.close()
          assert.equal(
            protectedRequests.length,
            0,
            'Rejected admin made protected requests'
          )
        })
        await step('authorized admin gate/list', async () => {
          const [validation, layers] = await Promise.all([
            responseDuring({
              page,
              pathname: `${API_PATH}/admin/validate`,
              action: () => goto({ page, pathname: routes().admin }),
            }),
            page.waitForResponse((response) =>
              matchesRequest({
                request: response.request(),
                baseUrl,
                method: 'GET',
                pathname: `${API_PATH}/layers`,
              })
            ),
          ])
          assert.deepEqual(await validation.json(), {
            is_admin: true,
            is_editor: true,
          })
          assert.equal(layers.status(), 200)
          for (const layer of await layers.json())
            await expect(
              page.getByRole('link', {
                name: `Open ${layer.name}`,
                exact: true,
              })
            ).toBeVisible()
        })
        for (const negative of [
          {
            fixture: DUPLICATE_ID_LAYER_FIXTURE_PATH,
            suffix: 'duplicate-id',
            message: 'Datassa on kohteita, joilla on sama ID: lm-duplicate-1',
          },
          {
            fixture: DUPLICATE_PAIR_LAYER_FIXTURE_PATH,
            suffix: 'duplicate-pair',
            pair: true,
            message:
              'Datassa on kohteita, joilla on sama nimi ja kunta: Shared Forest - Espoo',
          },
        ]) {
          await step(`${negative.suffix} validation before POST`, async () => {
            const start = run.attempts.length
            await upload({
              page,
              ...negative,
              name: ownName(run, negative.suffix),
            })
            await page
              .getByRole('button', { name: 'Accept imported forest layer' })
              .click()
            await expect(
              page.getByRole('alert').filter({ hasText: negative.message })
            ).toBeVisible()
            assert.equal(normalizedPath(page.url()), routes().import)
            await goto({ page, pathname: routes().admin })
            await expect(
              page.getByRole('link', { name: /Open / }).first()
            ).toBeVisible()
            assert.equal(
              run.attempts.length,
              start,
              `${negative.suffix} sent create POST attempts`
            )
            assert.deepEqual(
              new Map(
                requireStatus(
                  await api({ pathname: `${API_PATH}/layers` }),
                  200,
                  'negative readback'
                ).map((layer) => [layer.id, layer])
              ),
              run.baseline
            )
          })
        }
        let current
        await step(
          'valid ZIP import and fresh hidden-layer readback',
          async () => {
            const name = ownName(run, 'import')
            await upload({ page, fixture: VALID_LAYER_FIXTURE_PATH, name })
            const response = await responseDuring({
              page,
              method: 'POST',
              pathname: `${API_PATH}/layer`,
              status: 201,
              action: () =>
                page
                  .getByRole('button', { name: 'Accept imported forest layer' })
                  .click(),
            })
            const layer = await response.json()
            createdId = layer.id
            registerCreated({ run, name, id: createdId })
            assert.equal(layer.name, name)
            assert.equal(layer.is_hidden, true)
            await page.waitForURL(
              (url) =>
                trimTrailingSlash(url.pathname) === routes(createdId).detail
            )
            current = await readDetail({ page, id: createdId })
            assert.equal(current.layer.name, name)
            assert(
              current.areas.every(
                (area) => !String(area.properties.id).startsWith('lm-valid-')
              ),
              'Mock areas should be discovered synthetic data'
            )
            await publicRead(current.layer)
            if (args.failAfterImport)
              throw new Error(
                'Deliberate --fail-after-import failure after registered create and fresh readback'
              )
          }
        )
        await step(
          'settings name/color/visibility and public persistence',
          async () => {
            await page.getByRole('link', { name: 'Siirry asetuksiin' }).click()
            await page.waitForURL(
              (url) =>
                trimTrailingSlash(url.pathname) === routes(createdId).settings
            )
            await page
              .getByRole('textbox', { name: 'Tason nimi', exact: true })
              .fill(ownName(run, 'renamed'))
            const color = page.getByRole('button', {
              name: 'Tason väri',
              exact: true,
            })
            await color.click()
            const hue = page.getByRole('slider', { name: 'Hue', exact: true })
            await hue.press('ArrowRight')
            await hue.press('Escape')
            await expect(hue).toHaveCount(0)
            const expectedColor = await color
              .locator('span')
              .first()
              .evaluate((element) => getComputedStyle(element).backgroundColor)
            assert.notEqual(
              expectedColor,
              hexToRgb(current.layer.color_code),
              'Color keyboard edit did not change the color'
            )
            for (const visible of [true, false, true]) {
              await page
                .getByRole('switch', { name: 'Näytä taso julkisesti' })
                .click()
              const response = await responseDuring({
                page,
                method: 'PATCH',
                pathname: layerPath(createdId),
                action: () =>
                  page
                    .getByRole('button', {
                      name: 'Tallenna muutokset',
                      exact: true,
                    })
                    .click(),
              })
              const form = await readSubmittedForm(response.request())
              assert.equal(form.get('is_hidden'), String(!visible))
              assert.equal(form.get('name'), ownName(run, 'renamed'))
              assert.equal(hexToRgb(form.get('color_code')), expectedColor)
              const saved = await response.json()
              assert.equal(saved.id, createdId)
              assert.equal(saved.name, form.get('name'))
              assert.equal(saved.color_code, form.get('color_code'))
              assert.equal(saved.is_hidden, !visible)
              current = await readDetail({
                page,
                id: createdId,
                target: 'settings',
              })
              assert.deepEqual(current.layer, saved)
              await publicRead(current.layer)
            }
          }
        )
        await step('area metadata UI edit and WFS readback', async () => {
          current = await readDetail({ page, id: createdId })
          const area = current.areas[0]
          const neighbor = current.areas[1]
          await page
            .getByRole('button', { name: area.properties.name, exact: true })
            .click()
          const modal = page.getByTestId('luonnonmetsakartat-admin-area-modal')
          const description = `Description ${run.runId}`
          await modal
            .getByRole('textbox', { name: 'Kohteen kuvaus', exact: true })
            .fill(description)
          const response = await responseDuring({
            page,
            method: 'PATCH',
            pathname: `${layerPath(createdId)}/area/${encodeURIComponent(area.properties.id)}`,
            action: () =>
              modal.getByRole('button', { name: 'Tallenna muutokset' }).click(),
          })
          assert.equal(
            (await readSubmittedForm(response.request())).get('description'),
            description
          )
          await expect(
            modal.getByRole('button', { name: 'Tallenna muutokset' })
          ).toHaveCount(0)
          await modal
            .getByRole('button', { name: 'Close admin area modal' })
            .click()
          current = await readDetail({ page, id: createdId })
          assert.equal(
            current.areas.find(
              (item) => item.properties.id === area.properties.id
            ).properties.description,
            description
          )
          assert.deepEqual(
            current.areas.find(
              (item) => item.properties.id === neighbor.properties.id
            ),
            neighbor
          )
          await page
            .getByRole('button', { name: area.properties.name, exact: true })
            .click()
          await expect(
            modal.getByRole('textbox', { name: 'Kohteen kuvaus', exact: true })
          ).toHaveValue(description)
          await modal
            .getByRole('button', { name: 'Close admin area modal' })
            .click()
        })
        await step(
          'picture matching/change/clear/partial save and gallery readback',
          async () => {
            await page
              .getByRole('link', { name: 'Lisää kuvia', exact: true })
              .click()
            await page.waitForURL(
              (url) =>
                trimTrailingSlash(url.pathname) === routes(createdId).pictures
            )
            const [area, neighbor] = current.areas
            const folder = `${area.properties.municipality}, ${area.properties.name}`
            const unmatched = `Unmatched ${run.runId}`
            // Only raw File input is provided. Matching/IDs and persistence remain
            // the real component's work, with no seeded query/store results.
            await page.locator('input[webkitdirectory]').evaluate(
              (input, { folders, png }) => {
                const transfer = new DataTransfer()
                for (const [folder, names] of folders) {
                  for (const name of names) {
                    const file = new File(
                      [
                        Uint8Array.from(atob(png), (character) =>
                          character.charCodeAt(0)
                        ),
                      ],
                      name,
                      {
                        type: 'image/png',
                      }
                    )
                    Object.defineProperty(file, 'webkitRelativePath', {
                      value: `smoke/${folder}/${name}`,
                    })
                    transfer.items.add(file)
                  }
                }
                input.files = transfer.files
                input.dispatchEvent(new Event('change', { bubbles: true }))
              },
              {
                folders: [
                  [folder, ['first.png', 'second.png']],
                  [unmatched, ['excluded.png']],
                ],
                png: TINY_PNG,
              }
            )
            const selectName = (folder) => `Valitse kohde: ${folder}`
            const matchedSelect = page.getByRole('combobox', {
              name: selectName(folder),
              exact: true,
            })
            const unmatchedSelect = page.getByRole('combobox', {
              name: selectName(unmatched),
              exact: true,
            })
            await expect(matchedSelect).toHaveValue(folder)
            await expect(unmatchedSelect).toHaveValue('')
            const summary = (areas, images) =>
              page.getByText(`Kohde: ${areas} • Kuvia: ${images}`, {
                exact: true,
              })
            await expect(summary(1, 2)).toBeVisible()
            await expect(
              page.getByText(
                '1 kansio, jolle ei löytynyt kohdetta. Kansiossa on 1 kuvaa.',
                { exact: true }
              )
            ).toBeVisible()
            await unmatchedSelect.fill(neighbor.properties.name)
            await page
              .getByRole('option', {
                name: `${neighbor.properties.municipality}, ${neighbor.properties.name}`,
                exact: true,
              })
              .click()
            await expect(summary(2, 3)).toBeVisible()
            await page
              .getByRole('button', {
                name: `${selectName(unmatched)} clear`,
                exact: true,
              })
              .click()
            await expect(unmatchedSelect).toHaveValue('')
            await expect(summary(1, 2)).toBeVisible()
            const response = await responseDuring({
              page,
              method: 'PATCH',
              pathname: layerPath(createdId),
              action: () =>
                page
                  .getByRole('button', { name: 'Tallenna kuvat', exact: true })
                  .click(),
            })
            const form = await readSubmittedForm(response.request())
            assert.deepEqual(
              form.getAll('bulk_images').map((file) => file.name),
              ['first.png', 'second.png']
            )
            assert.deepEqual(form.getAll('bulk_area_ids'), [
              area.properties.id,
              area.properties.id,
            ])
            await expect(
              page.getByTestId('folayer-import-pictures-mapping-list')
            ).toHaveCount(0)
            await expect(
              page.getByRole('button', { name: 'Tallenna kuvat', exact: true })
            ).toHaveCount(0)
            current = await readDetail({ page, id: createdId })
            const pictures = JSON.parse(
              current.areas.find(
                (item) => item.properties.id === area.properties.id
              ).properties.pictures
            )
            const expectedPictures = ['first.png', 'second.png'].map(
              (name, index) =>
                `https://example.org/mock/uploads/${encodeURIComponent(createdId)}/${encodeURIComponent(area.properties.id)}/${index + 1}-${name}`
            )
            assert.deepEqual(pictures, expectedPictures)
            assert.deepEqual(
              current.areas.find(
                (item) => item.properties.id === neighbor.properties.id
              ),
              neighbor
            )
            // Fulfill only returned owned image metadata, never API/WFS responses.
            const imageUrls = new Set(
              pictures.flatMap((url) => [
                url,
                `${url}?width=200&resize=cover&quality=80&dpr=2`,
              ])
            )
            await page.route(
              (url) => imageUrls.has(url.href),
              (route) =>
                route.fulfill({
                  contentType: 'image/png',
                  body: Buffer.from(TINY_PNG, 'base64'),
                })
            )
            await page
              .getByRole('button', { name: area.properties.name, exact: true })
              .click()
            const modal = page.getByTestId(
              'luonnonmetsakartat-admin-area-modal'
            )
            await expect(modal.locator('img')).toHaveCount(2)
            const rendered = await modal
              .locator('img')
              .evaluateAll((images) =>
                images.map((image) => image.src.split('?')[0])
              )
            assert.deepEqual(rendered, expectedPictures)
            await page.waitForFunction(() =>
              [
                ...document.querySelectorAll(
                  '[data-testid="luonnonmetsakartat-admin-area-modal"] img'
                ),
              ].every((image) => image.complete && image.naturalWidth > 0)
            )
            await modal
              .getByRole('button', { name: 'Close admin area modal' })
              .click()
          }
        )
        await step(
          `canonical/locales/removed legacy routes (live ${mode})`,
          async () => {
            const { page: probe, issues } = await newPage()
            const search = '?tab=areas&tab=pictures&q=A%2BB%20C&empty='
            // Identity is persisted via a preceding navigation so probe searches
            // remain byte-for-byte intact, including repeated keys and %20.
            await goto({
              page: probe,
              pathname: routes().home,
              identity: 'unauthenticated',
            })
            for (const target of [routes().home, routes(createdId).detail]) {
              for (const prefix of ['', '/en', '/sv', '/fi']) {
                const pathname = `${prefix}${target.slice('/fi'.length)}` || '/'
                await goto({ page: probe, pathname, identity: null, search })
                assert.equal(normalizedPath(probe.url()), target)
                assert.equal(new URL(probe.url()).search, search)
              }
            }
            // Unknown admin children are still wrapped by the real admin gate.
            // Verify that gate before asserting its rendered not-found outlet.
            await responseDuring({
              page: probe,
              pathname: `${API_PATH}/admin/validate`,
              action: () => goto({ page: probe, pathname: routes().admin }),
            })
            await expect(
              probe.getByRole('link', { name: /Open / }).first()
            ).toBeVisible()
            for (const pathname of routes(createdId).legacy) {
              const response = await probe.goto(
                `${baseUrl}${pathname}${search}`,
                { waitUntil: 'domcontentloaded' }
              )
              assert.equal(
                response.status(),
                404,
                `Legacy ${pathname} must be not-found`
              )
              assert.equal(
                normalizedPath(probe.url()),
                pathname,
                'Legacy tail was translated'
              )
              assert.equal(new URL(probe.url()).search, search)
              await expect(
                probe.getByRole('heading', {
                  name: 'Page not found',
                  exact: true,
                })
              ).toBeVisible()
              issues.allowNegativeResponse({ response, page: probe, phase })
            }
            await probe.close()
          }
        )
        assert.equal(
          run.attempts.length,
          1,
          'Expected exactly one create attempt across all import phases'
        )
        await step('UI delete confirmation and fresh absence', async () => {
          await readDetail({ page, id: createdId, target: 'settings' })
          const deletes = []
          const listener = (request) => {
            if (
              matchesRequest({
                request,
                baseUrl,
                method: 'DELETE',
                pathname: layerPath(createdId),
              })
            )
              deletes.push(request)
          }
          page.on('request', listener)
          try {
            await page
              .getByRole('button', { name: 'Poista taso', exact: true })
              .click()
            await page
              .getByRole('dialog')
              .getByRole('button', { name: 'Ei', exact: true })
              .click()
            await expect(page.getByRole('dialog')).toHaveCount(0)
            assert.equal(deletes.length, 0, 'Cancel deleted the layer')
            await page
              .getByRole('button', { name: 'Poista taso', exact: true })
              .click()
            await responseDuring({
              page,
              method: 'DELETE',
              pathname: layerPath(createdId),
              action: () =>
                page
                  .getByRole('dialog')
                  .getByRole('button', { name: 'Kyllä', exact: true })
                  .click(),
            })
            await page.waitForURL(
              (url) => trimTrailingSlash(url.pathname) === routes().admin
            )
            assert.equal(deletes.length, 1)
          } finally {
            page.off('request', listener)
          }
          const list = await responseDuring({
            page,
            pathname: `${API_PATH}/layers`,
            action: () => goto({ page, pathname: routes().admin }),
          })
          assert(!(await list.json()).some((layer) => layer.id === createdId))
          await expect(
            page.getByRole('link', {
              name: `Open ${current.layer.name}`,
              exact: true,
            })
          ).toHaveCount(0)
          requireAbsent(
            await api({ pathname: layerPath(createdId) }),
            'deleted detail'
          )
          await publicRead({ ...current.layer, is_hidden: true })
        })
      },
      cleanup: () => {
        phase = 'cleanup'
        return cleanupOwned({ run, api, timeoutMs: args.timeoutMs })
      },
      close: [
        async () => {
          const closed = await Promise.allSettled(
            contexts.map((context) => context.close())
          )
          const errors = closed
            .filter((entry) => entry.status === 'rejected')
            .map((entry) => entry.reason)
          if (errors.length)
            throw new AggregateError(errors, 'Context close failures')
        },
        async () => {
          if (browser) await browser.close()
        },
      ],
      collectIssues: async () => {
        await Promise.all(collectors.map((collector) => collector.flush()))
        const errors = []
        for (const collector of collectors) {
          try {
            collector.assertNoIssues()
          } catch (error) {
            errors.push(error)
          }
        }
        if (errors.length)
          throw new AggregateError(errors, 'Browser diagnostics')
      },
      detach: () => {
        detachCreates.forEach((detach) => detach())
        formsByContext.forEach((forms) => forms.detach())
        collectors.forEach((collector) => collector.detach())
      },
    })
  } catch (error) {
    console.error(
      `[luonnonmetsakartat-smoke] failure: ${JSON.stringify({
        runId: run.runId,
        phase: failedPhase ?? phase,
        createdIds: [...run.ids],
        ownedNames: [...run.names],
        cleanup: run.cleanup,
        unresolvedCreates: run.attempts
          .filter((attempt) => !attempt.finished || attempt.ambiguous)
          .map((attempt) => ({ phase: attempt.phase, name: attempt.name })),
      })}`
    )
    throw new Error(
      formatError(error).replaceAll(token, '[mock credential redacted]')
    )
  }
  console.log(
    '[luonnonmetsakartat-smoke] result:',
    JSON.stringify({
      ok: true,
      runId: run.runId,
      liveMode: mode,
      browserMode: effectiveBrowserMode,
      createdIds: [...run.ids],
      createAttempts: run.attempts.length,
      cleanup: run.cleanup,
      baselinePreserved: run.baseline.size,
      steps: results,
      toleratedDiagnostics: collectors.flatMap((collector) =>
        collector.tolerated()
      ),
    })
  )
}
const hexToRgb = (hex) => {
  assert(/^#[0-9a-f]{6}$/i.test(hex), `Expected six-digit color, got ${hex}`)
  return `rgb(${[1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(', ')})`
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
  DUPLICATE_PAIR_LAYER_FIXTURE_PATH,
  VALID_LAYER_FIXTURE_PATH,
  assertServerAvailable,
  buildAbsoluteUrl,
  buildSmokeUrl,
  buildLifecycleRoutes,
  buildLifecycleUrl,
  runtimeMode,
  getBrowserNavigationBaseUrl,
  isServerAvailable,
  parseArgs,
  trimTrailingSlash,
}
