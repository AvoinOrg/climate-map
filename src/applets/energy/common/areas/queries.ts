import { queryOptions } from '@tanstack/react-query'
import type {
  AreaApiConfigResult,
  AreaDetailRequest,
  AreaFetch,
} from 'applets/energy/common/types/areas'
import { requireAreaApiConfig } from 'applets/energy/common/areas/config'
import {
  parseAreaDetailRequest,
  parseAreaReleaseId,
} from 'applets/energy/common/areas/contract'
import {
  fetchAreaDetail,
  fetchAreaMetadata,
} from 'applets/energy/common/areas/client'
import { AreaApiError } from 'applets/energy/common/areas/errors'

export const AREA_METADATA_STALE_TIME = 60_000
export const areaQueryKeys = {
  all: ['energyAreas'] as const,
  metadata: ({
    config,
    releaseId,
  }: {
    config: AreaApiConfigResult
    releaseId?: string
  }) =>
    [
      'energyAreas',
      requireAreaApiConfig(config).origin,
      'metadata',
      releaseId === undefined ? 'active' : parseAreaReleaseId(releaseId),
    ] as const,
  details: ({ config }: { config: AreaApiConfigResult }) =>
    ['energyAreas', requireAreaApiConfig(config).origin, 'detail'] as const,
  detail: ({
    config,
    request,
  }: {
    config: AreaApiConfigResult
    request: AreaDetailRequest
  }) => {
    const pinned = parseAreaDetailRequest(request)
    return [
      ...areaQueryKeys.details({ config }),
      pinned.releaseId,
      pinned.level,
      pinned.areaCode,
      pinned.municipalityCode ?? null,
    ] as const
  },
}
export const retryAreaQuery = (failureCount: number, error: unknown) =>
  failureCount < 2 &&
  error instanceof AreaApiError &&
  (error.problem.kind === 'network' || error.problem.kind === 'unavailable')

export const areaMetadataQueryOptions = ({
  config,
  releaseId,
  fetchFn,
}: {
  config: AreaApiConfigResult
  releaseId?: string
  fetchFn?: AreaFetch
}) => {
  const snapshot: AreaApiConfigResult = config.ok
    ? { ok: true, config: requireAreaApiConfig(config) }
    : config
  const pinned =
    releaseId === undefined ? undefined : parseAreaReleaseId(releaseId)
  return queryOptions({
    queryKey: snapshot.ok
      ? areaQueryKeys.metadata({ config: snapshot, releaseId: pinned })
      : (['energyAreas', null, 'metadata', pinned ?? 'active'] as const),
    enabled: snapshot.ok,
    queryFn: ({ signal }) =>
      fetchAreaMetadata({
        config: snapshot,
        releaseId: pinned,
        signal,
        fetchFn,
      }),
    staleTime: AREA_METADATA_STALE_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: false,
    retry: retryAreaQuery,
  })
}
export const areaDetailQueryOptions = ({
  config,
  request,
  fetchFn,
}: {
  config: AreaApiConfigResult
  request?: AreaDetailRequest
  fetchFn?: AreaFetch
}) => {
  const snapshot: AreaApiConfigResult = config.ok
    ? { ok: true, config: requireAreaApiConfig(config) }
    : config
  const pinned =
    request === undefined ? undefined : parseAreaDetailRequest(request)
  return queryOptions({
    queryKey:
      snapshot.ok && pinned
        ? areaQueryKeys.detail({ config: snapshot, request: pinned })
        : ([
            'energyAreas',
            snapshot.ok ? snapshot.config.origin : null,
            'detail',
            'unselected',
          ] as const),
    enabled: snapshot.ok && pinned !== undefined,
    queryFn: ({ signal }) => {
      if (!pinned)
        throw new AreaApiError({
          kind: 'rejected-request',
          diagnostic: 'No area is selected.',
        })
      return fetchAreaDetail({
        config: snapshot,
        request: pinned,
        signal,
        fetchFn,
      })
    },
    staleTime: Infinity,
    refetchInterval: false,
    retry: retryAreaQuery,
  })
}
