import { queryOptions, type QueryClient } from '@tanstack/react-query'
import type {
  AreaApiConfigResult,
  AreaDetailRequest,
  AreaFetch,
} from 'applets/energy/common/types/areas'
import { requireAreaApiConfig } from 'applets/energy/common/areas/config'
import { parseAreaDetailRequest } from 'applets/energy/common/areas/contract'
import {
  fetchAreaDetail,
  fetchAreaMetadata,
} from 'applets/energy/common/areas/client'
import { AreaApiError } from 'applets/energy/common/areas/errors'

export const AREA_METADATA_STALE_TIME = 60_000
export const AREA_DETAIL_STALE_TIME = 30_000
export const AREA_CACHE_TIME = 300_000
export const areaQueryKeys = {
  all: ['energyAreas'] as const,
  metadata: ({ config }: { config: AreaApiConfigResult }) =>
    ['energyAreas', requireAreaApiConfig(config).origin, 'metadata'] as const,
  details: ({ config }: { config: AreaApiConfigResult }) =>
    ['energyAreas', requireAreaApiConfig(config).origin, 'detail'] as const,
  detail: ({
    config,
    request,
  }: {
    config: AreaApiConfigResult
    request: AreaDetailRequest
  }) => {
    const current = parseAreaDetailRequest(request)
    return [
      ...areaQueryKeys.details({ config }),
      current.level,
      current.areaCode,
      current.municipalityCode ?? null,
    ] as const
  },
}
export const retryAreaQuery = (failureCount: number, error: unknown) =>
  failureCount < 2 &&
  error instanceof AreaApiError &&
  (error.problem.kind === 'network' || error.problem.kind === 'unavailable')

const snapshotConfig = (config: AreaApiConfigResult): AreaApiConfigResult =>
  config.ok ? { ok: true, config: requireAreaApiConfig(config) } : config

export const areaMetadataQueryOptions = ({
  config,
  fetchFn,
}: {
  config: AreaApiConfigResult
  fetchFn?: AreaFetch
}) => {
  const snapshot = snapshotConfig(config)
  return queryOptions({
    queryKey: snapshot.ok
      ? areaQueryKeys.metadata({ config: snapshot })
      : (['energyAreas', null, 'metadata'] as const),
    enabled: snapshot.ok,
    queryFn: ({ signal }) =>
      fetchAreaMetadata({ config: snapshot, signal, fetchFn }),
    staleTime: AREA_METADATA_STALE_TIME,
    gcTime: AREA_CACHE_TIME,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
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
  const snapshot = snapshotConfig(config)
  const current =
    request === undefined ? undefined : parseAreaDetailRequest(request)
  return queryOptions({
    queryKey:
      snapshot.ok && current
        ? areaQueryKeys.detail({ config: snapshot, request: current })
        : ([
            'energyAreas',
            snapshot.ok ? snapshot.config.origin : null,
            'detail',
            'unselected',
          ] as const),
    enabled: snapshot.ok && current !== undefined,
    queryFn: ({ signal }) => {
      if (!current)
        throw new AreaApiError({
          kind: 'rejected-request',
          diagnostic: 'No area is selected.',
        })
      return fetchAreaDetail({
        config: snapshot,
        request: current,
        signal,
        fetchFn,
      })
    },
    staleTime: AREA_DETAIL_STALE_TIME,
    gcTime: AREA_CACHE_TIME,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    // The provider owns one coordinated reconnect for tiles and all latest queries.
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: retryAreaQuery,
  })
}
// Cancellation precedes invalidation even for a first load. An obsolete same-key
// response cannot overwrite a refresh; inactive scope/Back entries become stale.
export const refreshAreaQueries = async ({
  queryClient,
  config,
}: {
  queryClient: QueryClient
  config: AreaApiConfigResult
}) => {
  if (!config.ok) return
  const queryKey = ['energyAreas', requireAreaApiConfig(config).origin] as const
  await queryClient.cancelQueries({ queryKey })
  await queryClient.invalidateQueries({ queryKey })
}
