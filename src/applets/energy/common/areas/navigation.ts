import {
  areaThemeStyle,
  isAreaThemeEligible,
} from 'applets/energy/common/areas/thematicStyle'
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
import { resolveAreaGeography } from 'applets/energy/common/areas/mapModes'

type Frame = {
  request?: AreaDetailRequest
  properties?: Record<string, unknown>
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
      properties: request
        ? useMapStore
            .getState()
            .selectedFeatures.find(
              (feature) => feature.id === `${request.level}:${request.areaCode}`
            )?.properties
        : undefined,
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
      useMapStore.getState().mapContext !== 'energy' ||
      (frame.request &&
        (!areaThemeStyle(useAppletStore.getState()).visible ||
          !isAreaThemeEligible(
            frame.properties ?? {},
            useAppletStore.getState()
          )))
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
    if (feature && frame.properties)
      feature.properties = { ...feature.properties, ...frame.properties }
    const target = frame.request?.level ?? 'buildings'
    const zoom = Math.min(
      this.options.map.getMaxZoom(),
      Math.max(
        this.options.map.getMinZoom(),
        frame.zoom,
        descriptor?.source.minzoom ?? 0
      )
    )
    // A constrained map/source may not reach the target band. Never install
    // details for an invisible geography, or widen its render range.
    if (resolveAreaGeography({ zoom }) !== target) {
      this.invalidate()
      return
    }
    this.controlled = true
    try {
      this.options.cancelDetails()
      useMapStore.getState().setSelectedFeatures([])
      // Keep the center; tiles do not supply full-area bounds.
      this.options.map.jumpTo({ zoom })
      if (
        resolveAreaGeography({ zoom: this.options.map.getZoom() }) !== target
      ) {
        this.invalidate()
        return
      }
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
      zoom: Math.max(navigationZoom.buildings, frame.zoom),
      signature: frame.signature,
    })
  }
  back = () => {
    const frame = this.trail.pop()
    if (frame) this.install(frame)
  }
  dispose = () => {
    this.active = false
    this.unsubscribeSelection()
    this.invalidate()
  }
}
