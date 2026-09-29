// Failure/ownership mechanisms for the existing browser runner, not a second harness.
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')

const API_PATH = '/api/luonnonmetsakartat'
const layerPath = (id) => `${API_PATH}/layer/${encodeURIComponent(id)}`
const createRun = (baseline = []) => {
  const runId = `${Date.now()}-${randomUUID()}`
  return {
    runId,
    baseline: new Map(baseline.map((layer) => [layer.id, layer])),
    names: new Set(),
    ids: new Set(),
    attempts: [],
    observationErrors: [],
    cleanup: { attempted: [], absent: [], unresolved: [] },
  }
}
const ownName = (run, suffix) => {
  const name = `Smoke ${run.runId} ${suffix}`
  run.names.add(name)
  return name
}
const registerCreated = ({ run, name, id }) => {
  assert(run.names.has(name), 'Create name is not owned by this run')
  assert(typeof id === 'string' && id.length > 0, 'Create response has no ID')
  assert(!run.baseline.has(id), `Create reused pre-existing ID ${id}`)
  run.ids.add(id)
}
const recoverOwned = (run, layers) => {
  for (const layer of layers) {
    if (run.names.has(layer.name) && !run.baseline.has(layer.id)) {
      run.ids.add(layer.id)
    }
  }
}
const matchesRequest = ({ request, baseUrl, method, pathname }) => {
  const url = new URL(request.url())
  return (
    url.origin === new URL(baseUrl).origin &&
    url.pathname === pathname &&
    request.method() === method
  )
}
// Count at request time, including non-201, rejected and aborted attempts. Keep
// observing until all browser contexts are closed, even during cleanup.
const observeCreates = ({ context, run, baseUrl, getPhase, readForm }) => {
  const onRequest = (request) => {
    if (
      !matchesRequest({
        request,
        baseUrl,
        method: 'POST',
        pathname: `${API_PATH}/layer`,
      })
    )
      return
    let finish
    const attempt = {
      request,
      phase: getPhase(),
      done: new Promise((resolve) => {
        finish = resolve
      }),
      finished: false,
      name: undefined,
    }
    run.attempts.push(attempt)
    const metadata = Promise.resolve()
      .then(() => readForm(request))
      .then((form) => {
        attempt.name = form.get('name')
        assert(run.names.has(attempt.name), 'Unexpected unowned create request')
      })
      .catch((error) => {
        run.observationErrors.push(error)
      })
    attempt.complete = async () => {
      if (attempt.completionStarted) return
      attempt.completionStarted = true
      try {
        await metadata
        const response = await request.response()
        if (!response) {
          attempt.ambiguous = true
          throw new Error(
            'Create transport failed; server acceptance remains ambiguous'
          )
        }
        if ([200, 201].includes(response.status())) {
          const body = await response.json()
          registerCreated({ run, name: attempt.name ?? body.name, id: body.id })
        }
      } catch (error) {
        run.observationErrors.push(error)
      } finally {
        attempt.finished = true
        finish()
      }
    }
  }
  const onComplete = (request) => {
    const attempt = run.attempts.find((entry) => entry.request === request)
    if (attempt) void attempt.complete()
  }
  context.on('request', onRequest)
  context.on('requestfinished', onComplete)
  context.on('requestfailed', onComplete)
  return () => {
    context.off('request', onRequest)
    context.off('requestfinished', onComplete)
    context.off('requestfailed', onComplete)
  }
}
const settleCreates = async ({ run, timeoutMs }) => {
  let timer
  try {
    await Promise.race([
      (async () => {
        let count
        do {
          count = run.attempts.length
          await Promise.all(run.attempts.map((attempt) => attempt.done))
        } while (count !== run.attempts.length)
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                'Create completion unresolved; cleanup cannot certify absence'
              )
            ),
          timeoutMs
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
  if (run.observationErrors.length)
    throw new AggregateError(run.observationErrors, 'Create observation failed')
}
const requireStatus = (result, status, operation) => {
  assert.equal(
    result.status,
    status,
    `${operation}: expected HTTP ${status}, got ${result.status}`
  )
  return result.body
}
const requireAbsent = (result, operation) => {
  requireStatus(result, 404, operation)
  assert.deepEqual(
    result.body,
    { error: 'Mock layer not found' },
    `${operation}: unexpected 404 body`
  )
}
const cleanupOwned = async ({ run, api, timeoutMs }) => {
  const errors = []
  const attempt = async (label, task) => {
    try {
      await task()
    } catch (error) {
      errors.push(new Error(`${label}: ${formatError(error)}`))
    }
  }
  await attempt('settle creates', () => settleCreates({ run, timeoutMs }))
  await attempt('recover owned names', async () => {
    recoverOwned(
      run,
      requireStatus(
        await api({ pathname: `${API_PATH}/layers` }),
        200,
        'admin recovery list'
      )
    )
  })
  for (const id of run.ids) {
    run.cleanup.attempted.push(id)
    await attempt(`cleanup ${id}`, async () => {
      const before = await api({ pathname: layerPath(id) })
      if (before.status === 404) requireAbsent(before, `read ${id}`)
      else {
        requireStatus(before, 200, `read ${id}`)
        assert.equal(before.body.id, id)
        assert(
          run.names.has(before.body.name),
          `Owned ID ${id} was renamed externally; refusing deletion`
        )
        const deleted = await api({ pathname: layerPath(id), method: 'DELETE' })
        if (deleted.status === 404) requireAbsent(deleted, `delete ${id}`)
        else requireStatus(deleted, 200, `delete ${id}`)
      }
    })
    await attempt(`readback ${id}`, async () => {
      requireAbsent(
        await api({ pathname: layerPath(id) }),
        `detail absence ${id}`
      )
      run.cleanup.absent.push(id)
    })
  }
  await attempt('authenticated final list/baseline', async () => {
    const layers = requireStatus(
      await api({ pathname: `${API_PATH}/layers` }),
      200,
      'admin final list'
    )
    assert(
      !layers.some(
        (layer) => run.ids.has(layer.id) || run.names.has(layer.name)
      ),
      'Owned layer remains in authenticated list'
    )
    const remaining = new Map(layers.map((layer) => [layer.id, layer]))
    for (const [id, original] of run.baseline) {
      assert.deepEqual(
        remaining.get(id),
        original,
        `Unrelated baseline record ${id} changed (possibly concurrent activity)`
      )
    }
    assert.deepEqual(
      [...remaining.keys()].sort(),
      [...run.baseline.keys()].sort(),
      'Unrelated list membership changed; nothing outside run ownership was deleted'
    )
  })
  await attempt('anonymous final list', async () => {
    const layers = requireStatus(
      await api({ pathname: `${API_PATH}/layers`, anonymous: true }),
      200,
      'public final list'
    )
    assert(
      !layers.some(
        (layer) => run.ids.has(layer.id) || run.names.has(layer.name)
      ),
      'Owned layer remains in public list'
    )
  })
  run.cleanup.unresolved = [...run.ids].filter(
    (id) => !run.cleanup.absent.includes(id)
  )
  run.cleanup.verified = errors.length === 0
  if (errors.length) throw new AggregateError(errors, 'Owned cleanup failed')
}

// Same orchestration is used by runSmoke and failure-injection regressions.
// Independent finally tasks cannot replace a primary error or skip teardown.
const executeLifecycle = async ({
  task,
  cleanup,
  close = [],
  collectIssues = () => {},
  detach = () => {},
}) => {
  const errors = []
  const collect = async (label, work) => {
    try {
      await work()
    } catch (error) {
      errors.push(new Error(`${label}: ${formatError(error)}`))
    }
  }
  try {
    await collect('lifecycle', task)
  } finally {
    await collect('cleanup', cleanup)
    for (const [index, work] of close.entries())
      await collect(`close ${index}`, work)
    await collect('browser issues', collectIssues)
    await collect('detach', detach)
  }
  if (errors.length) throw new AggregateError(errors, 'Smoke failed')
}
const formatError = (error) =>
  error instanceof AggregateError
    ? `${error.message}\n${error.errors.map(formatError).join('\n')}`
    : error.message || String(error)

// Chromium's own HTTP diagnostic has no JS arguments and a resource location.
// Denial/not-found rules require response and UI assertions; the separate MML
// exception requires a checked upstream-failure body from the exact response.
const isExpectedResourceDiagnostic = (issue, rules) =>
  issue.kind === 'console' &&
  issue.argumentCount === 0 &&
  issue.lineNumber === 0 &&
  issue.columnNumber === 0 &&
  rules.some(
    (rule) =>
      rule.page === issue.page &&
      rule.phase === issue.phase &&
      rule.method === 'GET' &&
      rule.url === issue.url &&
      issue.message ===
        `Failed to load resource: the server responded with a status of ${rule.status} (${{ 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' }[rule.status]})`
  )

const isMmlFailureCandidate = ({ baseUrl, url, method, status, phase }) => {
  if (!baseUrl || method !== 'GET' || status !== 500) return false
  const parsed = new URL(url)
  return (
    parsed.origin === new URL(baseUrl).origin &&
    /^\/api\/map\/core\/mml\/tms\/\d+\/\d+\/\d+$/.test(parsed.pathname) &&
    parsed.search === '?layer=taustakartta' &&
    (phase === 'area metadata UI edit and WFS readback' ||
      /^canonical\/locales\/removed legacy routes \(live (main|standalone)\)$/.test(
        phase
      ))
  )
}
const isMmlUpstreamFailure = (response) =>
  isMmlFailureCandidate(response) &&
  response.body === 'Tile upstream request failed'

const createIssueCollector = ({ context, getPhase, baseUrl }) => {
  const issues = []
  const rules = []
  const disposers = []
  const observations = []
  const onResponse = (response) => {
    const metadata = {
      baseUrl,
      url: response.url(),
      method: response.request().method(),
      status: response.status(),
      phase: getPhase(),
    }
    if (!isMmlFailureCandidate(metadata)) return
    const page = response.request().frame().page()
    observations.push(
      response
        .text()
        .then((body) => {
          if (isMmlUpstreamFailure({ ...metadata, body })) {
            rules.push({
              ...metadata,
              page,
              reason: 'MML upstream socket/transport failure',
            })
          }
        })
        .catch((error) => {
          issues.push({
            kind: 'observer',
            page,
            phase: metadata.phase,
            url: metadata.url,
            message: `Cannot inspect MML failure response: ${error.message}`,
          })
        })
    )
  }
  const attach = (page) => {
    const onError = (error) =>
      issues.push({
        kind: 'page',
        phase: getPhase(),
        page,
        message: error.message,
      })
    const onConsole = (message) => {
      if (message.type() !== 'error') return
      issues.push({
        kind: 'console',
        page,
        phase: getPhase(),
        message: message.text(),
        argumentCount: message.args().length,
        ...message.location(),
      })
    }
    page.on('pageerror', onError)
    page.on('console', onConsole)
    disposers.push(() => {
      page.off('pageerror', onError)
      page.off('console', onConsole)
    })
  }
  context.on('page', attach)
  context.on('response', onResponse)
  context.pages().forEach(attach)
  const printable = ({ page: _page, ...issue }) => issue
  return {
    flush: () => Promise.all(observations),
    allowNegativeResponse: ({ response, page, phase }) => {
      assert([403, 404].includes(response.status()))
      assert.equal(response.request().method(), 'GET')
      const pathname = new URL(response.url()).pathname
      assert(
        (response.status() === 403 &&
          phase === 'rejected admin gate' &&
          pathname === `${API_PATH}/admin/validate`) ||
          (response.status() === 404 &&
            /^canonical\/locales\/removed legacy routes \(live (main|standalone)\)$/.test(
              phase
            ) &&
            /^\/fi(?:\/luonnonmetsakartat)?\/admin\/(?:tuo|taso\/[^/]+(?:\/(?:asetukset|kuvat))?)$/.test(
              pathname
            )),
        'Only asserted admin denial and removed legacy documents may allow resource diagnostics'
      )
      rules.push({
        page,
        phase,
        method: 'GET',
        url: response.url(),
        status: response.status(),
      })
    },
    assertNoIssues: () => {
      const fatal = issues.filter(
        (issue) => !isExpectedResourceDiagnostic(issue, rules)
      )
      assert.equal(
        fatal.length,
        0,
        `Unexpected browser errors: ${JSON.stringify(fatal.map(printable))}`
      )
    },
    tolerated: () =>
      issues
        .filter((issue) => isExpectedResourceDiagnostic(issue, rules))
        .map(printable),
    detach: () => {
      context.off('page', attach)
      context.off('response', onResponse)
      disposers.forEach((dispose) => dispose())
    },
  }
}

module.exports = {
  API_PATH,
  layerPath,
  createRun,
  ownName,
  registerCreated,
  recoverOwned,
  matchesRequest,
  observeCreates,
  settleCreates,
  requireStatus,
  requireAbsent,
  cleanupOwned,
  executeLifecycle,
  formatError,
  isExpectedResourceDiagnostic,
  isMmlUpstreamFailure,
  createIssueCollector,
}

// Chromium omits postDataBuffer() for multipart requests containing File/Blob.
// Observe the actual XHR.send(FormData) boundary without changing it. The binding
// survives navigation; match it to the independently observed network request.
const captureFormSubmissions = async ({ context, baseUrl, timeoutMs }) => {
  const submissions = []
  const pending = []
  const cached = new WeakMap()
  const flush = () => {
    for (const consumer of [...pending]) {
      const index = submissions.findIndex(
        (submission) =>
          submission.page === consumer.request.frame().page() &&
          submission.url === consumer.request.url() &&
          submission.method === consumer.request.method()
      )
      if (index < 0) continue
      const [submission] = submissions.splice(index, 1)
      pending.splice(pending.indexOf(consumer), 1)
      clearTimeout(consumer.timer)
      consumer.resolve({
        get: (name) =>
          submission.entries.find(([key]) => key === name)?.[1] ?? null,
        getAll: (name) =>
          submission.entries
            .filter(([key]) => key === name)
            .map(([, value]) => value),
      })
    }
  }
  await context.exposeBinding(
    '__avoinSmokeObserveForm',
    ({ page }, submission) => {
      submissions.push({ page, ...submission })
      flush()
    }
  )
  await context.addInitScript(
    ({ baseUrl, apiPath }) => {
      const requests = new WeakMap()
      const originalOpen = XMLHttpRequest.prototype.open
      const originalSend = XMLHttpRequest.prototype.send
      XMLHttpRequest.prototype.open = function (method, url, ...args) {
        requests.set(this, {
          method: method.toUpperCase(),
          url: new URL(url, location.href).href,
        })
        return originalOpen.call(this, method, url, ...args)
      }
      XMLHttpRequest.prototype.send = function (body) {
        const request = requests.get(this)
        if (
          body instanceof FormData &&
          request &&
          new URL(request.url).origin === baseUrl &&
          new URL(request.url).pathname.startsWith(apiPath)
        ) {
          void window.__avoinSmokeObserveForm({
            ...request,
            entries: [...body.entries()].map(([key, value]) => [
              key,
              typeof value === 'string'
                ? value
                : { name: value.name, type: value.type, size: value.size },
            ]),
          })
        }
        return originalSend.call(this, body)
      }
    },
    { baseUrl: new URL(baseUrl).origin, apiPath: API_PATH }
  )
  return {
    read: (request) => {
      if (!cached.has(request)) {
        cached.set(
          request,
          new Promise((resolve, reject) => {
            const consumer = { request, resolve, reject }
            consumer.timer = setTimeout(() => {
              pending.splice(pending.indexOf(consumer), 1)
              reject(
                new Error(
                  `No observed FormData submission for ${request.method()} ${new URL(request.url()).pathname}`
                )
              )
            }, timeoutMs)
            pending.push(consumer)
            flush()
          })
        )
      }
      return cached.get(request)
    },
    detach: () => {
      for (const consumer of pending.splice(0)) {
        clearTimeout(consumer.timer)
        consumer.reject(new Error('Form observation closed before submission'))
      }
    },
  }
}
module.exports.captureFormSubmissions = captureFormSubmissions
