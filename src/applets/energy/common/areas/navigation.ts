import { ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM } from 'applets/energy/layers/buildingSource'
import { parseAreaDetailRequest } from 'applets/energy/common/areas/contract'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { useMapStore } from '#/common/store/mapStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import type {
  AreaDetailRequest,
  AreaLevel,
} from 'applets/energy/common/types/areas'
import type { CommittedAreaGeneration } from 'applets/energy/common/areas/mapRuntime'
import {
  createAreaSelection,
  projectAreaSelection,
} from 'applets/energy/common/areas/selection'
import type { AreaGeographyMode } from 'applets/energy/common/areas/mapModes'

type Frame = {
  request?: AreaDetailRequest
  mode: AreaGeographyMode
  zoom: number
  signature: string
}
const navigationZoom = {
  region: 6,
  municipality: 8,
  postal_code: 11,
  buildings: ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
}

// Transient, per-owner trail; selectedFeatures remains the only active identity.
// All transitions are synchronous with the map owner's sync/selection clearing.
export class EnergyAreaNavigation {
  private trail: Frame[] = []
  private controlled = false
  private buildingsReturn = false
  private active = true
  private unsubscribeSelection: () => void
  private unsubscribeMode: () => void
  constructor(
    private readonly options: {
      map: MapLibreMap
      generation: () => CommittedAreaGeneration | undefined
      cancelDetails: () => void
      changed: (canGoBack: boolean) => void
    }
  ) {
    this.unsubscribeSelection = useMapStore.subscribe((state, previous) => {
      if (
        !this.controlled &&
        state.selectedFeatures !== previous.selectedFeatures
      ) {
        // Selecting/closing a building does not discard deliberate postal return.
        if (
          this.buildingsReturn &&
          useAppletStore.getState().effectiveGeography === 'buildings'
        )
          return
        this.invalidate()
        this.options.cancelDetails()
      }
    })
    this.unsubscribeMode = useAppletStore.subscribe(
      (state) => state.geographyMode,
      () => {
        if (!this.controlled)
          this.selectMode(useAppletStore.getState().geographyMode)
      }
    )
  }
  invalidate = (reason?: 'level' | 'generation' | 'dispose') => {
    if (reason === 'level' && this.controlled) return
    this.trail = []
    this.buildingsReturn = false
    this.options.changed(false)
  }
  private current = (): Frame | undefined => {
    const generation = this.options.generation()
    if (
      !this.active ||
      !generation ||
      useMapStore.getState().mapContext !== 'energy'
    )
      return
    const state = useAppletStore.getState()
    const request = projectAreaSelection({
      features: useMapStore.getState().selectedFeatures,
      descriptors: generation.descriptors,
      effective: state.effectiveGeography,
    })
    if (!request && !this.buildingsReturn) return
    return {
      request,
      mode: state.geographyMode,
      zoom: this.options.map.getZoom(),
      signature: generation.signature,
    }
  }
  private install = (frame: Frame) => {
    const generation = this.options.generation()
    if (
      !this.active ||
      !generation ||
      generation.signature !== frame.signature ||
      useMapStore.getState().mapContext !== 'energy'
    ) {
      this.invalidate()
      return
    }
    const descriptor =
      frame.request &&
      generation.descriptors.find((item) => item.level === frame.request!.level)
    const feature =
      frame.request && descriptor
        ? createAreaSelection({ request: frame.request, descriptor })
        : undefined
    if (frame.request && !feature) return
    this.controlled = true
    try {
      this.options.cancelDetails()
      useMapStore.getState().setSelectedFeatures([])
      useAppletStore.getState().setGeographyMode(frame.mode)
      // Keep the current center. Advertised source min zoom is respected; tiles
      // never supply full-area bounds. Manual overzoom remains supported.
      const zoom = Math.max(frame.zoom, descriptor?.source.minzoom ?? 0)
      this.options.map.jumpTo({
        zoom: Math.min(
          this.options.map.getMaxZoom(),
          Math.max(this.options.map.getMinZoom(), zoom)
        ),
      })
      this.buildingsReturn = !frame.request
      if (feature) useMapStore.getState().setSelectedFeatures([feature])
      this.options.changed(this.trail.length > 0)
    } finally {
      this.controlled = false
    }
  }
  navigateRelated = ({
    level,
    areaCode,
  }: {
    level: AreaLevel
    areaCode: string
  }) => {
    const frame = this.current()
    if (!frame?.request) return
    const request: AreaDetailRequest = {
      releaseId: frame.request.releaseId,
      level,
      areaCode,
      ...(frame.request.level === 'municipality' && level === 'postal_code'
        ? { municipalityCode: frame.request.areaCode }
        : {}),
    }
    // Validate before changing any state.
    const descriptor = this.options
      .generation()
      ?.descriptors.find((item) => item.level === level)
    if (!descriptor) return
    parseAreaDetailRequest(request)
    this.trail.push(frame)
    this.install({
      request,
      mode: level,
      zoom: navigationZoom[level],
      signature: frame.signature,
    })
  }
  showWholePostalArea = () => {
    const frame = this.current()
    if (
      frame?.request?.level !== 'postal_code' ||
      !frame.request.municipalityCode
    )
      return
    this.trail.push(frame)
    const { municipalityCode: _scope, ...request } = frame.request
    this.install({ ...frame, request })
  }
  showBuildings = () => {
    const frame = this.current()
    if (frame?.request?.level !== 'postal_code') return
    this.trail.push(frame)
    this.install({
      mode: 'buildings',
      zoom: Math.max(navigationZoom.buildings, frame.zoom),
      signature: frame.signature,
    })
  }
  back = () => {
    const frame = this.trail.pop()
    if (frame) this.install(frame)
  }
  selectMode = (mode: AreaGeographyMode) => {
    this.invalidate()
    this.controlled = true
    try {
      this.options.cancelDetails()
      useMapStore.getState().setSelectedFeatures([])
      useAppletStore.getState().setGeographyMode(mode)
    } finally {
      this.controlled = false
    }
  }
  dispose = () => {
    this.active = false
    this.unsubscribeSelection()
    this.unsubscribeMode()
    this.invalidate()
  }
}
