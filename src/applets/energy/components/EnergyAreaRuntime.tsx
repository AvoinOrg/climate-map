import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useUIStore } from '#/common/store/uiStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { getEnergyAreaApiConfig } from 'applets/energy/common/areas/config'
import {
  areaMetadataQueryOptions,
  areaDetailQueryOptions,
  areaQueryKeys,
} from 'applets/energy/common/areas/queries'
import { AreaApiError } from 'applets/energy/common/areas/errors'
import {
  projectAreaSelection,
  detailMatchesMetadata,
} from 'applets/energy/common/areas/selection'
import { resolveAreaGeography } from 'applets/energy/common/areas/mapModes'
import {
  EnergyAreaMapRuntime,
  type CommittedAreaGeneration,
  type AreaRuntimeStatus,
} from 'applets/energy/common/areas/mapRuntime'
import { AreaRuntimeContext } from 'applets/energy/common/areas/AreaRuntimeContext'

const EnergyAreaRuntime = ({ children }: { children: React.ReactNode }) => {
  const config = React.useMemo(() => getEnergyAreaApiConfig(), [])
  const queryClient = useQueryClient()
  const map = useMapInstanceStore((state) => state._map)
  const mapContext = useMapStore((state) => state.mapContext)
  const metadata = useQuery({
    ...areaMetadataQueryOptions({ config }),
    enabled: config.ok && mapContext === 'energy',
  })
  const selectedFeatures = useMapStore((state) => state.selectedFeatures)
  const mode = useAppletStore((state) => state.geographyMode)
  const zoom = useAppletStore((state) => state.areaZoom)
  const [generation, setGeneration] = React.useState<CommittedAreaGeneration>()
  const [status, setStatus] = React.useState<AreaRuntimeStatus>('loading')
  const [tileFailed, setTileFailed] = React.useState(false)
  const owner = React.useRef<EnergyAreaMapRuntime | undefined>(undefined)
  const lane = React.useRef({ pending: Promise.resolve() })
  const cancelDetails = React.useCallback(() => {
    if (config.ok)
      void queryClient.cancelQueries({
        queryKey: areaQueryKeys.details({ config }),
      })
  }, [config, queryClient])
  React.useEffect(() => {
    // Zoom and building applicability remain live without area API configuration.
    if (!map || mapContext !== 'energy') return
    const runtime = new EnergyAreaMapRuntime({
      map,
      config,
      lane: lane.current,
      publish: (next, nextStatus) => {
        setGeneration(next)
        setStatus(nextStatus)
      },
      tileStatus: setTileFailed,
      cancelDetails,
    })
    owner.current = runtime
    setGeneration(undefined)
    setStatus('loading')
    return () => {
      owner.current = undefined
      void runtime.dispose()
      if (config.ok)
        void queryClient.cancelQueries({
          queryKey: areaQueryKeys.metadata({ config }),
        })
    }
  }, [map, mapContext, config, cancelDetails, queryClient])
  React.useEffect(() => {
    if (metadata.data && owner.current)
      void owner.current.promote(metadata.data)
  }, [metadata.data, metadata.dataUpdatedAt, map, mapContext, cancelDetails])
  const request = React.useMemo(
    () =>
      projectAreaSelection({
        features: selectedFeatures,
        descriptors: generation?.descriptors ?? [],
        effective: resolveAreaGeography({
          mode,
          zoom: map?.getZoom() ?? zoom,
          available: !!generation,
        }),
      }),
    [selectedFeatures, generation, mode, zoom, map]
  )
  const detailQuery = useQuery(areaDetailQueryOptions({ config, request }))
  const detail =
    detailQuery.data &&
    generation &&
    detailMatchesMetadata({
      detail: detailQuery.data,
      metadata: generation.metadata,
    })
      ? detailQuery.data
      : undefined
  const detailProblem =
    detailQuery.error instanceof AreaApiError
      ? detailQuery.error.problem.kind
      : detailQuery.isError
        ? 'network'
        : detailQuery.data && !detail
          ? 'malformed-contract'
          : undefined
  const problem = !config.ok
    ? config.problem.kind
    : metadata.error instanceof AreaApiError
      ? metadata.error.problem.kind
      : metadata.isError
        ? 'network'
        : status === 'unavailable'
          ? 'unavailable'
          : undefined
  React.useEffect(() => {
    if (request) useUIStore.getState().setIsSidebarOpen(true)
  }, [request])
  const close = React.useCallback(() => {
    useMapStore.getState().setSelectedFeatures([])
    useUIStore.getState().setIsSidebarOpen(true)
    cancelDetails()
  }, [cancelDetails])
  return (
    <AreaRuntimeContext.Provider
      value={{
        generation,
        status:
          !config.ok || (!generation && metadata.isError)
            ? 'unavailable'
            : status,
        problem,
        refreshFailed: !!generation && metadata.isError,
        tileFailed,
        request,
        detail,
        detailProblem,
        detailLoading: !!request && !detail && !detailProblem,
        refresh: () => {
          void metadata.refetch()
        },
        retryTiles: () => owner.current?.retryTiles(),
        retryDetail: () => {
          void detailQuery.refetch()
        },
        close,
      }}
    >
      {children}
    </AreaRuntimeContext.Provider>
  )
}
export default EnergyAreaRuntime
