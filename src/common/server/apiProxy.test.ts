/** @jest-environment node */
import { describe, expect, it, jest } from '@jest/globals'

import { handleApiProxyRequest } from './apiProxy'

const baseUrlEnvName = 'TEST_API_URL'
const routePrefix = '/api/example'
const env: Record<string, string | undefined> = {
  TEST_API_URL: '  https://upstream.example.test/base///  ',
}
const search = '?tab=areas&tab=pictures&q=A%2BB%20C&empty='

// Every invocation injects fetch; this suite cannot fall back to a live service.
const proxy = ({
  request = new Request(
    `https://map.example.test${routePrefix}/layer/a%2Fb${search}`
  ),
  upstream = new Response('ok'),
  environment = env,
  fetchFn = jest.fn<typeof fetch>().mockResolvedValue(upstream),
  logger = { error: jest.fn() },
} = {}) => ({
  fetchFn,
  logger,
  response: handleApiProxyRequest({
    baseUrlEnvName,
    routePrefix,
    request,
    deps: { env: environment, fetchFn, logger },
  }),
})

describe('handleApiProxyRequest live transport', () => {
  it.each([undefined, '', ' \t\n '])(
    'rejects missing config %p before fetch',
    async (value) => {
      const { response, fetchFn } = proxy({
        environment: { TEST_API_URL: value },
      })
      const result = await response
      expect(result.status).toBe(500)
      expect(await result.text()).toBe('TEST_API_URL is not configured')
      expect(fetchFn).not.toHaveBeenCalled()
    }
  )

  it.each(['/api/example', '/api/example/', '/api/example-other/layer'])(
    'rejects missing/nonmatching proxy tail %s',
    async (path) => {
      const { response, fetchFn } = proxy({
        request: new Request(`https://map.example.test${path}`),
      })
      const result = await response
      expect(result.status).toBe(404)
      expect(await result.text()).toBe('Proxy path is missing')
      expect(fetchFn).not.toHaveBeenCalled()
    }
  )

  it('normalizes base whitespace/slashes and preserves base path, encoded tail and query bytes', async () => {
    const { response, fetchFn } = proxy()
    expect((await response).status).toBe(200)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(String(fetchFn.mock.calls[0][0])).toBe(
      `https://upstream.example.test/base/layer/a%2Fb${search}`
    )
  })

  it('forwards only allowlisted request headers', async () => {
    const { response, fetchFn } = proxy({
      request: new Request(`https://map.example.test${routePrefix}/layer`, {
        headers: {
          accept: 'application/json',
          authorization: 'Bearer synthetic-token',
          'content-type': 'application/zip',
          'x-user-agent': 'test-client',
          cookie: 'session=private',
          host: 'private.test',
          connection: 'keep-alive',
          'x-private': 'private',
          'proxy-authorization': 'private',
        },
      }),
    })
    await response
    expect(fetchFn.mock.calls[0][1]?.headers).toBeInstanceOf(Headers)
    expect(
      Object.fromEntries(
        (fetchFn.mock.calls[0][1]?.headers as Headers).entries()
      )
    ).toEqual({
      accept: 'application/json',
      authorization: 'Bearer synthetic-token',
      'content-type': 'application/zip',
      'x-user-agent': 'test-client',
    })
  })

  it.each(['GET', 'HEAD'])(
    '%s sends neither a body nor absent authorization',
    async (method) => {
      const { response, fetchFn } = proxy({
        request: new Request(`https://map.example.test${routePrefix}/layer`, {
          method,
        }),
        upstream: new Response(null, { status: 200 }),
      })
      const result = await response
      const init = fetchFn.mock.calls[0][1]
      expect(init?.method).toBe(method)
      expect(init).not.toHaveProperty('body')
      expect((init?.headers as Headers).has('authorization')).toBe(false)
      expect(result.status).toBe(200)
      expect(result.body).toBeNull()
    }
  )

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s forwards explicit binary bytes unchanged',
    async (method) => {
      const body = new Uint8Array([0, 255, 128, 13, 10, 42])
      const { response, fetchFn } = proxy({
        request: new Request(`https://map.example.test${routePrefix}/layer`, {
          method,
          body,
          headers: { 'content-type': 'application/octet-stream' },
        }),
      })
      await response
      const init = fetchFn.mock.calls[0][1]
      expect(init?.method).toBe(method)
      expect(new Uint8Array(init?.body as ArrayBuffer)).toEqual(body)
      expect((init?.headers as Headers).get('content-type')).toBe(
        'application/octet-stream'
      )
    }
  )

  it('preserves multipart bytes and the original boundary rather than re-encoding', async () => {
    const body = new FormData()
    body.append('name', 'Metsä')
    body.append(
      'zip_file',
      new Blob([new Uint8Array([0, 255, 80, 75])]),
      'layer.zip'
    )
    const request = new Request(
      `https://map.example.test${routePrefix}/layer`,
      { method: 'POST', body }
    )
    const bytes = await request.clone().arrayBuffer()
    const { response, fetchFn } = proxy({ request })
    await response
    expect(
      new Uint8Array(fetchFn.mock.calls[0][1]?.body as ArrayBuffer)
    ).toEqual(new Uint8Array(bytes))
    expect(
      (fetchFn.mock.calls[0][1]?.headers as Headers).get('content-type')
    ).toBe(request.headers.get('content-type'))
    expect(request.headers.get('content-type')).toMatch(
      /^multipart\/form-data; boundary=/
    )
  })

  it('allows a bodyless DELETE and a null 204 response', async () => {
    const { response, fetchFn } = proxy({
      request: new Request(`https://map.example.test${routePrefix}/layer`, {
        method: 'DELETE',
      }),
      upstream: new Response(null, { status: 204 }),
    })
    const result = await response
    expect((fetchFn.mock.calls[0][1]?.body as ArrayBuffer).byteLength).toBe(0)
    expect(result.status).toBe(204)
    expect(result.body).toBeNull()
  })

  it.each<[string, Uint8Array<ArrayBuffer>]>([
    ['application/json', new TextEncoder().encode('{"name":"Metsä"}')],
    ['text/plain', new TextEncoder().encode('text\nresponse')],
    ['application/octet-stream', new Uint8Array([0, 255, 128])],
  ])(
    'preserves %s bytes, status/statusText and only response allowlist headers',
    async (contentType, body) => {
      const { response } = proxy({
        upstream: new Response(body, {
          status: 201,
          statusText: 'Created upstream',
          headers: {
            'content-type': contentType,
            'cache-control': 'private, max-age=30',
            'content-disposition': 'attachment; filename="layer.bin"',
            'set-cookie': 'private=1',
            'x-internal': 'private',
            'content-length': String(body.length),
            connection: 'close',
            'transfer-encoding': 'chunked',
          },
        }),
      })
      const result = await response
      expect(result.status).toBe(201)
      expect(result.statusText).toBe('Created upstream')
      expect(new Uint8Array(await result.arrayBuffer())).toEqual(body)
      expect(Object.fromEntries(result.headers.entries())).toEqual({
        'content-type': contentType,
        'cache-control': 'private, max-age=30',
        'content-disposition': 'attachment; filename="layer.bin"',
      })
    }
  )

  it.each([204, 205, 304])(
    'preserves a valid null-body %i response',
    async (status) => {
      const { response } = proxy({ upstream: new Response(null, { status }) })
      const result = await response
      expect(result.status).toBe(status)
      expect(result.body).toBeNull()
      expect(await result.text()).toBe('')
    }
  )

  it('preserves an empty ordinary 200 response', async () => {
    const { response } = proxy({ upstream: new Response('') })
    const result = await response
    expect(result.status).toBe(200)
    expect(await result.text()).toBe('')
  })

  it.each([401, 403, 404, 422, 500, 503])(
    'propagates upstream HTTP %i instead of classifying it as a local failure',
    async (status) => {
      const { response, logger } = proxy({
        upstream: new Response('upstream error', {
          status,
          statusText: 'Upstream rejection',
        }),
      })
      const result = await response
      expect(result.status).toBe(status)
      expect(result.statusText).toBe('Upstream rejection')
      expect(await result.text()).toBe('upstream error')
      expect(logger.error).not.toHaveBeenCalled()
    }
  )

  it.each<[ErrorConstructor, string]>([
    [TypeError, 'No response from server'],
    [Error, 'Request setup error'],
  ])(
    'keeps %p failures secret-safe in every logger argument and the complete response',
    async (ErrorType, publicMessage) => {
      const secret = 'synthetic-sensitive-marker'
      const error = Object.assign(new ErrorType(secret), {
        name: secret,
        stack: secret,
        cause: new Error(secret),
        payload: { token: secret },
      })
      const fetchFn = jest.fn<typeof fetch>().mockRejectedValue(error)
      const { response, logger } = proxy({
        fetchFn,
        environment: {
          TEST_API_URL: `https://upstream.example.test/${secret}`,
        },
        request: new Request(
          `https://map.example.test${routePrefix}/${secret}?token=${secret}`,
          {
            method: 'POST',
            body: secret,
            headers: { authorization: `Bearer ${secret}` },
          }
        ),
      })
      const result = await response
      expect(result.status).toBe(500)
      expect(await result.text()).toBe(publicMessage)
      expect(result.statusText).toBe('')
      expect(Object.fromEntries(result.headers.entries())).toEqual({
        'content-type': 'text/plain;charset=UTF-8',
      })
      // Exact primitive-only arguments detect Error.message/stack/cause too;
      // JSON.stringify(Error) alone would silently hide those fields.
      expect(logger.error.mock.calls).toEqual([
        ['TEST_API_URL proxy request failed'],
      ])
    }
  )

  it('handles invalid upstream URL setup without fetching', async () => {
    const { response, fetchFn, logger } = proxy({
      environment: { TEST_API_URL: 'invalid base URL' },
    })
    const result = await response
    expect(result.status).toBe(500)
    // Native URL errors cross the Jest VM realm; preserve the current catch classification.
    expect(await result.text()).toBe('Request setup error')
    expect(fetchFn).not.toHaveBeenCalled()
    expect(logger.error.mock.calls).toEqual([
      ['TEST_API_URL proxy request failed'],
    ])
  })

  it('handles a request-body read rejection before fetching', async () => {
    const request = new Request(
      `https://map.example.test${routePrefix}/layer`,
      { method: 'PATCH', body: 'body' }
    )
    const read = jest
      .spyOn(request, 'arrayBuffer')
      .mockRejectedValue(new Error('synthetic private read failure'))
    try {
      const { response, fetchFn, logger } = proxy({ request })
      const result = await response
      expect(result.status).toBe(500)
      expect(await result.text()).toBe('Request setup error')
      expect(fetchFn).not.toHaveBeenCalled()
      expect(logger.error.mock.calls).toEqual([
        ['TEST_API_URL proxy request failed'],
      ])
    } finally {
      read.mockRestore()
    }
  })
})
