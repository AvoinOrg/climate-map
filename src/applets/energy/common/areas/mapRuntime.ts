import type {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapSourceDataEvent,
  ErrorEvent,
} from 'maplibre-gl'
import { useMapStore } from '#/common/store/mapStore'
import { registerAreaTileTransport } from 'applets/energy/common/areas/tileTransport'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { LayerOrderLevel } from '#/common/types/map'
import type {
  AreaApiConfigResult,
  AreaMetadata,
  AreaLevel,
} from 'applets/energy/common/types/areas'
import {
  createAreaSourceDescriptors,
  areaSourceDescriptorSignature,
  type AreaSourceDescriptor,
} from 'applets/energy/layers/areaSource'
import {
  createAreaLayerConf,
  areaLayerIds,
} from 'applets/energy/layers/areaLayers'
import {
  AUTOMATIC_AREA_RANGES,
  areaMetricColorExpression,
  resolveAreaGeography,
} from 'applets/energy/common/areas/mapModes'
import { ENERGYMAP_SHARED_BUILDING_LAYER_IDS } from 'applets/energy/layers/buildingPolygonsLayerConf'
import { ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID } from 'applets/energy/layers/buildingSource'

export type CommittedAreaGeneration = {
  metadata: AreaMetadata
  descriptors: AreaSourceDescriptor[]
  signature: string
}
export type AreaRuntimeStatus = 'loading' | 'updating' | 'ready' | 'unavailable'
// A lane survives React effect/StrictMode re-entry. Old teardown completes before
// a replacement owner can use the same release-qualified group IDs.
export type AreaRegistrationLane = { pending: Promise<void> }
export class EnergyAreaMapRuntime {
  private active = true
  private revision = 0
  private committed?: CommittedAreaGeneration
  private installing = false
  private unregisterTransport?: () => void
  private buildingVisibility = new Map<string, 'visible' | 'none'>()
  private failedTiles = new Map<AreaLevel, Set<string>>()
  private unsubscribe: () => void
  private mapUnsubscribe: () => void
  constructor(
    private readonly options: {
      map: MapLibreMap
      config: AreaApiConfigResult
      lane: AreaRegistrationLane
      publish: (
        generation: CommittedAreaGeneration | undefined,
        status: AreaRuntimeStatus
      ) => void
      tileStatus: (failed: boolean) => void
      cancelDetails: () => void
      invalidateNavigation?: (reason: 'level' | 'generation' | 'dispose') => void
    }
  ) {
    const { map } = options
    map.on('zoom', this.sync)
    map.on('error', this.onError)
    map.on('sourcedata', this.onSourceData)
    map.on('style.load', this.onStyle)
    map.on('styledata', this.onStyle)
    this.unsubscribe = useAppletStore.subscribe(
      (state) => [state.geographyMode, state.areaMetric],
      this.sync,
      { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] }
    )
    // Listed building groups can be installed or enabled after the area owner.
    this.mapUnsubscribe = useMapStore.subscribe((state, previous) => {
      if (state._layerGroups !== previous._layerGroups) this.sync()
    })
    this.sync()
  }
  private enqueue = (operation: () => Promise<void>) => {
    const next = this.options.lane.pending.then(operation)
    this.options.lane.pending = next.catch(() => {})
    return next
  }
  private clearSelection = (includeBuildings = false) => {
    const store = useMapStore.getState()
    const owned = (feature: MapGeoJSONFeature) =>
      feature.source.startsWith('energymap_areas_') ||
      (includeBuildings &&
        feature.source === ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID)
    if (store.selectedFeatures.some(owned)) {
      // Style replacement may already have discarded feature state.
      const keep = store.selectedFeatures.filter((feature) => !owned(feature))
      for (const feature of store.selectedFeatures.filter(owned)) {
        if (this.options.map.getSource(feature.source)) {
          this.options.map.removeFeatureState({
            source: feature.source,
            sourceLayer: feature.sourceLayer,
            id: feature.id,
          })
        }
      }
      store.setSelectedFeatures(keep)
    }
    for (const descriptor of this.committed?.descriptors ?? [])
      if (this.options.map.getSource(descriptor.sourceId))
        this.options.map.removeFeatureState({
          source: descriptor.sourceId,
          sourceLayer: descriptor.sourceLayer,
        })
    this.options.cancelDetails()
  }
  private remove = async (descriptors: readonly AreaSourceDescriptor[]) => {
    for (const descriptor of descriptors) {
      if (useMapStore.getState()._layerGroups[descriptor.sourceId]) {
        await useMapStore.getState().removeLayerGroup(descriptor.sourceId)
      }
      // A map replacement can precede effect cleanup; also clean the old map.
      for (const layer of areaLayerIds(descriptor)) {
        if (this.options.map.getLayer(layer))
          this.options.map.removeLayer(layer)
      }
      if (this.options.map.getSource(descriptor.sourceId))
        this.options.map.removeSource(descriptor.sourceId)
    }
  }
  promote = (metadata: AreaMetadata, force = false) => {
    const descriptors = createAreaSourceDescriptors({
      config: this.options.config,
      metadata,
    })
    const signature = areaSourceDescriptorSignature(descriptors)
    if (!force && this.committed?.signature === signature)
      return this.options.lane.pending
    const revision = ++this.revision
    const isCurrent = () =>
      this.active &&
      revision === this.revision &&
      useMapStore.getState().mapContext === 'energy'
    // Invalidate immediately, including work already waiting in the store queue.
    const previous = this.committed
    if (previous)
      for (const descriptor of previous.descriptors) {
        if (
          useMapStore.getState()._layerGroups[descriptor.sourceId] &&
          areaLayerIds(descriptor).every((id) => this.options.map.getLayer(id))
        )
          useMapStore.getState()._setGroupVisibility(descriptor.sourceId, false)
      }
    this.options.invalidateNavigation?.('generation')
    this.clearSelection(true)
    this.unregisterTransport?.()
    this.unregisterTransport = undefined
    this.committed = undefined
    this.options.publish(undefined, 'updating')
    useAppletStore.setState({ areaAvailable: false })
    this.sync()
    this.installing = true
    return this.enqueue(async () => {
      try {
        if (previous) await this.remove(previous.descriptors)
        if (!isCurrent()) return
        for (const descriptor of descriptors) {
          await useMapStore.getState().addLayerGroup(descriptor.sourceId, {
            layerConf: createAreaLayerConf(descriptor),
            mapContext: 'energy',
            isHidden: true,
            persist: false,
            isCurrent,
            layerOrderOptions: { layerOrderLevel: LayerOrderLevel.LAYER },
          })
          if (!isCurrent()) {
            await this.remove(descriptors)
            return
          }
          if (
            !this.options.map.getSource(descriptor.sourceId) ||
            areaLayerIds(descriptor).some(
              (id) => !this.options.map.getLayer(id)
            )
          ) {
            throw new Error('Area registration incomplete')
          }
        }
        if (!isCurrent()) {
          await this.remove(descriptors)
          return
        }
        this.unregisterTransport = registerAreaTileTransport({
          descriptors,
          isCurrent: () =>
            this.active && this.committed?.signature === signature,
        })
        this.committed = { metadata, descriptors, signature }
        this.failedTiles.clear()
        useAppletStore.setState({ areaAvailable: true })
        this.sync()
        this.options.publish(this.committed, 'ready')
      } catch {
        await this.remove(descriptors)
        if (isCurrent()) {
          this.committed = undefined
          useAppletStore.setState({ areaAvailable: false })
          this.sync()
          this.options.publish(undefined, 'unavailable')
        }
      } finally {
        if (revision === this.revision) this.installing = false
      }
    })
  }
  sync = () => {
    if (!this.active) return
    const { map } = this.options
    const state = useAppletStore.getState()
    const effective = resolveAreaGeography({
      mode: state.geographyMode,
      zoom: map.getZoom(),
      available: !!this.committed,
    })
    if (effective !== state.effectiveGeography) {
      this.options.invalidateNavigation?.('level')
      this.clearSelection(true)
    }
    if (
      effective !== state.effectiveGeography ||
      state.areaZoom !== map.getZoom()
    ) {
      useAppletStore.setState({
        effectiveGeography: effective,
        areaZoom: map.getZoom(),
      })
    }
    if (this.committed) {
      for (const descriptor of this.committed.descriptors) {
        const show =
          state.geographyMode === 'automatic' || effective === descriptor.level
        const range =
          state.geographyMode === 'automatic'
            ? AUTOMATIC_AREA_RANGES[descriptor.level]
            : undefined
        const min = Math.max(
          descriptor.source.minzoom ?? 0,
          range?.minzoom ?? 0
        )
        const max = range?.maxzoom ?? 24
        // An advertised minimum above the automatic range yields no geometry.
        for (const id of areaLayerIds(descriptor)) {
          if (!map.getLayer(id)) continue
          map.setLayerZoomRange(id, Math.min(min, max), max)
        }
        const group = useMapStore.getState()._layerGroups[descriptor.sourceId]
        if (
          group &&
          group.isHidden === show &&
          areaLayerIds(descriptor).every((id) => map.getLayer(id))
        ) {
          useMapStore.getState()._setGroupVisibility(descriptor.sourceId, show)
        }
        const fill = areaLayerIds(descriptor)[0]
        if (map.getLayer(fill))
          map.setPaintProperty(
            fill,
            'fill-color',
            areaMetricColorExpression(state.areaMetric)
          )
      }
    }
    for (const id of ENERGYMAP_SHARED_BUILDING_LAYER_IDS) {
      if (!map.getLayer(id)) continue
      if (effective !== 'buildings') {
        if (!this.buildingVisibility.has(id))
          this.buildingVisibility.set(
            id,
            map.getLayoutProperty(id, 'visibility') === 'none'
              ? 'none'
              : 'visible'
          )
        if (map.getLayoutProperty(id, 'visibility') !== 'none')
          map.setLayoutProperty(id, 'visibility', 'none')
      } else if (this.buildingVisibility.has(id)) {
        map.setLayoutProperty(
          id,
          'visibility',
          this.buildingVisibility.get(id)!
        )
        this.buildingVisibility.delete(id)
      }
    }
    this.options.tileStatus(
      effective !== 'buildings' && !!this.failedTiles.get(effective)?.size
    )
  }
  private activeDescriptor = () =>
    this.committed?.descriptors.find(
      (item) => item.level === useAppletStore.getState().effectiveGeography
    )
  private onError = (event: ErrorEvent) => {
    const descriptor = this.activeDescriptor()
    if (
      !this.active ||
      !descriptor ||
      (event as ErrorEvent & { sourceId?: string }).sourceId !==
        descriptor.sourceId
    )
      return
    const tile = (event as ErrorEvent & { tile?: { tileID?: { key: string } } })
      .tile
    this.recordTileFailure(descriptor.level, tile?.tileID?.key ?? 'source')
    this.options.tileStatus(true)
  }
  private onSourceData = (event: MapSourceDataEvent) => {
    const descriptor = this.activeDescriptor()
    if (!this.active || !descriptor || event.sourceId !== descriptor.sourceId)
      return
    const tile = event.tile as unknown as { state?: string } | undefined
    if (tile?.state === 'loaded') {
      const key = (event.tile as unknown as { tileID?: { key: string } }).tileID
        ?.key
      if (key) this.failedTiles.get(descriptor.level)?.delete(key)
      if (event.isSourceLoaded)
        this.failedTiles.get(descriptor.level)?.delete('source')
      this.options.tileStatus(!!this.failedTiles.get(descriptor.level)?.size)
    }
  }
  private recordTileFailure = (level: AreaLevel, key: string) => {
    if (!this.failedTiles.has(level)) this.failedTiles.set(level, new Set())
    this.failedTiles.get(level)!.add(key)
  }
  retryTiles = () => {
    const descriptor = this.activeDescriptor()
    if (
      descriptor &&
      this.active &&
      this.options.map.getSource(descriptor.sourceId)
    )
      this.options.map.refreshTiles(descriptor.sourceId)
  }
  private onStyle = () => {
    if (
      !this.active ||
      this.installing ||
      !this.committed ||
      !this.options.map.isStyleLoaded()
    )
      return
    if (
      this.committed.descriptors.some(
        (item) =>
          !this.options.map.getSource(item.sourceId) ||
          areaLayerIds(item).some((id) => !this.options.map.getLayer(id))
      )
    ) {
      void this.promote(this.committed.metadata, true)
    }
  }
  dispose = () => {
    if (!this.active) return this.options.lane.pending
    this.active = false
    this.unregisterTransport?.()
    this.unregisterTransport = undefined
    ++this.revision
    const { map } = this.options
    map.off('zoom', this.sync)
    map.off('error', this.onError)
    map.off('sourcedata', this.onSourceData)
    map.off('style.load', this.onStyle)
    map.off('styledata', this.onStyle)
    this.unsubscribe()
    this.mapUnsubscribe()
    this.options.invalidateNavigation?.('dispose')
    this.clearSelection()
    const descriptors = this.committed?.descriptors ?? []
    this.committed = undefined
    for (const [id, visibility] of this.buildingVisibility)
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility)
    useAppletStore.setState({
      areaAvailable: false,
      effectiveGeography: 'buildings',
      areaZoom: 12,
    })
    return this.enqueue(() => this.remove(descriptors))
  }
}
