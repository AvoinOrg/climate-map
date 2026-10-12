import type {
  AreaApiConfigResult,
  AreaDetailRequest,
  AreaFetch,
} from 'applets/energy/common/types/areas'
import {
  ENERGY_AREA_API_PREFIX,
  requireAreaApiConfig,
} from 'applets/energy/common/areas/config'
import {
  parseAreaDetail,
  parseAreaDetailRequest,
  parseAreaMetadata,
} from 'applets/energy/common/areas/contract'
import { AreaApiError } from 'applets/energy/common/areas/errors'

const checkAborted = (signal?: AbortSignal) => {
  signal?.throwIfAborted()
}
// Native fetch/body errors can originate in another realm (including DOMException).
const hasErrorName = (error: unknown, name: string) =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === name
const isAbort = (error: unknown) => hasErrorName(error, 'AbortError')
const requestJson = async ({
  url,
  signal,
  fetchFn,
}: {
  url: string
  signal?: AbortSignal
  fetchFn: AreaFetch
}) => {
  checkAborted(signal)
  let response: Response
  try {
    response = await fetchFn(url, {
      signal,
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    })
    checkAborted(signal)
  } catch (error) {
    checkAborted(signal)
    if (isAbort(error)) throw error
    throw new AreaApiError({
      kind: 'network',
      diagnostic: 'Area request transport failed.',
    })
  }
  if (!response.ok) {
    // Do not copy arbitrary upstream bodies (HTML, request values or credentials) into errors.
    throw new AreaApiError({
      kind:
        response.status === 503
          ? 'unavailable'
          : response.status === 404
            ? 'not-found'
            : response.status === 422
              ? 'rejected-request'
              : 'http',
      status: response.status,
      diagnostic: `Area service returned HTTP ${response.status}.`,
    })
  }
  try {
    const payload: unknown = await response.json()
    checkAborted(signal)
    return payload
  } catch (error) {
    checkAborted(signal)
    if (isAbort(error)) throw error
    throw new AreaApiError(
      hasErrorName(error, 'SyntaxError')
        ? {
            kind: 'malformed-contract',
            diagnostic: 'Area service returned invalid JSON.',
          }
        : {
            kind: 'network',
            diagnostic: 'Area response body transport failed.',
          }
    )
  }
}
export const fetchAreaMetadata = async ({
  config,
  signal,
  fetchFn = fetch,
}: {
  config: AreaApiConfigResult
  signal?: AbortSignal
  fetchFn?: AreaFetch
}) => {
  const { origin } = requireAreaApiConfig(config)
  const payload = await requestJson({
    url: `${origin}${ENERGY_AREA_API_PREFIX}/metadata`,
    signal,
    fetchFn,
  })
  const metadata = parseAreaMetadata(payload)
  checkAborted(signal)
  return metadata
}
export const fetchAreaDetail = async ({
  config,
  request,
  signal,
  fetchFn = fetch,
}: {
  config: AreaApiConfigResult
  request: AreaDetailRequest
  signal?: AbortSignal
  fetchFn?: AreaFetch
}) => {
  const { origin } = requireAreaApiConfig(config)
  const current = parseAreaDetailRequest(request)
  const params = new URLSearchParams()
  if (current.municipalityCode !== undefined)
    params.set('municipality_code', current.municipalityCode)
  const payload = await requestJson({
    url: `${origin}${ENERGY_AREA_API_PREFIX}/${current.level}/${current.areaCode}${params.toString() ? `?${params}` : ''}`,
    signal,
    fetchFn,
  })
  const detail = parseAreaDetail(payload, { request: current })
  checkAborted(signal)
  return detail
}
