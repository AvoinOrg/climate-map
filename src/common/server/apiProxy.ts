type EnvSource = Record<string, string | undefined>

type ApiProxyLogger = {
  error: (...args: unknown[]) => void
}

export type ApiProxyDeps = {
  env?: EnvSource
  fetchFn?: typeof fetch
  logger?: ApiProxyLogger
}

const REQUEST_HEADERS_TO_FORWARD = [
  'accept',
  'authorization',
  'content-type',
  'x-user-agent',
]

const RESPONSE_HEADERS_TO_FORWARD = [
  'cache-control',
  'content-disposition',
  'content-type',
]

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD'])

const normalizeApiBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed.replace(/\/+$/, '') : null
}

const getProxyPath = ({
  request,
  routePrefix,
}: {
  request: Request
  routePrefix: string
}) => {
  const requestUrl = new URL(request.url)
  const normalizedPrefix = routePrefix.replace(/\/+$/, '')

  if (!requestUrl.pathname.startsWith(`${normalizedPrefix}/`)) {
    return null
  }

  return requestUrl.pathname.slice(normalizedPrefix.length + 1)
}

const getUpstreamUrl = ({
  apiBaseUrl,
  proxyPath,
  request,
}: {
  apiBaseUrl: string
  proxyPath: string
  request: Request
}) => {
  const requestUrl = new URL(request.url)
  const upstreamUrl = new URL(`${apiBaseUrl}/${proxyPath}`)
  upstreamUrl.search = requestUrl.search

  return upstreamUrl
}

const getForwardedRequestHeaders = (request: Request) => {
  const headers = new Headers()

  for (const headerName of REQUEST_HEADERS_TO_FORWARD) {
    const value = request.headers.get(headerName)

    if (value != null) {
      headers.set(headerName, value)
    }
  }

  return headers
}

const getForwardedResponseHeaders = (response: Response) => {
  const headers = new Headers()

  for (const headerName of RESPONSE_HEADERS_TO_FORWARD) {
    const value = response.headers.get(headerName)

    if (value != null) {
      headers.set(headerName, value)
    }
  }

  return headers
}

const createNoResponseError = () =>
  new Response('No response from server', { status: 500 })

const createRequestSetupError = () =>
  new Response('Request setup error', { status: 500 })

export const handleApiProxyRequest = async ({
  baseUrlEnvName,
  deps = {},
  request,
  routePrefix,
}: {
  baseUrlEnvName: string
  deps?: ApiProxyDeps
  request: Request
  routePrefix: string
}) => {
  const { env = process.env, fetchFn = fetch, logger = console } = deps
  const apiBaseUrl = normalizeApiBaseUrl(env[baseUrlEnvName])

  if (!apiBaseUrl) {
    return new Response(`${baseUrlEnvName} is not configured`, {
      status: 500,
    })
  }

  const proxyPath = getProxyPath({ request, routePrefix })

  if (!proxyPath) {
    return new Response('Proxy path is missing', { status: 404 })
  }

  try {
    const method = request.method.toUpperCase()
    const upstreamResponse = await fetchFn(
      getUpstreamUrl({ apiBaseUrl, proxyPath, request }),
      {
        headers: getForwardedRequestHeaders(request),
        method,
        ...(METHODS_WITHOUT_BODY.has(method)
          ? {}
          : { body: await request.arrayBuffer() }),
      }
    )

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: getForwardedResponseHeaders(upstreamResponse),
    })
  } catch (error) {
    // Exceptions can contain credentials, request payloads and upstream URLs.
    logger.error(`${baseUrlEnvName} proxy request failed`)

    return error instanceof TypeError
      ? createNoResponseError()
      : createRequestSetupError()
  }
}
