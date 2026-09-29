/** @jest-environment node */
const fs = require('fs')
const path = require('path')
const shp = require('shpjs')

const {
  DEFAULT_BASE_URL,
  DUPLICATE_ID_LAYER_FIXTURE_PATH,
  VALID_LAYER_FIXTURE_PATH,
  assertServerAvailable,
  buildSmokeUrl,
  getBrowserNavigationBaseUrl,
  parseArgs,
} = require('./luonnonmetsakartat-mock-smoke')
const {
  getLuonnonmetsakartatMockSourceLiterals,
} = require('../../visual/luonnonmetsakartatMockScenarios')

const expectedColumns = [
  'id',
  'nimi',
  'kunta',
  'maakunta',
  'kuvaus',
  'pinta_ala',
]

const toArrayBuffer = (buffer) =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

const parseFixture = async (fixturePath) => {
  const parsed = await shp(toArrayBuffer(fs.readFileSync(fixturePath)))

  return Array.isArray(parsed)
    ? parsed.flatMap((collection) => collection.features)
    : parsed.features
}

describe('luonnonmetsakartat mock smoke helpers', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('parses default arguments', () => {
    expect(parseArgs([])).toEqual({
      baseUrl: DEFAULT_BASE_URL,
      browserMode: 'xvfb-webgl',
      timeoutMs: 60000,
      noStart: false,
      help: false,
      failAfterImport: false,
    })
  })

  it('parses explicit arguments and trims the base URL', () => {
    expect(
      parseArgs([
        '--base-url',
        'http://127.0.0.1:6900///',
        '--timeout=1500',
        '--browser-mode=headless',
        '--no-start',
      ])
    ).toEqual({
      baseUrl: 'http://127.0.0.1:6900',
      browserMode: 'headless',
      timeoutMs: 1500,
      noStart: true,
      help: false,
      failAfterImport: false,
    })
  })

  it('rejects unknown arguments and invalid timeouts', () => {
    expect(() => parseArgs(['--unknown'])).toThrow('Unknown argument')
    expect(() => parseArgs(['--timeout=0'])).toThrow('Invalid --timeout value')
  })

  it('remaps numeric loopback to localhost for browser navigation', () => {
    expect(getBrowserNavigationBaseUrl('http://127.0.0.1:6900')).toBe(
      'http://localhost:6900'
    )
    expect(getBrowserNavigationBaseUrl('http://localhost:6900/')).toBe(
      'http://localhost:6900'
    )
  })

  it('builds smoke URLs with reset, scenario, and mock auth params', () => {
    const sourceLiterals = getLuonnonmetsakartatMockSourceLiterals()
    const url = new URL(
      buildSmokeUrl({
        baseUrl: 'http://localhost:6900',
        path: '/fi/luonnonmetsakartat/admin',
        state: 'admin-layers',
        queryParams: {
          [sourceLiterals.MOCK_AUTH_QUERY_PARAM]: 'authenticated',
        },
        sourceLiterals,
      })
    )

    expect(url.pathname).toBe('/fi/luonnonmetsakartat/admin')
    expect(url.searchParams.get(sourceLiterals.MOCK_RESET_QUERY_PARAM)).toBe(
      '1'
    )
    expect(
      url.searchParams.get(
        sourceLiterals.MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM
      )
    ).toBe('admin-layers')
    expect(url.searchParams.get(sourceLiterals.MOCK_AUTH_QUERY_PARAM)).toBe(
      'authenticated'
    )
  })

  it('fails clearly when the no-start dev server is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused'))

    await expect(
      assertServerAvailable({
        baseUrl: 'http://127.0.0.1:39999',
        noStart: true,
      })
    ).rejects.toThrow(
      'Dev server is unreachable at http://127.0.0.1:39999; --no-start was set'
    )
  })
})

describe('luonnonmetsakartat upload fixtures', () => {
  it('parses the valid shapefile fixture with expected columns and unique IDs', async () => {
    expect(path.basename(VALID_LAYER_FIXTURE_PATH)).toBe('valid-layer.zip')

    const features = await parseFixture(VALID_LAYER_FIXTURE_PATH)
    const columns = Object.keys(features[0].properties)
    const ids = features.map((feature) => feature.properties.id)

    expect(features).toHaveLength(2)
    expect(
      features.every((feature) => feature.geometry.type === 'Polygon')
    ).toBe(true)
    expectedColumns.forEach((column) => {
      expect(columns).toContain(column)
    })
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('parses the duplicate-ID fixture and exposes duplicate IDs', async () => {
    expect(path.basename(DUPLICATE_ID_LAYER_FIXTURE_PATH)).toBe(
      'duplicate-id-layer.zip'
    )

    const features = await parseFixture(DUPLICATE_ID_LAYER_FIXTURE_PATH)
    const columns = Object.keys(features[0].properties)
    const ids = features.map((feature) => feature.properties.id)

    expect(features).toHaveLength(2)
    expectedColumns.forEach((column) => {
      expect(columns).toContain(column)
    })
    expect(new Set(ids).size).toBeLessThan(ids.length)
    expect(ids).toEqual(['lm-duplicate-1', 'lm-duplicate-1'])
  })
})

const { EventEmitter } = require('node:events')
const {
  buildLifecycleRoutes,
  buildLifecycleUrl,
  runtimeMode,
  DUPLICATE_PAIR_LAYER_FIXTURE_PATH,
} = require('./luonnonmetsakartat-mock-smoke')
const {
  API_PATH,
  createRun,
  ownName,
  registerCreated,
  recoverOwned,
  matchesRequest,
  observeCreates,
  settleCreates,
  cleanupOwned,
  executeLifecycle,
  formatError,
  captureFormSubmissions,
  createIssueCollector,
  isExpectedResourceDiagnostic,
} = require('./luonnonmetsakartat-smoke-lifecycle')
const baseUrl = 'http://localhost:6900'
const env = {
  PUBLIC_COMPILED_APPLETS: 'main,luonnonmetsakartat',
  PUBLIC_MOCK_AUTH_ENABLED: '1',
  PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED: '1',
  LUONNONMETSAKARTAT_MOCK_API_ENABLED: '1',
}

it('exposes explicit failure injection without adding a server-start option', () => {
  expect(parseArgs(['--fail-after-import', '--no-start'])).toMatchObject({
    failAfterImport: true,
    noStart: true,
  })
  expect(() => parseArgs(['--start'])).toThrow('Unknown argument')
})
it('requires selected non-production mock flags before writes', () => {
  expect(runtimeMode(env)).toBe('main')
  expect(
    runtimeMode({ ...env, PUBLIC_COMPILED_APPLETS: 'luonnonmetsakartat' })
  ).toBe('standalone')
  for (const flag of Object.keys(env).filter((key) =>
    key.endsWith('ENABLED')
  )) {
    expect(() => runtimeMode({ ...env, [flag]: '0' })).toThrow(flag)
  }
  expect(() => runtimeMode({ ...env, NODE_ENV: 'production' })).toThrow(
    'development mock'
  )
  expect(() =>
    runtimeMode({ ...env, PUBLIC_COMPILED_APPLETS: 'main,energy' })
  ).toThrow('not selected')
  expect(() =>
    runtimeMode({
      ...env,
      PUBLIC_COMPILED_APPLETS: 'energy,luonnonmetsakartat',
    })
  ).toThrow('Ambiguous')
})
it.each([
  ['main', '/fi/luonnonmetsakartat'],
  ['standalone', '/fi'],
])(
  'constructs all six canonical and four untranslated historical paths in %s',
  (mode, prefix) => {
    expect(buildLifecycleRoutes({ mode, id: 'own /+id' })).toEqual({
      home: prefix,
      admin: `${prefix}/admin`,
      import: `${prefix}/admin/import`,
      detail: `${prefix}/admin/layer/own%20%2F%2Bid`,
      settings: `${prefix}/admin/layer/own%20%2F%2Bid/settings`,
      pictures: `${prefix}/admin/layer/own%20%2F%2Bid/pictures`,
      legacy: [
        `${prefix}/admin/tuo`,
        `${prefix}/admin/taso/own%20%2F%2Bid`,
        `${prefix}/admin/taso/own%20%2F%2Bid/asetukset`,
        `${prefix}/admin/taso/own%20%2F%2Bid/kuvat`,
      ],
    })
  }
)
it('omits scenario/reset seeding from lifecycle URLs and preserves literal search without identity', () => {
  const url = new URL(
    buildLifecycleUrl({
      baseUrl,
      pathname: '/fi/admin',
      identity: 'unauthenticated',
    })
  )
  expect(url.search).toBe('?mockAuth=unauthenticated')
  expect(
    buildLifecycleUrl({
      baseUrl,
      pathname: '/fi/admin',
      search: '?tab=areas&tab=pictures&q=A%2BB%20C&empty=',
    })
  ).toBe(
    'http://localhost:6900/fi/admin?tab=areas&tab=pictures&q=A%2BB%20C&empty='
  )
})
it('uses a duplicate-pair archive with unique IDs, so the pair validator is decisive', async () => {
  expect(path.basename(DUPLICATE_PAIR_LAYER_FIXTURE_PATH)).toBe(
    'duplicate-name-municipality-layer.zip'
  )
  const features = await parseFixture(DUPLICATE_PAIR_LAYER_FIXTURE_PATH)
  expect(new Set(features.map((feature) => feature.properties.id)).size).toBe(2)
  expect(
    features.map((feature) => [
      feature.properties.nimi,
      feature.properties.kunta,
    ])
  ).toEqual([
    ['Shared Forest', 'Espoo'],
    ['Shared Forest', 'Espoo'],
  ])
})

const makeTransport = (initial) => {
  const records = new Map(initial.map((record) => [record.id, { ...record }]))
  const missing = { status: 404, body: { error: 'Mock layer not found' } }
  const api = jest.fn(
    async ({ pathname, method = 'GET', anonymous = false }) => {
      if (pathname === `${API_PATH}/layers`)
        return {
          status: 200,
          body: [...records.values()].filter(
            (record) => !anonymous || !record.is_hidden
          ),
        }
      const id = decodeURIComponent(pathname.split('/').pop())
      if (method === 'DELETE') {
        if (!records.delete(id)) return missing
        return { status: 200, body: { id } }
      }
      return records.has(id) ? { status: 200, body: records.get(id) } : missing
    }
  )
  return { records, api }
}
const setupOwned = () => {
  const baseline = [{ id: 'user-layer', name: 'Keep this', is_hidden: true }]
  const run = createRun(baseline)
  const name = ownName(run, 'import')
  const transport = makeTransport([
    ...baseline,
    { id: 'new-1', name, is_hidden: true },
    { id: 'new-2', name: ownName(run, 'second'), is_hidden: false },
  ])
  registerCreated({ run, name, id: 'new-1' })
  registerCreated({ run, name: ownName(run, 'second'), id: 'new-2' })
  return { run, ...transport }
}

it('uses collision-resistant run identity, exact names and baseline exclusion for ownership recovery', () => {
  const run = createRun([{ id: 'old', name: 'Keep' }])
  expect(createRun().runId).not.toBe(run.runId)
  const name = ownName(run, 'import')
  recoverOwned(run, [
    { id: 'old', name },
    { id: 'lost-response', name },
    { id: 'other-run', name: 'Smoke another-run import' },
    { id: 'prefix', name: `${name} other` },
    { id: 'unrelated-new', name: 'Other' },
  ])
  expect([...run.ids]).toEqual(['lost-response'])
  expect(() => registerCreated({ run, name, id: 'old' })).toThrow(
    'pre-existing'
  )
  expect(() => registerCreated({ run, name: 'Other', id: 'new' })).toThrow(
    'not owned'
  )
})
it('matches same-origin exact endpoints and methods, never area PATCH as layer PATCH', () => {
  const request = (url, method) => ({ url: () => url, method: () => method })
  const target = { baseUrl, method: 'PATCH', pathname: `${API_PATH}/layer/a` }
  expect(
    matchesRequest({
      ...target,
      request: request(`${baseUrl}${API_PATH}/layer/a`, 'PATCH'),
    })
  ).toBe(true)
  for (const [url, method] of [
    [`${baseUrl}${API_PATH}/layer/a/area/b`, 'PATCH'],
    [`https://elsewhere.test${API_PATH}/layer/a`, 'PATCH'],
    [`${baseUrl}${API_PATH}/layer/ab`, 'PATCH'],
    [`${baseUrl}${API_PATH}/layer/a`, 'POST'],
  ]) {
    expect(matchesRequest({ ...target, request: request(url, method) })).toBe(
      false
    )
  }
})
const readTestForm = async (request) =>
  new Response(request.postDataBuffer(), {
    headers: await request.allHeaders(),
  }).formData()
const createRequest = ({ name, response, method = 'POST' }) => ({
  url: () => `${baseUrl}${API_PATH}/layer`,
  method: () => method,
  allHeaders: async () => ({
    'content-type': 'multipart/form-data; boundary=smoke',
  }),
  postDataBuffer: () =>
    Buffer.from(
      `--smoke\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}\r\n--smoke--\r\n`
    ),
  response: async () => response,
})
it('counts failed/rejected/aborted create attempts at request time, registers success before navigation, and detaches', async () => {
  const context = new EventEmitter()
  const run = createRun()
  const name = ownName(run, 'import')
  const detach = observeCreates({
    context,
    run,
    baseUrl,
    getPhase: () => 'negative',
    readForm: readTestForm,
  })
  for (const status of [400, 403, 500, null, 201]) {
    const request = createRequest({
      name,
      response: status
        ? { status: () => status, json: async () => ({ id: 'server-id' }) }
        : null,
    })
    context.emit('request', request)
    expect(run.attempts).toHaveLength(
      [400, 403, 500, null, 201].indexOf(status) + 1
    )
    context.emit(status ? 'requestfinished' : 'requestfailed', request)
  }
  await expect(settleCreates({ run, timeoutMs: 200 })).rejects.toThrow(
    'Create observation failed'
  )
  expect(run.observationErrors[0].message).toContain(
    'acceptance remains ambiguous'
  )
  expect([...run.ids]).toEqual(['server-id'])
  expect(run.attempts.every((attempt) => attempt.phase === 'negative')).toBe(
    true
  )
  detach()
  expect(context.eventNames()).toEqual([])
})
it('reports bounded ambiguous create completion instead of certifying an early empty list', async () => {
  const context = new EventEmitter()
  const run = createRun()
  const detach = observeCreates({
    context,
    run,
    baseUrl,
    getPhase: () => 'import',
    readForm: readTestForm,
  })
  context.emit(
    'request',
    createRequest({ name: ownName(run, 'import'), response: null })
  )
  const { api } = makeTransport([])
  await expect(cleanupOwned({ run, api, timeoutMs: 5 })).rejects.toMatchObject({
    message: 'Owned cleanup failed',
    errors: [
      expect.objectContaining({
        message: expect.stringContaining('completion unresolved'),
      }),
    ],
  })
  detach()
})
it('reports malformed successful create responses and still recovers by exact name', async () => {
  const context = new EventEmitter()
  const run = createRun()
  const name = ownName(run, 'lost-response')
  const detach = observeCreates({
    context,
    run,
    baseUrl,
    getPhase: () => 'import',
    readForm: readTestForm,
  })
  const request = createRequest({
    name,
    response: {
      status: () => 201,
      json: async () => {
        throw new Error('body lost')
      },
    },
  })
  context.emit('request', request)
  context.emit('requestfinished', request)
  const { api, records } = makeTransport([{ id: 'accepted', name }])
  let error
  try {
    await cleanupOwned({ run, api, timeoutMs: 200 })
  } catch (caught) {
    error = caught
  }
  expect(formatError(error)).toContain('Create observation failed')
  expect([...run.ids]).toEqual(['accepted'])
  expect(records.size).toBe(0)
  detach()
})
it.each([
  'success',
  'post-create assertion',
  'navigation failure',
  'late console failure',
])(
  'uses the runner orchestration for %s, preserves unrelated records and always closes resources',
  async (failure) => {
    const { run, records, api } = setupOwned()
    const closed = []
    const work = executeLifecycle({
      task: async () => {
        // Same registration point as the real create response, before navigation.
        registerCreated({ run, name: ownName(run, 'import'), id: 'new-1' })
        if (
          failure === 'post-create assertion' ||
          failure === 'navigation failure'
        )
          throw new Error(failure)
      },
      cleanup: () => cleanupOwned({ run, api, timeoutMs: 200 }),
      close: [
        async () => {
          closed.push('context')
        },
        async () => {
          closed.push('browser')
        },
      ],
      collectIssues: () => {
        if (failure === 'late console failure') throw new Error(failure)
      },
    })
    if (failure === 'success') await expect(work).resolves.toBeUndefined()
    else await expect(work).rejects.toThrow('Smoke failed')
    expect(closed).toEqual(['context', 'browser'])
    expect([...records.keys()]).toEqual(['user-layer'])
    expect(run.cleanup).toEqual({
      attempted: ['new-1', 'new-2'],
      absent: ['new-1', 'new-2'],
      unresolved: [],
      verified: true,
    })
  }
)
it('recovers an accepted create whose response/navigation was lost without deleting same-prefix or pre-existing data', async () => {
  const run = createRun([
    { id: 'original', name: 'Original' },
    { id: 'other', name: 'Smoke other import' },
  ])
  const { api, records } = makeTransport([
    ...run.baseline.values(),
    { id: 'lost', name: ownName(run, 'import') },
  ])
  await cleanupOwned({ run, api, timeoutMs: 200 })
  expect(run.cleanup.absent).toEqual(['lost'])
  expect([...records.keys()]).toEqual(['original', 'other'])
})
it('accepts exact already-deleted 404 semantics and does not send DELETE again', async () => {
  const { run, records, api } = setupOwned()
  records.delete('new-1')
  await cleanupOwned({ run, api, timeoutMs: 200 })
  expect(
    api.mock.calls
      .filter(([call]) => call.method === 'DELETE')
      .map(([call]) => call.pathname)
  ).toEqual([`${API_PATH}/layer/new-2`])
  expect(run.cleanup.unresolved).toEqual([])
})
it.each(['DELETE failure', 'readback failure', 'wrong 404 body'])(
  'continues every owned cleanup after %s and reports unresolved IDs',
  async (failure) => {
    const { run, api: normalApi, records } = setupOwned()
    let deleted = false
    const api = async (request) => {
      if (request.pathname.endsWith('/new-1')) {
        if (request.method === 'DELETE') {
          deleted = true
          if (failure === 'DELETE failure')
            throw new Error('DELETE transport unavailable')
        } else if (deleted) {
          if (failure === 'readback failure')
            throw new Error('readback transport unavailable')
          if (failure === 'wrong 404 body')
            return { status: 404, body: { error: 'Unrelated not found' } }
        }
      }
      return normalApi(request)
    }
    let error
    try {
      await cleanupOwned({ run, api, timeoutMs: 200 })
    } catch (caught) {
      error = caught
    }
    expect(formatError(error)).toMatch(/cleanup new-1|readback new-1/)
    expect(run.cleanup.attempted).toEqual(['new-1', 'new-2'])
    expect(run.cleanup.unresolved).toEqual(['new-1'])
    expect(records.has('new-2')).toBe(false)
    expect(records.has('user-layer')).toBe(true)
  }
)
it('aggregates primary, cleanup, readback, late issue and independent close errors without printing success', async () => {
  const { run, api: normalApi } = setupOwned()
  const close = jest.fn().mockRejectedValue(new Error('context close failed'))
  const browserClose = jest.fn()
  const detach = jest.fn()
  const success = jest.fn()
  const api = async (request) => {
    if (request.method === 'DELETE' && request.pathname.endsWith('/new-1'))
      throw new Error('delete failed')
    if (request.anonymous) throw new Error('public readback failed')
    return normalApi(request)
  }
  let error
  try {
    await executeLifecycle({
      task: async () => {
        throw new Error('primary assertion')
      },
      cleanup: () => cleanupOwned({ run, api, timeoutMs: 200 }),
      close: [close, browserClose],
      collectIssues: () => {
        throw new Error('late app error')
      },
      detach,
    })
    success()
  } catch (caught) {
    error = caught
  }
  for (const text of [
    'primary assertion',
    'delete failed',
    'public readback failed',
    'context close failed',
    'late app error',
  ])
    expect(formatError(error)).toContain(text)
  expect(browserClose).toHaveBeenCalledTimes(1)
  expect(detach).toHaveBeenCalledTimes(1)
  expect(success).not.toHaveBeenCalled()
  expect(run.cleanup.attempted).toEqual(['new-1', 'new-2'])
})
it('reports concurrent unrelated changes but never deletes them or a run ID renamed externally', async () => {
  const { run, records, api } = setupOwned()
  records.get('new-1').name = 'Changed by someone else'
  records.get('user-layer').name = 'Concurrent edit'
  records.set('someone-new', { id: 'someone-new', name: 'Concurrent create' })
  await expect(cleanupOwned({ run, api, timeoutMs: 200 })).rejects.toThrow(
    'Owned cleanup failed'
  )
  expect(records.has('new-1')).toBe(true)
  expect(records.has('someone-new')).toBe(true)
  expect(
    api.mock.calls
      .filter(([call]) => call.method === 'DELETE')
      .map(([call]) => call.pathname)
  ).toEqual([`${API_PATH}/layer/new-2`])
})

const consoleMessage = (overrides = {}) => ({
  type: () => 'error',
  text: () => 'Unexpected app error',
  args: () => [{}],
  location: () => ({
    url: `${baseUrl}/src/applets/luonnonmetsakartat/app.tsx`,
    lineNumber: 1,
    columnNumber: 2,
  }),
  ...overrides,
})
it('fails all page/console errors including unknown sources and collects newly opened pages until teardown', () => {
  const context = new EventEmitter()
  const first = new EventEmitter()
  context.pages = () => [first]
  let phase = 'import'
  const collector = createIssueCollector({ context, getPhase: () => phase })
  first.emit('console', consoleMessage({ location: () => ({}) }))
  expect(() => collector.assertNoIssues()).toThrow('Unexpected app error')
  const second = new EventEmitter()
  context.emit('page', second)
  phase = 'cleanup'
  second.emit('pageerror', new Error('Late page error'))
  expect(() => collector.assertNoIssues()).toThrow('Late page error')
  expect(() => collector.assertNoIssues()).toThrow('cleanup')
  collector.detach()
  expect(context.eventNames()).toEqual([])
  expect(first.eventNames()).toEqual([])
  expect(second.eventNames()).toEqual([])
})
it.each([403, 404])(
  'allows only a confirmed browser resource diagnostic for exact page/GET/URL/status/phase (%s)',
  (status) => {
    const page = {}
    const rule = {
      page,
      method: 'GET',
      url: `${baseUrl}/expected`,
      status,
      phase: 'negative',
    }
    const issue = {
      kind: 'console',
      page,
      argumentCount: 0,
      lineNumber: 0,
      columnNumber: 0,
      url: rule.url,
      phase: 'negative',
      message: `Failed to load resource: the server responded with a status of ${status} (${status === 403 ? 'Forbidden' : 'Not Found'})`,
    }
    expect(isExpectedResourceDiagnostic(issue, [rule])).toBe(true)
    expect(isExpectedResourceDiagnostic(issue, [])).toBe(false)
    for (const override of [
      { kind: 'page' },
      { page: {} },
      { phase: 'import' },
      { url: `${baseUrl}/another` },
      { argumentCount: 1 },
      { lineNumber: 2 },
      { message: 'Error validating duplicate ID' },
      {
        message:
          'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
      },
    ]) {
      expect(
        isExpectedResourceDiagnostic({ ...issue, ...override }, [rule])
      ).toBe(false)
    }
    expect(
      isExpectedResourceDiagnostic(issue, [{ ...rule, method: 'POST' }])
    ).toBe(false)
  }
)
it('does not exempt matching application console.error text from an intentional 403 diagnostic', () => {
  const page = new EventEmitter()
  const context = new EventEmitter()
  context.pages = () => [page]
  const collector = createIssueCollector({
    context,
    getPhase: () => 'rejected admin gate',
  })
  const url = `${baseUrl}${API_PATH}/admin/validate`
  const message = consoleMessage({
    text: () =>
      'Failed to load resource: the server responded with a status of 403 (Forbidden)',
    args: () => [],
    location: () => ({ url, lineNumber: 0, columnNumber: 0 }),
  })
  page.emit('console', message)
  expect(() => collector.assertNoIssues()).toThrow('Unexpected browser errors')
  collector.allowNegativeResponse({
    response: {
      status: () => 403,
      url: () => url,
      request: () => ({ method: () => 'GET' }),
    },
    page,
    phase: 'rejected admin gate',
  })
  expect(() => collector.assertNoIssues()).not.toThrow()
  expect(collector.tolerated()).toHaveLength(1)
  page.emit('console', { ...message, args: () => [{}] })
  expect(() => collector.assertNoIssues()).toThrow('Unexpected browser errors')
  collector.detach()
})

it('observes the original file FormData at native send and correlates it with the real page/method/URL request', async () => {
  const vm = require('node:vm')
  const page = {}
  let binding
  let init
  let initArgs
  const context = {
    exposeBinding: async (_name, callback) => {
      binding = callback
    },
    addInitScript: async (callback, args) => {
      init = callback
      initArgs = args
    },
  }
  const recorder = await captureFormSubmissions({
    context,
    baseUrl,
    timeoutMs: 50,
  })
  const originalOpen = jest.fn()
  const originalSend = jest.fn()
  const NativeXhr = function () {}
  NativeXhr.prototype.open = originalOpen
  NativeXhr.prototype.send = originalSend
  vm.runInNewContext(`(${init.toString()})(args)`, {
    XMLHttpRequest: NativeXhr,
    FormData,
    URL,
    args: initArgs,
    location: { href: `${baseUrl}/fi` },
    window: { __avoinSmokeObserveForm: (data) => binding({ page }, data) },
  })
  const xhr = new NativeXhr()
  const form = new FormData()
  form.append(
    'bulk_images',
    new Blob(['actual image bytes'], { type: 'image/png' }),
    'one.png'
  )
  form.append(
    'bulk_images',
    new Blob(['second image'], { type: 'image/png' }),
    'two.png'
  )
  form.append('bulk_area_ids', 'area-a')
  form.append('bulk_area_ids', 'area-a')
  xhr.open('PATCH', `${API_PATH}/layer/owned`, true)
  xhr.send(form)
  expect(originalOpen).toHaveBeenCalledWith(
    'PATCH',
    `${API_PATH}/layer/owned`,
    true
  )
  expect(originalSend).toHaveBeenCalledWith(form)
  expect(originalSend.mock.calls[0][0]).toBe(form)
  const request = {
    frame: () => ({ page: () => page }),
    method: () => 'PATCH',
    url: () => `${baseUrl}${API_PATH}/layer/owned`,
    postDataBuffer: () => {
      throw new Error('Chromium file body unavailable')
    },
  }
  const observed = await recorder.read(request)
  expect(observed.getAll('bulk_images')).toEqual([
    { name: 'one.png', type: 'image/png', size: 18 },
    { name: 'two.png', type: 'image/png', size: 12 },
  ])
  expect(observed.getAll('bulk_area_ids')).toEqual(['area-a', 'area-a'])
  expect(await recorder.read(request)).toBe(observed)
  expect(form.getAll('bulk_images').map((file) => file.name)).toEqual([
    'one.png',
    'two.png',
  ])
  recorder.detach()
})
it('never matches a submission to another page, method or URL, and bounds missing evidence', async () => {
  let binding
  const page = {}
  const context = {
    exposeBinding: async (_name, callback) => {
      binding = callback
    },
    addInitScript: async () => {},
  }
  const recorder = await captureFormSubmissions({
    context,
    baseUrl,
    timeoutMs: 5,
  })
  const url = `${baseUrl}${API_PATH}/layer`
  const request = {
    frame: () => ({ page: () => page }),
    method: () => 'POST',
    url: () => url,
  }
  binding(
    { page: {} },
    { method: 'POST', url, entries: [['name', 'wrong-page']] }
  )
  binding(
    { page },
    { method: 'PATCH', url, entries: [['name', 'wrong-method']] }
  )
  binding(
    { page },
    { method: 'POST', url: `${url}/another`, entries: [['name', 'wrong-url']] }
  )
  await expect(recorder.read(request)).rejects.toThrow(
    'No observed FormData submission'
  )
  recorder.detach()
})
it('reports closing an incomplete form observer instead of swallowing its pending evidence', async () => {
  const context = {
    exposeBinding: async () => {},
    addInitScript: async () => {},
  }
  const recorder = await captureFormSubmissions({
    context,
    baseUrl,
    timeoutMs: 1000,
  })
  const request = {
    frame: () => ({ page: () => null }),
    method: () => 'POST',
    url: () => `${baseUrl}${API_PATH}/layer`,
  }
  const pending = recorder.read(request)
  recorder.detach()
  await expect(pending).rejects.toThrow('closed before submission')
})
it('refuses speculative console exceptions for arbitrary API endpoints or phases', () => {
  const context = new EventEmitter()
  context.pages = () => []
  const collector = createIssueCollector({ context, getPhase: () => 'import' })
  for (const [status, url, phase] of [
    [403, `${baseUrl}${API_PATH}/layer`, 'rejected admin gate'],
    [403, `${baseUrl}${API_PATH}/admin/validate`, 'import'],
    [
      404,
      `${baseUrl}/unrelated`,
      'canonical/locales/removed legacy routes (live main)',
    ],
  ]) {
    expect(() =>
      collector.allowNegativeResponse({
        response: {
          status: () => status,
          url: () => url,
          request: () => ({ method: () => 'GET' }),
        },
        page: {},
        phase,
      })
    ).toThrow('Only asserted')
  }
  collector.detach()
})

it('limits observed MML noise to exact upstream-body/GET/500/background/phase evidence', () => {
  const {
    isMmlUpstreamFailure,
  } = require('./luonnonmetsakartat-smoke-lifecycle')
  const response = {
    baseUrl,
    url: `${baseUrl}/api/map/core/mml/tms/13/4666/2366?layer=taustakartta`,
    method: 'GET',
    status: 500,
    phase: 'area metadata UI edit and WFS readback',
    body: 'Tile upstream request failed',
  }
  expect(isMmlUpstreamFailure(response)).toBe(true)
  expect(
    isMmlUpstreamFailure({
      ...response,
      phase: 'canonical/locales/removed legacy routes (live main)',
    })
  ).toBe(true)
  for (const change of [
    { body: 'API key not configured' },
    { body: 'Internal Server Error' },
    { status: 403 },
    { method: 'POST' },
    { phase: 'valid ZIP import and fresh hidden-layer readback' },
    { url: `${baseUrl}/api/luonnonmetsakartat/geoserver/mock/ows` },
    {
      url: 'https://example.org/api/map/core/mml/tms/13/4666/2366?layer=taustakartta',
    },
    { url: `${baseUrl}/api/map/core/mml/tms/13/4666/2366?layer=maastokartta` },
    {
      url: `${baseUrl}/api/map/core/mml/tms/13/4666/2366?layer=taustakartta&extra=1`,
    },
  ])
    expect(isMmlUpstreamFailure({ ...response, ...change })).toBe(false)
})
it('requires the real MML response body before tolerating a resource diagnostic; matching application errors still fail', async () => {
  const context = new EventEmitter()
  const page = new EventEmitter()
  context.pages = () => [page]
  const collector = createIssueCollector({
    context,
    baseUrl,
    getPhase: () => 'area metadata UI edit and WFS readback',
  })
  const url = `${baseUrl}/api/map/core/mml/tms/8/144/72?layer=taustakartta`
  const diagnostic = consoleMessage({
    text: () =>
      'Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
    args: () => [],
    location: () => ({ url, lineNumber: 0, columnNumber: 0 }),
  })
  page.emit('console', diagnostic)
  expect(() => collector.assertNoIssues()).toThrow()
  context.emit('response', {
    url: () => url,
    status: () => 500,
    text: async () => 'Tile upstream request failed',
    request: () => ({
      method: () => 'GET',
      frame: () => ({ page: () => page }),
    }),
  })
  await collector.flush()
  expect(() => collector.assertNoIssues()).not.toThrow()
  expect(collector.tolerated()).toHaveLength(1)
  page.emit('console', { ...diagnostic, args: () => [{}] })
  expect(() => collector.assertNoIssues()).toThrow()
  collector.detach()
  expect(context.eventNames()).toEqual([])
})
it('does not hide unreadable MML response evidence, including during teardown', async () => {
  const context = new EventEmitter()
  context.pages = () => []
  const collector = createIssueCollector({
    context,
    baseUrl,
    getPhase: () => 'area metadata UI edit and WFS readback',
  })
  context.emit('response', {
    url: () => `${baseUrl}/api/map/core/mml/tms/8/144/72?layer=taustakartta`,
    status: () => 500,
    text: async () => {
      throw new Error('closed before body read')
    },
    request: () => ({
      method: () => 'GET',
      frame: () => ({ page: () => ({}) }),
    }),
  })
  await collector.flush()
  expect(() => collector.assertNoIssues()).toThrow(
    'Cannot inspect MML failure response'
  )
  collector.detach()
})

it('keeps a network-finished create unresolved until its submitted form and response inspection finish', async () => {
  const context = new EventEmitter()
  const run = createRun()
  const name = ownName(run, 'import')
  let resolveForm
  const form = new Promise((resolve) => {
    resolveForm = resolve
  })
  const detach = observeCreates({
    context,
    run,
    baseUrl,
    getPhase: () => 'import',
    readForm: () => form,
  })
  const request = createRequest({
    name,
    response: {
      status: () => 201,
      json: async () => ({ id: 'created', name }),
    },
  })
  context.emit('request', request)
  context.emit('requestfinished', request)
  context.emit('requestfinished', request)
  await expect(settleCreates({ run, timeoutMs: 5 })).rejects.toThrow(
    'completion unresolved'
  )
  expect(run.attempts).toHaveLength(1)
  expect(run.attempts[0].finished).toBe(false)
  resolveForm({ get: () => name })
  await settleCreates({ run, timeoutMs: 200 })
  expect(run.attempts[0].finished).toBe(true)
  expect([...run.ids]).toEqual(['created'])
  detach()
})
