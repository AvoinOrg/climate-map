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
  refreshAreaQueries,
} from 'applets/energy/common/areas/queries'
import { AreaApiError } from 'applets/energy/common/areas/errors'
import { projectAreaSelection } from 'applets/energy/common/areas/selection'
import { resolveAreaGeography } from 'applets/energy/common/areas/mapModes'
import {
  EnergyAreaMapRuntime,
  type CommittedAreaGeneration,
  type AreaRuntimeStatus,
} from 'applets/energy/common/areas/mapRuntime'
import { AreaRuntimeContext } from 'applets/energy/common/areas/AreaRuntimeContext'
import { EnergyAreaNavigation } from 'applets/energy/common/areas/navigation'

const EnergyAreaRuntime = ({ children }: { children: React.ReactNode }) => {
  const config = React.useMemo(() => getEnergyAreaApiConfig(), [])
  const queryClient = useQueryClient()
  const map = useMapInstanceStore((state) => state._map)
  const mapContext = useMapStore((state) => state.mapContext)
  useQuery({
    ...areaMetadataQueryOptions({ config }),
    enabled: config.ok && mapContext === 'energy',
  })
  const selectedFeatures = useMapStore((state) => state.selectedFeatures)
  const activeThematicMode = useAppletStore((state) => state.activeThematicMode)
  const zoom = useAppletStore((state) => state.areaZoom)
  const [generation, setGeneration] = React.useState<CommittedAreaGeneration>()
  const [status, setStatus] = React.useState<AreaRuntimeStatus>('loading')
  const [tileFailed, setTileFailed] = React.useState(false)
  const [canGoBack, setCanGoBack] = React.useState(false)
  const navigation = React.useRef<EnergyAreaNavigation | undefined>(undefined)
  const committed = React.useRef<CommittedAreaGeneration | undefined>(undefined)
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
      lane: lane.current,
      publish: (next, nextStatus) => {
        committed.current = next
        setGeneration(next)
        setStatus(nextStatus)
      },
      tileStatus: setTileFailed,
      cancelDetails,
      invalidateNavigation: (reason) => navigation.current?.invalidate(reason),
    })
    navigation.current = new EnergyAreaNavigation({
      map,
      generation: () => committed.current,
      cancelDetails,
      changed: setCanGoBack,
    })
    owner.current = runtime
    setGeneration(undefined)
    setStatus('loading')
    void runtime.install()
    return () => {
      navigation.current?.dispose()
      navigation.current = undefined
      committed.current = undefined
      owner.current = undefined
      void runtime.dispose()
      if (config.ok)
        void queryClient.cancelQueries({
          queryKey: areaQueryKeys.metadata({ config }),
        })
    }
  }, [map, mapContext, config, cancelDetails, queryClient])
  const request = React.useMemo(
    () =>
      activeThematicMode
        ? projectAreaSelection({
            features: selectedFeatures,
            descriptors: generation?.descriptors ?? [],
            effective: resolveAreaGeography({
              zoom: map?.getZoom() ?? zoom,
            }),
          })
        : undefined,
    [selectedFeatures, generation, zoom, map, activeThematicMode]
  )
  const detailQuery = useQuery(areaDetailQueryOptions({ config, request }))
  // The origin-keyed query and request parser are the response guard. Metadata
  // and details are independent latest reads, not an atomic dataset snapshot.
  const detail = detailQuery.isError ? undefined : detailQuery.data
  const detailProblem =
    request && !config.ok
      ? config.problem.kind
      : detailQuery.error instanceof AreaApiError
        ? detailQuery.error.problem.kind
        : detailQuery.isError
          ? 'network'
          : undefined
  const refresh = React.useCallback(() => {
    owner.current?.refreshTiles()
    void refreshAreaQueries({ queryClient, config })
  }, [config, queryClient])
  React.useEffect(() => {
    if (!map || mapContext !== 'energy') return
    window.addEventListener('online', refresh)
    return () => window.removeEventListener('online', refresh)
  }, [map, mapContext, refresh])
  // Passive zoom/style/query updates can reconstruct the same request. Open
  // details only when the selected area or postal scope actually changes.
  const detailSelectionKey = request
    ? `${request.level}:${request.areaCode}:${request.municipalityCode ?? ''}`
    : undefined
  React.useEffect(() => {
    if (detailSelectionKey) useUIStore.getState().setIsSidebarOpen(true)
  }, [detailSelectionKey])
  const close = React.useCallback(() => {
    navigation.current?.invalidate()
    useMapStore.getState().setSelectedFeatures([])
    useUIStore.getState().setIsSidebarOpen(true)
    cancelDetails()
  }, [cancelDetails])
  return (
    <AreaRuntimeContext.Provider
      value={{
        generation,
        status,
        problem: status === 'unavailable' ? 'unavailable' : undefined,
        tileFailed,
        request,
        detail,
        detailProblem,
        detailLoading: !!request && !detail && !detailProblem,
        refresh,
        retryTiles: () => owner.current?.retryTiles(),
        retryDetail: () => {
          void detailQuery.refetch()
        },
        close,
        canGoBack,
        back: () => navigation.current?.back(),
        navigateRelated: (target) =>
          navigation.current?.navigateRelated(target),
        showWholePostalArea: () => navigation.current?.showWholePostalArea(),
        showBuildings: () => navigation.current?.showBuildings(),
      }}
    >
      {children}
    </AreaRuntimeContext.Provider>
  )
}
export default EnergyAreaRuntime
