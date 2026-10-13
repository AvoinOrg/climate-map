import type {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapSourceDataEvent,
  ErrorEvent,
  FilterSpecification,
} from 'maplibre-gl'
import { useMapStore } from '#/common/store/mapStore'
import { registerAreaTileTransport } from 'applets/energy/common/areas/tileTransport'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { LayerOrderLevel } from '#/common/types/map'
import type { AreaLevel } from 'applets/energy/common/types/areas'
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
  resolveAreaGeography,
} from 'applets/energy/common/areas/mapModes'
import { shallow } from 'zustand/shallow'
import {
  areaThemeSelection,
  areaThemeStyle,
  isAreaThemeEligible,
} from 'applets/energy/common/areas/thematicStyle'
import {
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
} from 'applets/energy/layers/buildingSource'

export type CommittedAreaGeneration = {
  descriptors: AreaSourceDescriptor[]
  signature: string
}
export type AreaRuntimeStatus = 'loading' | 'updating' | 'ready' | 'unavailable'
// A lane survives React effect/StrictMode re-entry. Old teardown completes before
// a replacement owner can use the same stable group IDs.
export type AreaRegistrationLane = { pending: Promise<void> }
export class EnergyAreaMapRuntime {
  private active = true
  private revision = 0
  private committed?: CommittedAreaGeneration
  private installing = false
  private selectionRestorePending = false
  private unregisterTransport?: () => void
  private themeSelection = areaThemeSelection(useAppletStore.getState())
  private failedTiles = new Map<AreaLevel, Set<string>>()
  private unsubscribe: () => void
  private mapUnsubscribe: () => void
  constructor(
    private readonly options: {
      map: MapLibreMap
      lane: AreaRegistrationLane
      publish: (
        generation: CommittedAreaGeneration | undefined,
        status: AreaRuntimeStatus
      ) => void
      tileStatus: (failed: boolean) => void
      cancelDetails: () => void
      invalidateNavigation?: (
        reason: 'level' | 'generation' | 'dispose'
      ) => void
    }
  ) {
    const { map } = options
    map.on('zoom', this.sync)
    map.on('error', this.onError)
    map.on('sourcedata', this.onSourceData)
    map.on('style.load', this.onStyleLoad)
    map.on('styledata', this.onStyle)
    // Retained sources can still be loading during both early style events.
    map.on('idle', this.onStyle)
    this.unsubscribe = useAppletStore.subscribe(areaThemeSelection, this.sync, {
      equalityFn: shallow,
    })
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
      // The store deselects surviving sources. Removing their feature state
      // first can break MapLibre's pending state update after style replacement.
      const keep = store.selectedFeatures.filter((feature) => !owned(feature))
      store.setSelectedFeatures(keep)
    }
    for (const descriptor of this.committed?.descriptors ?? [])
      if (this.options.map.getSource(descriptor.sourceId))
        this.options.map.removeFeatureState({
          source: descriptor.sourceId,
          sourceLayer: descriptor.sourceLayer,
        })
    if (
      includeBuildings &&
      this.options.map.getSource(ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID)
    )
      this.options.map.removeFeatureState({
        source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
        sourceLayer: ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
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
  private hasRegisteredAreas = () =>
    this.committed?.descriptors.every(
      (item) =>
        this.options.map.getSource(item.sourceId) &&
        areaLayerIds(item).every((id) => this.options.map.getLayer(id))
    ) ?? false
  install = () => {
    if (!this.active || this.installing) return this.options.lane.pending
    const descriptors = createAreaSourceDescriptors()
    const signature = areaSourceDescriptorSignature(descriptors)
    if (this.committed?.signature === signature && this.hasRegisteredAreas())
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
    const compatible = previous?.signature === signature
    if (!compatible) {
      this.options.invalidateNavigation?.('generation')
      this.clearSelection(true)
    }
    this.unregisterTransport?.()
    this.unregisterTransport = undefined
    // Preserve the canonical request/trail during compatible style recovery.
    this.committed = compatible ? previous : undefined
    this.options.publish(this.committed, 'updating')
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
            throw new Error(
              `Area registration incomplete: ${descriptor.sourceId}; source=${!!this.options.map.getSource(descriptor.sourceId)}; layers=${areaLayerIds(descriptor).map((id) => !!this.options.map.getLayer(id))}; group=${!!useMapStore.getState()._layerGroups[descriptor.sourceId]}`
            )
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
        this.committed = { descriptors, signature }
        this.failedTiles.clear()
        useAppletStore.setState({ areaAvailable: true })
        this.sync()
        this.selectionRestorePending = false
        this.restoreSelection()
        this.options.publish(this.committed, 'ready')
      } catch (error) {
        console.warn('Energy area layer registration failed', error)
        await this.remove(descriptors)
        if (isCurrent()) {
          this.committed = undefined
          useAppletStore.setState({ areaAvailable: false })
          this.sync()
          this.options.tileStatus(true)
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
      zoom: map.getZoom(),
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
    const themeChanged = !shallow(
      this.themeSelection,
      areaThemeSelection(state)
    )
    this.themeSelection = areaThemeSelection(state)
    const theme = areaThemeStyle(state)
    if (this.committed) {
      for (const descriptor of this.committed.descriptors) {
        const range = AUTOMATIC_AREA_RANGES[descriptor.level]
        const min = Math.max(descriptor.source.minzoom ?? 0, range.minzoom)
        const max = range.maxzoom
        // An advertised minimum above the automatic range yields no geometry.
        for (const id of areaLayerIds(descriptor)) {
          if (!map.getLayer(id)) continue
          map.setLayerZoomRange(id, Math.min(min, max), max)
        }
        const group = useMapStore.getState()._layerGroups[descriptor.sourceId]
        // Apply current paint/filter before any group becomes visible. Store
        // visibility writes notify synchronously, so only change intent once.
        for (const id of areaLayerIds(descriptor)) {
          if (!map.getLayer(id)) continue
          const filter: FilterSpecification = [
            'all',
            ['==', ['get', 'level'], descriptor.level],
            ['==', ['typeof', ['get', 'area_id']], 'string'],
            theme.eligibility,
          ]
          if (JSON.stringify(map.getFilter(id)) !== JSON.stringify(filter))
            map.setFilter(id, filter)
        }
        const fill = areaLayerIds(descriptor)[0]
        if (
          map.getLayer(fill) &&
          JSON.stringify(map.getPaintProperty(fill, 'fill-color')) !==
            JSON.stringify(theme.color)
        )
          map.setPaintProperty(fill, 'fill-color', theme.color)
        if (
          group &&
          group.isHidden === theme.visible &&
          areaLayerIds(descriptor).every((id) => map.getLayer(id))
        )
          useMapStore
            .getState()
            ._setGroupVisibility(descriptor.sourceId, theme.visible)
      }
      const hiddenSelection = useMapStore
        .getState()
        .selectedFeatures.some(
          (feature) =>
            feature.source.startsWith('energymap_areas_') &&
            !isAreaThemeEligible(feature.properties, state)
        )
      if (hiddenSelection || (!theme.visible && themeChanged)) {
        this.options.invalidateNavigation?.('generation')
        this.clearSelection()
      } else if (themeChanged) {
        // Clear stale hover on newly excluded polygons, then restore only a
        // still eligible current selection. Details stay canonical full totals.
        for (const descriptor of this.committed.descriptors)
          if (map.getSource(descriptor.sourceId))
            map.removeFeatureState({
              source: descriptor.sourceId,
              sourceLayer: descriptor.sourceLayer,
            })
        this.restoreSelection()
      }
    }
    this.options.tileStatus(
      effective !== 'buildings' && !!this.failedTiles.get(effective)?.size
    )
  }
  private restoreSelection = () => {
    if (!this.active || useMapStore.getState().mapContext !== 'energy') return
    const descriptors = this.committed?.descriptors ?? []
    // Read current store state after queued installation. Never restore a captured
    // feature if the user closed, navigated or changed zoom during recovery.
    const selected = useMapStore.getState().selectedFeatures
    const effective = useAppletStore.getState().effectiveGeography
    const building =
      effective === 'buildings'
        ? selected.find(
            (feature) =>
              feature.source === ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID &&
              feature.sourceLayer ===
                ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER &&
              (typeof feature.id === 'string' || typeof feature.id === 'number')
          )
        : undefined
    for (const feature of selected) {
      const descriptor = descriptors.find(
        (item) =>
          item.level === effective &&
          item.sourceId === feature.source &&
          item.sourceLayer === feature.sourceLayer
      )
      if (
        ((descriptor &&
          isAreaThemeEligible(feature.properties, useAppletStore.getState()) &&
          typeof feature.id === 'string') ||
          (feature === building &&
            this.options.map.getLayer(feature.layer.id))) &&
        this.options.map.getSource(feature.source)
      )
        this.options.map.setFeatureState(
          {
            source: feature.source,
            sourceLayer: feature.sourceLayer,
            id: feature.id,
          },
          { selected: true }
        )
    }
  }
  refreshTiles = () => {
    if (!this.active || this.installing) return
    if (!this.hasRegisteredAreas()) {
      if (this.committed) this.onStyle()
      else void this.install()
      return
    }
    for (const descriptor of this.committed?.descriptors ?? [])
      if (this.options.map.getSource(descriptor.sourceId))
        this.options.map.refreshTiles(descriptor.sourceId)
    this.restoreSelection()
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
    if (!this.active) return
    if (!this.hasRegisteredAreas()) {
      if (this.committed) this.onStyle()
      else void this.install()
      return
    }
    const descriptor = this.activeDescriptor()
    if (
      descriptor &&
      this.active &&
      this.options.map.getSource(descriptor.sourceId)
    )
      this.options.map.refreshTiles(descriptor.sourceId)
  }
  private onStyleLoad = () => {
    // Full replacement clears feature state even when every source/layer survives.
    this.selectionRestorePending = true
    this.onStyle()
  }
  private onStyle = () => {
    if (
      !this.active ||
      this.installing ||
      !this.committed ||
      useMapStore.getState().mapContext !== 'energy'
    )
      return
    if (!this.hasRegisteredAreas()) {
      if (useAppletStore.getState().areaAvailable)
        useAppletStore.setState({ areaAvailable: false })
      if (this.options.map.isStyleLoaded()) void this.install()
    } else if (
      this.selectionRestorePending &&
      this.options.map.isStyleLoaded()
    ) {
      // Consume before writing state: setFeatureState itself can cause another idle.
      this.selectionRestorePending = false
      // Shared style recovery may restore all layers before this owner needs
      // to reinstall them. Clear the temporary unavailable state in that case.
      if (!useAppletStore.getState().areaAvailable)
        useAppletStore.setState({ areaAvailable: true })
      this.sync()
      this.restoreSelection()
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
    map.off('style.load', this.onStyleLoad)
    map.off('styledata', this.onStyle)
    map.off('idle', this.onStyle)
    this.unsubscribe()
    this.mapUnsubscribe()
    this.options.invalidateNavigation?.('dispose')
    this.clearSelection()
    const descriptors = this.committed?.descriptors ?? []
    this.committed = undefined
    useAppletStore.setState({
      areaAvailable: false,
      effectiveGeography: 'buildings',
      areaZoom: 12,
    })
    return this.enqueue(() => this.remove(descriptors))
  }
}
