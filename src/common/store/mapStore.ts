// The map store is a zustand store that manages the map state.
// A lot of the logic is split between this file and the Map component.
// There are a also various helper hooks in src/common/hooks/map.

import { map, cloneDeep, uniq, isEqual } from 'lodash-es'
import olms from 'ol-mapbox-style'
import turfBbox from '@turf/bbox'
import { immer } from 'zustand/middleware/immer'
import { produce } from 'immer'
import { Feature, FeatureCollection } from 'geojson'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  MapLayerMouseEvent,
  Map as MbMap,
  LngLatBounds,
  MapboxGeoJSONFeature,
  AnyLayer,
  MapLayerEventType,
} from 'mapbox-gl'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useUIStore } from '#/common/store'
import { Map as OlMap } from 'ol'
import drawStyles from '#/common/utils/drawStyles'

import {
  LayerGroupId,
  LayerOptions,
  LayerGroupOptions,
  ExtendedAnyLayer,
  OverlayMessage,
  MapLibraryMode,
  QueuePriority,
  PopupOpts,
  QueueFunction,
  FunctionQueue,
  LayerGroupAddOptions,
  SerializableLayerGroupAddOptions,
  LayerGroupAddOptionsWithConf,
  QueueOptions,
  MapContext,
  LayerConf,
  MapDrawOptions,
  DrawMode,
  FitBoundsOptions,
  LayerGroups,
  LayerEventHandlers,
} from '#/common/types/map'
import { layerConfs } from '#/components/Map/Layers'

import {
  getLayerName,
  getLayerType,
  assertValidHighlightingConf,
  resolveMbStyle,
  getVisibleLayerGroups,
  updateFeatureInDrawSource,
  addFeatureToDrawSource,
  deleteFeatureFromDrawSource,
  getMapboxDrawMode,
  getLayerGroupIdForLayer,
  isLayerGroupSelectable,
  fetchFeaturesByIds,
} from '#/common/utils/map'

const DEFAULT_MAP_LIBRARY_MODE: MapLibraryMode = 'mapbox'

export type Vars = {
  // Whether to use mapbox, openlayers, or both.
  // Currently only "mapbox" is ever used as the mode.
  mapLibraryMode: MapLibraryMode
  // Whether the map is ready to be interacted with.
  isLoaded: boolean
  // An overlay message over the map
  overlayMessage: OverlayMessage | null
  // Options for popup windows, when clicking a feature on the map
  popupOpts: PopupOpts | null
  // Whether user has activated drawing mode
  mapContext: MapContext
  selectedFeatures: MapboxGeoJSONFeature[]
  // The below are internal variables.
  // --------------------------------------
  // isMapReady is after the internal map object is ready to be interacted with,
  // but before the map functions are ready to be used by external components.
  _isMapReady: boolean
  _drawOptions: MapDrawOptions
  // A queue where functions are added before the map is loaded.
  // Executed after mapIsReady.
  _functionQueue: FunctionQueue
  // A variable to prevent bugs when executing function queue.
  _isFunctionQueueExecuting: boolean
  // mapbox map object
  _mbMap: MbMap | null
  // openlayers map object
  _olMap: OlMap | null
  // A single UI layer has often multiple layers which are grouped together.
  _layerGroups: LayerGroups
  // For quickly access a layer group by its id.
  _layerInstances: Record<string, AnyLayer>
  // For persisting user customised or uploaded layer configurations.
  _persistingLayerGroupAddOptions: Record<
    string,
    SerializableLayerGroupAddOptions
  >
  _isHydrated: boolean
  _hydrationData: {
    layerGroups: Record<string, LayerGroupOptions>
    persistingLayerGroupAddOptions: Record<
      string,
      SerializableLayerGroupAddOptions
    >
  }
}

export type Actions = {
  // Bounds of the source of a layer, e.g. the features in a geojson object
  getSourceBounds: (
    sourceId: string,
    _queueOptions?: QueueOptions
  ) => Promise<LngLatBounds | null>
  getSourceJson: (
    id: string,
    _queueOptions?: QueueOptions
  ) => Promise<FeatureCollection | null>
  addLayerGroup: (
    layerGroupId: LayerGroupId,
    options?: LayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  enableLayerGroup: (
    layerGroupId: LayerGroupId,
    options?: LayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  disableLayerGroup: (layerGroupId: LayerGroupId) => Promise<void>
  removeLayerGroup: (layerGroupId: LayerGroupId) => Promise<void>
  toggleLayerGroup: (
    layerGroupId: LayerGroupId,
    options?: LayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  // AnyLayerGroup allows adding layerGroups with custom ids,
  // e.g., uploaded custom layers with generated ids.
  addSerializableLayerGroup: (
    layerGroupIdString: string,
    options?: SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  toggleSerializableLayerGroup: (
    layerGroupIdString: string,
    options?: SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  enableSerializableLayerGroup: (
    layerGroupIdString: string,
    options?: SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  disableSerializableLayerGroup: (layerGroupIdString: string) => Promise<void>
  removeSerializableLayerGroup: (layerGroupIdString: string) => Promise<void>
  setLayoutProperty: (
    layer: string,
    name: string,
    value: any,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  setPaintProperty: (
    layer: string,
    name: string,
    value: any,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  // Only show specific features in a layer
  setFilter: (
    layer: string,
    filter: any[],
    _queueOptions?: QueueOptions
  ) => Promise<void>
  setOverlayMessage: (
    condition: boolean,
    message: OverlayMessage,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  fitBounds: (
    bbox: number[] | LngLatBounds,
    options?: FitBoundsOptions,
    _queueOptions?: QueueOptions
  ) => Promise<any>
  getAndFitBounds: (
    layerGroupId: string,
    options?: FitBoundsOptions,
    _queueOptions?: QueueOptions
  ) => Promise<any>
  setSelectedFeatures: (features: MapboxGeoJSONFeature[]) => void
  setMapLibraryMode: (mode: MapLibraryMode) => void
  getGeocoder: () => void
  mapRelocate: () => void
  mapResetNorth: () => void
  mapToggleTerrain: () => void
  mapZoomIn: () => void
  mapZoomOut: () => void
  toggleDrawMode: (
    drawMode: DrawMode,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  setDrawMode: (
    drawMode: DrawMode,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  disableDraw: (_queueOptions?: QueueOptions) => Promise<void>
  deleteDrawFeatures: (features: Feature[]) => void
  setMapContext: (mapContext: MapContext) => void
  // The below are internal variables
  // ----------------------------------
  _setIsHydrated: { (isHydrated: boolean): void }
  _setIsLoaded: { (isLoaded: boolean): void }
  _setIsMapReady: { (isMapReady: boolean): void }
  _setGroupVisibility: (layerGroupId: LayerGroupId, isVisible: boolean) => void
  _addMbStyle: (
    id: LayerGroupId,
    options: LayerGroupAddOptionsWithConf
  ) => Promise<void>
  _addMbPopup: (
    layer: string | string[],
    fn: (e: MapLayerMouseEvent) => void
  ) => void
  _addMbStyleToMb: (
    id: LayerGroupId,
    options: LayerGroupAddOptionsWithConf
  ) => Promise<void>
  _runLayerGroupActivationActions: (
    layerGroupIdString: string,
    opts?: LayerGroupAddOptions | SerializableLayerGroupAddOptions
  ) => Promise<void>
  _addToFunctionQueue: (queueFunction: QueueFunction) => Promise<any>
  _setFunctionQueue: (functionQueue: FunctionQueue) => void
  _executeFunctionQueue: (callback?: () => void) => Promise<void>
  _setIsFunctionQueueExecuting: (isExecuting: boolean) => void
  _setPopupOpts: (popupOpts: PopupOpts) => void
  _setMbMap: (mbMap: MbMap) => void
  // Adds a layer after the specified layer id.
  _addLayerAfter: (layer: AnyLayer, afterId: string) => void
  _findFirstMatchingLayer: (id: LayerGroupId | string) => string | null
  _findLastMatchingLayer: (id: LayerGroupId | string) => string | null
  _runHydrationActions: () => void
  _addPersistingLayerGroupAddOptions: (
    layerGroupId: string,
    serializableLayerGroupAddOptions: SerializableLayerGroupAddOptions
  ) => void
  _removePersistingLayerGroupAddOptions: (layerGroupId: string) => void
  _enableDraw: (
    drawMode?: MapboxDraw.DrawMode,
    _queueOptions?: QueueOptions
  ) => Promise<void>

  _removeDraw: (_queueOptions?: QueueOptions) => Promise<void>
  _enableLayerEventHandlers: (layerOptions: LayerOptions) => void
  _disableLayerEventHandlers: (layerOptions: LayerOptions) => void
  _enableLayerGroupEventHandlers: (layerGroupId: string) => void
  _disableLayerGroupEventHandlers: (layerGroupId: string) => void
}

export type State = Vars & Actions

export const useMapStore = create<State>()(
  // Include your additional states and setters...

  // Add your additional actions...

  persist(
    immer((set, get) => {
      const vars: Vars = {
        mapLibraryMode: DEFAULT_MAP_LIBRARY_MODE, // Assume an initial value
        isLoaded: false,
        overlayMessage: null,
        popupOpts: null,
        mapContext: null,
        selectedFeatures: [],
        _isMapReady: false,
        _drawOptions: {
          layerGroupId: null,
          draw: null,
          isEnabled: false,
          featureAddMutator: undefined,
          idField: undefined,
        },
        _functionQueue: [],
        _isFunctionQueueExecuting: false,
        _mbMap: null,
        _olMap: null,
        _layerGroups: {},
        _layerInstances: {},
        _isHydrated: false,
        _persistingLayerGroupAddOptions: {},
        _hydrationData: {
          layerGroups: {},
          persistingLayerGroupAddOptions: {},
        },
      }

      // A boilerplate for functions that are queued until the map object is ready
      const queueableFnInit = <
        A1 extends any[],
        A2 extends [queueOptions?: QueueOptions]
      >(
        fn: (...args: A1) => Promise<any>,
        queueOptions?: QueueOptions
      ) => {
        const queueableFn = async (
          fnWithArgs: { fn: (...args: A1) => Promise<any>; args: A1 },
          queueOptions: QueueOptions
        ) => {
          const { isLoaded, _addToFunctionQueue } = get()

          if (!isLoaded && !queueOptions.skipQueue) {
            return _addToFunctionQueue({
              fn: fnWithArgs.fn,
              args: fnWithArgs.args,
              priority: queueOptions.priority,
            })
          }

          return fnWithArgs.fn(...fnWithArgs.args)
        }

        return new Proxy(fn, {
          apply(_target, _thisArg, args) {
            const fnArgs = args.slice(0, fn.length) as A1

            // initialize queue options with values from the function initialization.
            // If they don't exist, use the default values.
            const qOpts: QueueOptions = {
              skipQueue:
                queueOptions?.skipQueue != null
                  ? queueOptions?.skipQueue
                  : false,
              priority:
                queueOptions?.priority != null
                  ? queueOptions?.priority
                  : QueuePriority.LOW,
            }

            // Overwrite queue options with values from the function call.
            if (fn.length < args.length) {
              const qArgs = args[fn.length] as QueueOptions
              qOpts.skipQueue =
                qArgs?.skipQueue != null ? qArgs?.skipQueue : qOpts.skipQueue
              qOpts.priority =
                qArgs?.priority != null ? qArgs?.priority : qOpts.priority
            }
            return queueableFn({ fn: fn, args: fnArgs }, qOpts)
          },
        }) as unknown as (...args: [...A1, ...A2]) => Promise<any>
      }

      const actions: Actions = {
        getSourceBounds: queueableFnInit(
          async (sourceId: string): Promise<LngLatBounds | null> => {
            // Query source features for the specified source
            try {
              const { _mbMap, getSourceJson } = get()

              if (!_mbMap) {
                return null
              }

              let featureColl: FeatureCollection | null = null

              const sourceFeatures = await getSourceJson(sourceId, {
                skipQueue: true,
              })

              if (sourceFeatures) {
                featureColl = sourceFeatures
              } else {
                const features = _mbMap.querySourceFeatures(sourceId)

                if (features.length > 0 && features[0].geometry) {
                  featureColl = {
                    type: 'FeatureCollection',
                    features: features,
                  }
                } else {
                  const source = _mbMap.getSource(sourceId)
                  // TODO: check the method of finding the set extent of a source in style. This method is probably deprecated.
                  //@ts-ignore
                  if (source && source.tileBounds && source.tileBounds.bounds) {
                    //@ts-ignore
                    return source.tileBounds.bounds
                  }
                }
              }

              if (!featureColl) {
                return null
              }

              const bbox = turfBbox(featureColl)

              if (bbox.includes(Infinity) || bbox.includes(-Infinity)) {
                return null
              }
              // Convert Turf.js bbox to Mapbox LngLatBounds
              const bounds = new mapboxgl.LngLatBounds(
                [bbox[0], bbox[1]], // [west, south] or [minX, minY]
                [bbox[2], bbox[3]] // [east, north] or [maxX, maxY]
              )

              return bounds
            } catch (e) {
              console.error("Couldn't get source bounds")
              console.error(e)
              return null
            }
          },
          { priority: QueuePriority.LOW }
        ),

        getSourceJson: queueableFnInit(
          async (id: string): Promise<FeatureCollection | null> => {
            try {
              const { _mbMap } = get()
              const geojson: FeatureCollection =
                //@ts-ignore
                _mbMap?.getSource(id)._options.data
              return geojson
            } catch (e) {
              console.error(e)
            }
            return null
          },
          { priority: QueuePriority.LOW }
        ),

        setMapLibraryMode: (mode: MapLibraryMode) => {
          set((state) => {
            state.mapLibraryMode = mode
          })
        },

        setSelectedFeatures: (features: MapboxGeoJSONFeature[]) => {
          const { _mbMap, selectedFeatures } = get()

          if (!isEqual(features, selectedFeatures)) {
            let selectedLayerIds: string[] = []
            features.map((feature) => {
              selectedLayerIds.push(feature.layer.id)
            })

            if (features)
              // add layer ids from the previous selection
              selectedFeatures.map((feature) => {
                selectedLayerIds.push(feature.layer.id)
              })

            selectedLayerIds = uniq(selectedLayerIds)
            for (const id of selectedLayerIds) {
              const featureIds = features
                .filter((f) => f.layer.id === id)
                .map((feature) => {
                  return feature.id
                })

              // highlight the selected features using the highlighted-layer in the group
              _mbMap?.setFilter(getLayerName(id) + '-highlighted', [
                'in',
                'id',
                ...featureIds,
              ])
            }

            set(
              produce((draft: State) => {
                draft.selectedFeatures = features
              })
            )
          }
        },

        // TODO: The logic of this function is getting too complex. Now we have
        // LayerConfs fetched from the common storage and LayerConfs supplied by the calling
        // component. Solution:
        // make "options" mandatory, and always supply a layerConf from the calling function.
        addLayerGroup: queueableFnInit(
          async (
            layerGroupId: LayerGroupId,
            options?: LayerGroupAddOptions | SerializableLayerGroupAddOptions
          ) => {
            const {
              _addMbStyleToMb,
              _addMbStyle,
              _persistingLayerGroupAddOptions,
              _addPersistingLayerGroupAddOptions,
              mapContext,
              _runLayerGroupActivationActions,
            } = get()

            // Initialize layer if it doesn't exist
            let opts = cloneDeep(options) || {
              persist: false,
              layerConf: undefined,
            }

            if (opts.mapContext == null) {
              opts.mapContext = mapContext
            }

            if (opts.mapContext !== mapContext) {
              opts.isHidden = true
            }

            if (opts.persist) {
              _addPersistingLayerGroupAddOptions(layerGroupId, opts)
            }

            if (!opts.layerConf) {
              opts = cloneDeep(_persistingLayerGroupAddOptions[layerGroupId])
            }

            if (!opts.layerConf) {
              opts.layerConf = layerConfs.find((el: LayerConf) => {
                return el.id === layerGroupId
              })
            }

            if (opts.layerConf) {
              if (opts.layerConf.useMb == null || opts.layerConf.useMb) {
                await _addMbStyleToMb(
                  layerGroupId,
                  opts as LayerGroupAddOptionsWithConf
                )
              } else {
                await _addMbStyle(
                  layerGroupId,
                  opts as LayerGroupAddOptionsWithConf
                )
              }

              // Add event listener for source data changes

              _runLayerGroupActivationActions(layerGroupId, opts)
            } else {
              console.error('No layer config found for id: ' + layerGroupId)
            }
          },
          { priority: QueuePriority.MEDIUM_HIGH }
        ),

        enableLayerGroup: async (
          layerGroupId: LayerGroupId,
          options?: LayerGroupAddOptions
        ) => {
          const {
            _layerGroups,
            _setGroupVisibility,
            addLayerGroup,
            _runLayerGroupActivationActions,
          } = get()

          if (_layerGroups[layerGroupId]) {
            _setGroupVisibility(layerGroupId, true)
            _runLayerGroupActivationActions(layerGroupId, options)
          } else {
            addLayerGroup(layerGroupId, options)
          }
        },

        disableLayerGroup: async (layerGroupId: LayerGroupId) => {
          const {
            _setGroupVisibility,
            _layerGroups,
            _drawOptions,
            _removeDraw,
          } = get()

          if (!Object.keys(_layerGroups).includes(layerGroupId)) {
            throw new Error(
              "Unable to disable layer group that isn't enabled: " +
                layerGroupId
            )
          }

          _setGroupVisibility(layerGroupId, false)
          if (_drawOptions.layerGroupId === layerGroupId) {
            _removeDraw({ skipQueue: true })
          }
        },

        removeLayerGroup: async (layerGroupId: LayerGroupId) => {
          const { _layerGroups, _mbMap, _drawOptions, _removeDraw } = get() // Assuming you have a map reference in your store.

          if (!Object.keys(_layerGroups).includes(layerGroupId)) {
            console.error(
              'Unable to remove layer group that does not have layer group options: ' +
                layerGroupId
            )
            return
          }

          const layerGroupOptions = _layerGroups[layerGroupId]

          // Remove each layer from the map.
          for (const layerId of Object.keys(layerGroupOptions.layers)) {
            if (_mbMap?.getLayer(layerId)) {
              _mbMap?.removeLayer(layerId)
            }

            // Optional: If there's a source associated with this layer and no other layer is using it.
            // Here I'm assuming layerId and sourceId are the same. Adjust if different.
            if (_mbMap?.getSource(layerId)) {
              _mbMap?.removeSource(layerId)
            }
          }

          if (layerGroupOptions.handleDataUpdate) {
            _mbMap?.off('data', layerGroupOptions.handleDataUpdate)
          }

          set(
            produce((state: State) => {
              delete state._layerGroups[layerGroupId]
            })
          )

          if (_drawOptions.layerGroupId === layerGroupId) {
            await _removeDraw({ skipQueue: true })
          }
        },

        toggleLayerGroup: async (
          layerGroupId: LayerGroupId,
          options?: LayerGroupAddOptions
        ) => {
          const { disableLayerGroup, enableLayerGroup, _layerGroups } = get()

          if (Object.keys(_layerGroups).includes(layerGroupId)) {
            await disableLayerGroup(layerGroupId)
          } else {
            await enableLayerGroup(layerGroupId, options)
          }
        },

        // these are used used for layers with dynamic ids
        addSerializableLayerGroup: async (
          layerGroupIdString: string,
          options?: SerializableLayerGroupAddOptions
        ) => {
          const { addLayerGroup } = get()

          try {
            await addLayerGroup(
              layerGroupIdString as LayerGroupId,
              options as LayerGroupAddOptions
            )
          } catch (e) {
            'Unable to add layer with id: ' + layerGroupIdString
            console.error(e)
          }
        },

        toggleSerializableLayerGroup: async (
          layerGroupIdString: string,
          options?: SerializableLayerGroupAddOptions
        ) => {
          const { toggleLayerGroup } = get()

          try {
            await toggleLayerGroup(
              layerGroupIdString as LayerGroupId,
              options as LayerGroupAddOptions
            )
          } catch (e) {
            'Unable to toggle layer with id: ' + layerGroupIdString
            console.error(e)
          }
        },

        enableSerializableLayerGroup: async (
          layerGroupIdString: string,
          options?: SerializableLayerGroupAddOptions
        ) => {
          const { enableLayerGroup } = get()

          try {
            enableLayerGroup(
              layerGroupIdString as LayerGroupId,
              options as LayerGroupAddOptions
            )
          } catch (e) {
            'Unable to enable layer with id: ' + layerGroupIdString
            console.error(e)
          }
        },

        disableSerializableLayerGroup: async (layerGroupIdString: string) => {
          const { disableLayerGroup } = get()

          await disableLayerGroup(layerGroupIdString as LayerGroupId)
        },

        removeSerializableLayerGroup: async (layerGroupIdString: string) => {
          const { removeLayerGroup } = get() // Assuming you have a map reference in your store.

          await removeLayerGroup(layerGroupIdString as LayerGroupId)
        },

        setLayoutProperty: queueableFnInit(
          async (layer: string, name: string, value: any): Promise<any> => {
            const { _mbMap } = get()

            _mbMap?.setLayoutProperty(layer, name, value)
          }
        ),

        setPaintProperty: queueableFnInit(
          async (layer: string, name: string, value: any): Promise<any> => {
            const { _mbMap } = get()

            _mbMap?.setPaintProperty(layer, name, value)
          }
        ),

        setFilter: queueableFnInit(
          async (layer: string, filter: any[]): Promise<any> => {
            const { _mbMap } = get()

            _mbMap?.setFilter(layer, filter)
          }
        ),

        setOverlayMessage: async (
          condition: boolean,
          message: OverlayMessage
        ) => {
          set((state) => {
            state.overlayMessage = condition ? message : null
          })
        },

        fitBounds: queueableFnInit(
          (
            bbox: number[] | LngLatBounds,
            {
              duration = 2000,
              lonExtra = 1,
              latExtra = 1,
            }: FitBoundsOptions = {}
          ): Promise<void> => {
            const { _mbMap } = get()

            let [lonMax, lonMin, latMax, latMin] = [0, 0, 0, 0]

            if (bbox instanceof LngLatBounds) {
              const southWest = bbox.getSouthWest()
              const northEast = bbox.getNorthEast()

              lonMax = northEast.lng
              lonMin = southWest.lng
              latMax = northEast.lat
              latMin = southWest.lat
            } else {
              lonMax = bbox[0]
              lonMin = bbox[1]
              latMax = bbox[2]
              latMin = bbox[3]
            }

            const flyOptions = { duration: duration }
            const lonDiff = lonMax - lonMin
            const latDiff = latMax - latMin
            _mbMap?.fitBounds(
              [
                [lonMin - lonExtra * lonDiff, latMin - latExtra * latDiff],
                [lonMax + lonExtra * lonDiff, latMax + latExtra * latDiff],
              ],
              flyOptions
            )

            return Promise.resolve()
          }
        ),

        getAndFitBounds: queueableFnInit(
          async (
            layerGroupId,
            {
              duration = 2000,
              lonExtra = 1,
              latExtra = 1,
            }: FitBoundsOptions = {}
          ): Promise<void> => {
            const { fitBounds, getSourceBounds } = get()

            const bounds = await getSourceBounds(layerGroupId, {
              skipQueue: true,
            })
            if (bounds) {
              fitBounds(
                bounds,
                {
                  duration: duration,
                  latExtra: lonExtra,
                  lonExtra: latExtra,
                },
                { skipQueue: true }
              )
            }

            return Promise.resolve()
          }
        ),

        getGeocoder: () => {
          // set((state) => {
          // })
        },
        mapRelocate: () => {
          // set((state) => {
          // })
        },
        mapResetNorth: () => {
          const { _mbMap } = get()
          _mbMap?.resetNorth()
        },

        mapToggleTerrain: () => {
          const { toggleLayerGroup } = get()
          toggleLayerGroup('terramonitor', {
            mapContext: 'any',
            isAddedBefore: false,
            neighboringLayerGroupId: 'osm',
          })
        },

        mapZoomIn: () => {
          const { _mbMap } = get()
          _mbMap?.zoomIn()
        },

        mapZoomOut: () => {
          const { _mbMap } = get()
          _mbMap?.zoomOut()
        },

        deleteDrawFeatures: (features: Feature[]) => {
          const { _mbMap, _drawOptions } = get()

          if (_drawOptions.draw == null) {
            console.error('Cannot delete features: No draw object found.')
            return
          }

          const featureIds = features.map((feature) => String(feature.id))

          _drawOptions.draw.delete(featureIds)

          _mbMap?.fire('draw.delete', { features })
        },

        toggleDrawMode: queueableFnInit(
          async (drawMode: DrawMode) => {
            const { _drawOptions, _enableDraw, disableDraw } = get()

            let mode = getMapboxDrawMode(drawMode)

            if (_drawOptions.draw == null) {
              await _enableDraw(mode, { skipQueue: true })
            } else {
              if (_drawOptions.draw.getMode() === mode) {
                disableDraw({ skipQueue: true })
                return
              }
            }

            // Shitty typing in MapboxDraw
            _drawOptions.draw?.changeMode(mode as any)
          },
          {
            priority: QueuePriority.LOW,
          }
        ),

        setDrawMode: queueableFnInit(
          async (drawMode: DrawMode) => {
            const { _drawOptions, _enableDraw } = get()

            let mode = getMapboxDrawMode(drawMode)

            if (_drawOptions.draw == null) {
              await _enableDraw(mode, { skipQueue: true })
            } else {
              // Shitty typing in MapboxDraw
              _drawOptions.draw.changeMode(mode as any)
            }
          },
          {
            priority: QueuePriority.LOW,
          }
        ),

        setMapContext: (mapContext: MapContext) => {
          const { _layerGroups, enableLayerGroup, disableLayerGroup } = get()

          set((state) => {
            state.mapContext = mapContext
          })
        },

        _enableDraw: queueableFnInit(
          async (drawMode?: MapboxDraw.DrawMode) => {
            const {
              _mbMap,
              _drawOptions,
              selectedFeatures,
              _layerGroups,
              _disableLayerGroupEventHandlers,
              setSelectedFeatures,
            } = get()

            if (_drawOptions.layerGroupId == null) {
              console.error('No layerGroupId set for drawing.')
              return
            }

            const layerGroupId = _drawOptions.layerGroupId

            const source = cloneDeep(_mbMap?.getStyle().sources[layerGroupId])

            if (!source) {
              console.error(`No source found with id: ${layerGroupId}`)
              return
            }

            const originalStyles: Record<string, any> = {}

            _mbMap?.getStyle().layers.forEach((layer) => {
              if (layer.id.startsWith(`${layerGroupId}-`)) {
                let opacityProperty: string | undefined = undefined

                switch (layer.type) {
                  case 'fill':
                    opacityProperty = 'fill-opacity'
                    break
                  case 'line':
                    opacityProperty = 'line-opacity'
                    break
                  case 'symbol':
                    if (layer.layout) {
                      if ('text-field' in layer.layout) {
                        opacityProperty = 'text-opacity'
                      } else if ('icon-image' in layer.layout) {
                        opacityProperty = 'icon-opacity'
                      }
                    }
                    break
                }

                if (opacityProperty) {
                  let originalOpacity = 1
                  try {
                    const opacity = _mbMap.getPaintProperty(
                      layer.id,
                      opacityProperty
                    ) as number | undefined
                    if (typeof opacity === 'number' && opacity > 0.3) {
                      originalOpacity = opacity
                      _mbMap.setPaintProperty(layer.id, opacityProperty, 0.3)
                    }
                  } catch (e) {
                    console.error(
                      `Error adjusting ${opacityProperty} for layer ${layer.id}: `,
                      e
                    )
                  }

                  if (!originalStyles[layer.id]) originalStyles[layer.id] = {}
                  originalStyles[layer.id][opacityProperty] = originalOpacity
                }
              }
            })

            const draw = new MapboxDraw({
              displayControlsDefault: false,
              defaultMode: drawMode || 'simple_select',
              userProperties: true,
              styles: drawStyles,
              keybindings: true,
            })

            _mbMap?.addControl(draw, 'bottom-right')

            if ('data' in source) {
              const data = source.data as FeatureCollection
              const features = data.features
              try {
                // As mapbox draw creates a clone of the original features, we need to ensure
                // that the id field is properly cloned as well. It is used to identify updated and deleted
                // features across the two datasets.
                // If idField is not set (feature.properties[idField]), the feature.id is used instead.
                const modifiedFeatures = features.map((feature) => {
                  const userProperties: Record<string, any> = {}

                  if (_drawOptions.idField != null) {
                    const id = (feature.properties as any)[_drawOptions.idField]
                    userProperties[_drawOptions.idField] = id

                    if (id !== undefined) {
                    } else {
                      throw new Error(
                        `No "${_drawOptions.idField}" found in draw feature's properties.`
                      )
                    }
                  } else {
                    userProperties['id'] = feature.id
                  }

                  return {
                    ...feature,
                    properties: userProperties,
                  }
                })

                const modifiedSourceData = {
                  ...data,
                  features: modifiedFeatures,
                }
                //@ts-ignore
                await draw.add(modifiedSourceData)

                if (selectedFeatures?.length > 0) {
                  let newSelectedFeatures: MapboxGeoJSONFeature[] = []
                  if (draw.getMode() === 'simple_select') {
                    newSelectedFeatures = selectedFeatures.filter((feature) => {
                      return (
                        getLayerGroupIdForLayer(
                          feature.layer.id,
                          _layerGroups
                        ) === layerGroupId
                      )
                    })

                    const drawData = draw.getAll()

                    const matchingFeatures = drawData.features.filter(
                      (drawFeature) => {
                        return selectedFeatures.some((selectedFeature) => {
                          return (
                            drawFeature.properties?.id === selectedFeature.id
                          )
                        })
                      }
                    )

                    const matchingFeatureIds = matchingFeatures.map(
                      (feature) => feature.id as string
                    )

                    if (matchingFeatureIds.length > 0) {
                      draw.changeMode('simple_select', {
                        featureIds: matchingFeatureIds,
                      })
                    }
                  }
                  setSelectedFeatures(newSelectedFeatures)
                }
              } catch (e) {
                console.error(e)
                return
              }

              const idField = _drawOptions.idField || 'id'

              const handleDrawCreate = (e: any) => {
                e.features.forEach((feature: Feature) => {
                  if (_drawOptions.featureAddMutator != null) {
                    const mutatedFeature =
                      _drawOptions.featureAddMutator(feature)

                    const id = (mutatedFeature.properties as any)[idField]

                    if (id !== undefined) {
                      draw.setFeatureProperty(String(feature.id), idField, id)
                    } else {
                      console.error(
                        `Mutated draw feature has no idField: "${idField}"`
                      )
                      return
                    }
                  }
                  addFeatureToDrawSource(feature, layerGroupId, _mbMap)
                })
              }

              const handleDrawUpdate = (e: any) => {
                e.features.forEach((feature: Feature) => {
                  if (_drawOptions.featureUpdateMutator != null) {
                    feature = _drawOptions.featureUpdateMutator(feature)
                  }
                  updateFeatureInDrawSource(
                    feature,
                    idField,
                    layerGroupId,
                    _mbMap
                  )
                })
              }

              const handleDrawDelete = (e: any) => {
                e.features.forEach((feature: Feature) => {
                  deleteFeatureFromDrawSource(
                    feature,
                    idField,
                    layerGroupId,
                    _mbMap
                  )
                })
              }

              let handleSelectionChange: ((e: any) => void) | undefined =
                undefined

              if (isLayerGroupSelectable(layerGroupId, _layerGroups)) {
                handleSelectionChange = (e: any) => {
                  const featureIds = e.features.map((feature: any) => {
                    return feature.properties[idField]
                  })

                  const features = fetchFeaturesByIds(
                    featureIds,
                    layerGroupId,
                    idField,
                    _mbMap
                  )

                  if (features) {
                    setSelectedFeatures(features)
                  }
                }
                _mbMap?.on('draw.selectionchange', handleSelectionChange)
              }

              _mbMap?.on('draw.create', handleDrawCreate)
              _mbMap?.on('draw.update', handleDrawUpdate)
              _mbMap?.on('draw.delete', handleDrawDelete)

              set((state) => {
                state._drawOptions.draw = draw
                state._drawOptions.originalStyles = originalStyles
                state._drawOptions.handleDrawCreate = handleDrawCreate
                state._drawOptions.handleDrawUpdate = handleDrawUpdate
                state._drawOptions.handleDrawDelete = handleDrawDelete
                state._drawOptions.handleSelectionChange = handleSelectionChange
              })

              _disableLayerGroupEventHandlers(layerGroupId)
            }
          },
          { priority: QueuePriority.LOW }
        ),

        disableDraw: queueableFnInit(
          async () => {
            const { _mbMap, _drawOptions } = get()

            const drawInstance = _drawOptions.draw

            if (drawInstance != null) {
              if (_drawOptions.layerGroupId != null) {
                // geoJSON.features.forEach((feature) => {
                //   const properties = feature.properties || {}
                //   const modifiedProperties: Record<string, any> = {}

                //   for (const key in properties) {
                //     // The original properties of the source features are prefixed with "user_"
                //     // Remove other properties, and remove the prefix that was added by draw.
                //     if (key.startsWith('user_')) {
                //       const modifiedKey = key.replace('user_', '')
                //       modifiedProperties[modifiedKey] = properties[key]
                //     }
                //   }

                //   feature.properties = modifiedProperties
                // })

                // // Set the modified GeoJSON to the original source
                // const originalSource = _mbMap?.getSource(
                //   _drawOptions.layerGroupId
                // ) as mapboxgl.GeoJSONSource
                // originalSource.setData(geoJSON)

                if (_drawOptions.originalStyles != null) {
                  for (const [layerId, style] of Object.entries(
                    _drawOptions.originalStyles
                  )) {
                    for (const [property, value] of Object.entries(style)) {
                      _mbMap?.setPaintProperty(layerId, property, value)
                    }
                  }
                }
              }

              _mbMap?.removeControl(drawInstance)

              if (_drawOptions.handleDrawCreate != null) {
                _mbMap?.off('draw.create', _drawOptions.handleDrawCreate)
              }
              if (_drawOptions.handleDrawUpdate != null) {
                _mbMap?.off('draw.update', _drawOptions.handleDrawUpdate)
              }
              if (_drawOptions.handleDrawDelete != null) {
                _mbMap?.off('draw.delete', _drawOptions.handleDrawDelete)
              }
              if (_drawOptions.handleSelectionChange != null) {
                _mbMap?.off(
                  'draw.selectionchange',
                  _drawOptions.handleSelectionChange
                )
              }

              await set((state) => {
                state._drawOptions.draw = null
                state._drawOptions.originalStyles = undefined
                state._drawOptions.handleDrawCreate = undefined
                state._drawOptions.handleDrawUpdate = undefined
                state._drawOptions.handleDrawDelete = undefined
                state._drawOptions.handleSelectionChange = undefined
              })
            }
          },
          {
            priority: QueuePriority.LOW,
          }
        ),

        _removeDraw: queueableFnInit(
          async () => {
            const { disableDraw } = get()

            await disableDraw({ skipQueue: true })
            await set((state) => {
              state._drawOptions.layerGroupId = null
              state._drawOptions.isEnabled = false
            })
          },
          {
            priority: QueuePriority.LOW,
          }
        ),

        _setIsHydrated: (isHydrated: boolean) => {
          set((state) => {
            state._isHydrated = isHydrated
          })
        },

        _setIsLoaded: (isLoaded: boolean) => {
          set((state) => {
            state.isLoaded = isLoaded
          })
        },

        _setIsMapReady: (isMapReady: boolean) => {
          set((state) => {
            state._isMapReady = isMapReady
          })
        },

        _setGroupVisibility: (
          layerGroupId: LayerGroupId,
          isVisible: boolean
        ) => {
          const { _layerGroups, _mbMap } = get()
          const layerGroup = _layerGroups[layerGroupId]

          for (const layerId in layerGroup.layers) {
            if (layerGroup.layers[layerId].useMb) {
              _mbMap?.setLayoutProperty(
                layerId,
                'visibility',
                isVisible ? 'visible' : 'none'
              )
            } else {
              // TODO: For OpenLayer usage. Fix later if needed
              // layerGroup.layers[layerId].setVisible(isVisible)
            }
          }

          set((state) => {
            state._layerGroups[layerGroupId].isHidden = !isVisible
          })
        },

        _setPopupOpts: (popupOpts: PopupOpts) => {
          set(
            produce((state) => {
              state.popupOpts = popupOpts
            })
          )
        },

        // Used by OpenLayers. Broken after removing ActiveLayerGroupIds
        // Refactor if migrating to OpenLayers
        _addMbStyle: async (
          id: LayerGroupId,
          options: LayerGroupAddOptionsWithConf
        ) => {
          const style = await resolveMbStyle(options.layerConf.style)

          const layers: ExtendedAnyLayer[] = style.layers
          const sourceKeys = Object.keys(style.sources)

          const layerGroup: any = {}

          // After adding the layers using style, find them and add them to the layerGroup
          //@ts-ignore
          olms(map, style).then((map) => {
            map
              .getLayers()
              .getArray()
              .forEach((layer: any) => {
                const sourceKey = layer.get('mapbox-source')
                const layerKeys = layer.get('mapbox-layers')

                if (
                  sourceKeys.includes(sourceKey) &&
                  layerKeys != null &&
                  layerKeys.length > 0
                ) {
                  const conf: ExtendedAnyLayer | undefined = layers.find(
                    (l: any) => l.id === layerKeys[0]
                  )

                  if (conf) {
                    //@ts-ignore
                    const layerOpt: LayerOptions = {
                      id: layerKeys[0],
                      source: sourceKey,
                      name: getLayerName(layerKeys[0]),
                      layerType: getLayerType(layerKeys[0]),
                      selectable: conf.selectable || false,
                      multiSelectable: conf.multiSelectable || false,
                      //@ts-ignore
                      popup: options.layerConf.popup || false,
                      useMb: false,
                    }

                    assertValidHighlightingConf(layerOpt, layers)

                    layer.set('group', id)
                    layerGroup[layerKeys[0]] = layer

                    set((state) => {
                      //@ts-ignore
                      state._layerOptions[layerKeys[0]] = layerOpt
                    })
                  } else {
                    console.error(
                      'Could not find layer configuration for layer: ' +
                        layerKeys[0]
                    )
                  }
                }
              })

            set((state) => {
              state._layerGroups[id] = layerGroup
            })

            if (!options.isHidden) {
              set((state) => {
                //@ts-ignore
                state.activeLayerGroupIds.push(id)
              })
            } else {
              for (const layer in layerGroup) {
                layerGroup[layer].setVisible(false)
              }
            }

            // TODO: Figure out olMap popups
            // if (layerConf.popup) {
            //   set((state) => {
            //     state.popups[id] = layerConf.popup
            //   })
            // }
          })
        },

        _addMbPopup: (
          layer: string | string[],
          fn: (e: MapLayerMouseEvent) => void
        ) => {
          const { _mbMap } = get()

          _mbMap?.on('click', layer, fn)
          _mbMap?.on('mouseenter', layer, () => {
            if (_mbMap) {
              _mbMap.getCanvas().style.cursor = 'pointer'
            }
          })
          _mbMap?.on('mouseleave', layer, () => {
            if (_mbMap) {
              _mbMap.getCanvas().style.cursor = ''
            }
          })
        },

        _addMbStyleToMb: async (
          id: LayerGroupId,
          options: LayerGroupAddOptionsWithConf
        ) => {
          const {
            _addMbPopup,
            _mbMap,
            _addLayerAfter,
            _findFirstMatchingLayer,
            _findLastMatchingLayer,
            _enableLayerGroupEventHandlers,
          } = get()
          const setIsMapPopupOpen = useUIStore.getState().setIsMapPopupOpen

          const style = await resolveMbStyle(options.layerConf.style)

          let layerInsertId: string | null = null

          try {
            for (const sourceKey in style.sources) {
              _mbMap?.addSource(sourceKey, style.sources[sourceKey])
            }

            const layerGroup: LayerGroupOptions = {
              id: id,
              mapContext: options.mapContext,
              isHidden: options.isHidden ? true : false,
              persist: options.persist ? true : false,
              layers: {},
            }

            for (const layer of style.layers) {
              const layerOptions: LayerOptions = {
                id: layer.id,
                source: layer.source,
                name: getLayerName(layer.id),
                layerType: getLayerType(layer.id),
                selectable: layer.selectable || false,
                multiSelectable: layer.multiSelectable || false,
                popup:
                  'popup' in options.layerConf
                    ? options.layerConf.popup || false
                    : false,
                useMb: true,
                eventHandlers: {} as LayerEventHandlers,
              }

              layerGroup.layers[layer.id] = layerOptions

              if (layerOptions.layerType === 'fill') {
                if (layer.selectable) {
                  if (
                    !style.layers.find(
                      (l: any) => l.id === layerOptions.name + '-highlighted'
                    )
                  ) {
                    console.error(
                      "Layer '" +
                        layerOptions.name +
                        "' is selectable but missing the corresponding highlighted layer."
                    )
                  } else {
                    const mouseEnterHandler = () => {
                      if (_mbMap) {
                        _mbMap.getCanvas().style.cursor = 'pointer'
                      }
                    }

                    const mouseLeaveHandler = () => {
                      if (_mbMap) {
                        _mbMap.getCanvas().style.cursor = ''
                      }
                    }
                    layerOptions.eventHandlers['mouseenter'] = mouseEnterHandler
                    layerOptions.eventHandlers['mouseleave'] = mouseLeaveHandler
                  }
                }

                if (layerOptions.popup) {
                  const Popup: any = layerOptions.popup

                  const popupFn = (evt: MapLayerMouseEvent) => {
                    const features = evt.features || []
                    const popupOpts: PopupOpts = {
                      features,
                      PopupElement: Popup,
                    }

                    set(
                      produce((state) => {
                        state.popupOpts = popupOpts
                      })
                    )

                    setIsMapPopupOpen(true)
                  }
                  _addMbPopup(layer.id, popupFn)
                }
              }

              assertValidHighlightingConf(layerOptions, style.layers)

              set((state) => {
                state._layerInstances[layer.id] = layer
              })

              // if layerInsertId is null, this is the first layer to be added
              if (layerInsertId == null) {
                // if the layer is added before, add the first layer before the neighboring layer
                // The consecutive layers are added after the first layer
                // In Mapbox, the last layer is rendered on top.
                if (options.isAddedBefore) {
                  if (options.neighboringLayerGroupId != null) {
                    const beforeLayer = _findFirstMatchingLayer(
                      options.neighboringLayerGroupId
                    )
                    _mbMap?.addLayer(layer, beforeLayer || undefined)
                  } else {
                    const mapLayers = _mbMap?.getStyle().layers
                    if (mapLayers && mapLayers.length > 0) {
                      // add layer before the first layer, if there is one
                      _mbMap?.addLayer(layer, mapLayers[0].id)
                    } else {
                      // or if not, just add it normally
                      _mbMap?.addLayer(layer)
                    }
                  }
                }
                // If the layer is added after, add the first layer after the neighboring layer
                else {
                  if (options.neighboringLayerGroupId != null) {
                    layerInsertId = _findLastMatchingLayer(
                      options.neighboringLayerGroupId
                    )
                  }
                  if (layerInsertId != null) {
                    _addLayerAfter(layer, layerInsertId)
                  } else {
                    _mbMap?.addLayer(layer)
                  }
                }
              }
              // the consecutive layers are added after the first layer
              else {
                _addLayerAfter(layer, layerInsertId)
                layerInsertId = layer.id
              }

              layerInsertId = layer.id

              if (!options.isHidden) {
                _mbMap?.setLayoutProperty(layer.id, 'visibility', 'visible')
              } else {
                _mbMap?.setLayoutProperty(layer.id, 'visibility', 'none')
              }
            }

            await set((state) => {
              state._layerGroups[id] = layerGroup
            })

            _enableLayerGroupEventHandlers(id)
          } catch (e: any) {
            if (!e.message.includes('There is already a source')) {
              console.error(e)
            }
          }
        },

        _runLayerGroupActivationActions: async (
          layerGroupIdString: string,
          opts?: LayerGroupAddOptions | SerializableLayerGroupAddOptions
        ) => {
          if (opts != null) {
            const { getAndFitBounds, _drawOptions, _removeDraw, _mbMap } = get()
            if (opts?.zoomToExtent) {
              getAndFitBounds(layerGroupIdString, undefined, {
                skipQueue: true,
              })
            }

            if (
              opts?.drawOptions != null &&
              (opts.drawOptions.polygonEnabled || opts.drawOptions.editEnabled)
            ) {
              if (_drawOptions != null) {
                await _removeDraw({ skipQueue: true })
              }
              set((state) => {
                state._drawOptions = {
                  draw: null,
                  polygonEnabled: false,
                  editEnabled: false,
                  deleteEnabled: false,
                  ...opts.drawOptions,
                  layerGroupId: layerGroupIdString,
                  isEnabled: true,
                }
              })
            }

            if ('dataUpdateMutator' in opts) {
              const handleDataUpdate = (e: any) => {
                if (
                  e.dataType === 'source' &&
                  e.sourceId === layerGroupIdString &&
                  e.isSourceLoaded
                ) {
                  // Source data for the layerGroupId has changed/loaded
                  if ('data' in e.source) {
                    if (e.source.data != null) {
                      if (opts.dataUpdateMutator != null) {
                        opts.dataUpdateMutator(e.source.data) // Update Zustand store with new data
                      }
                    }
                  }
                }
              }

              set((state) => {
                state._layerGroups[layerGroupIdString].handleDataUpdate =
                  handleDataUpdate
              })

              _mbMap?.on('data', handleDataUpdate)
            }
          }
        },
        // ensures that latest state is used in the callback
        _addToFunctionQueue: (queueFunction: QueueFunction): Promise<any> => {
          // construct a promise that will be manually resolved when the function is called
          let promiseResolve: any, promiseReject: any
          const promise = new Promise((resolve, reject) => {
            promiseResolve = resolve
            promiseReject = reject
          })

          if (queueFunction.priority === undefined) {
            queueFunction.priority = QueuePriority.LOW
          }

          set((state) => {
            state._functionQueue.push({
              fn: queueFunction.fn,
              args: queueFunction.args,
              priority: queueFunction.priority,
              promise: {
                resolve: promiseResolve,
                reject: promiseReject,
              },
            })
          })

          return promise
        },

        _setFunctionQueue: (functionQueue: FunctionQueue) => {
          set((state) => {
            state._functionQueue = functionQueue
          })
        },

        _setIsFunctionQueueExecuting: (isExecuting: boolean) => {
          set((state) => {
            state._isFunctionQueueExecuting = isExecuting
          })
        },

        _executeFunctionQueue: async (callback?: () => void) => {
          const { _isFunctionQueueExecuting, _setIsFunctionQueueExecuting } =
            get()

          if (!_isFunctionQueueExecuting) {
            _setIsFunctionQueueExecuting(true)
          } else {
            throw new Error('Function queue is already executing.')
          }

          const loopThroughQueuePriorityLevels = async (
            functionQueue: FunctionQueue
          ): Promise<void> => {
            const store = get()
            let functionsToCall: FunctionQueue = []

            let priorityArr = Object.values(QueuePriority)
            priorityArr = priorityArr
              .reverse()
              .splice(0, priorityArr.length / 2)

            for (let i in priorityArr) {
              functionsToCall = functionsToCall.concat(
                functionQueue.filter((f) => f.priority === priorityArr[i])
              )

              if (functionsToCall.length > 0) {
                store._setFunctionQueue(
                  store._functionQueue.filter(
                    (f) => !functionsToCall.includes(f)
                  )
                )
                break
              }
            }

            const callFuncs = async () => {
              await Promise.all(
                functionsToCall.map(async (call) => {
                  try {
                    const result = await call.fn(...call.args)
                    if (call.promise != null) {
                      call.promise.resolve(result)
                    }
                  } catch (e) {
                    console.error(
                      "Couldn't run queued map function",
                      call.fn,
                      call.args
                    )
                    console.error(e)
                    call.promise.reject(new Error('Function execution failed'))
                    return null
                  }
                })
              )
            }

            try {
              await callFuncs()
            } catch (e) {
              console.error('Error running the queued functions: ', e)
            }

            return
          }

          while (true) {
            const _functionQueue = get()._functionQueue

            if (_functionQueue.length === 0) {
              break
            }
            await loopThroughQueuePriorityLevels(_functionQueue)
          }

          callback && (await callback())
          _setIsFunctionQueueExecuting(false)

          return
        },

        _setMbMap: (mbMap: MbMap) => {
          set((state) => {
            state._mbMap = mbMap
          })
        },

        // Finds the first layer that starts with the given id. Mapbox renders
        // layers in order, last layer in array being on top.
        _findFirstMatchingLayer: (id: string) => {
          const { _mbMap } = get()

          if (_mbMap) {
            const layers = _mbMap.getStyle().layers

            if (layers) {
              let firstMatch = layers.find((l) => l.id.startsWith(id))
              return firstMatch ? firstMatch.id : null
            }
          }

          return null
        },

        // Finds the last layer that starts with the given id
        _findLastMatchingLayer: (id: string) => {
          const { _mbMap } = get()

          if (_mbMap) {
            const layers = _mbMap.getStyle().layers

            if (layers) {
              let lastMatch: string | null = null
              layers.forEach((layer) => {
                if (layer.id.startsWith(id)) {
                  lastMatch = layer.id
                }
              })

              return lastMatch
            }
          }

          return null
        },

        // The default mapbox addLayer function can only specify a
        // layer to be added before another layer.
        _addLayerAfter: (layer: AnyLayer, afterId: string) => {
          const { _mbMap } = get()

          const layers = _mbMap?.getStyle().layers

          if (layers) {
            const index = layers.findIndex((l) => l.id === afterId)

            if (index !== -1 && index < layers.length - 1) {
              // Get the ID of the layer after the 'after' layer
              const beforeId = layers[index + 1].id

              // Add the new layer before that layer, effectively adding it after the 'after' layer
              _mbMap?.addLayer(layer, beforeId)
            } else {
              // If the 'after' layer wasn't found or it's the last layer, just add the new layer
              _mbMap?.addLayer(layer)
            }
          }
        },

        _enableLayerEventHandlers: (layerOptions: LayerOptions) => {
          if (
            layerOptions.eventHandlers != null &&
            Object.keys(layerOptions.eventHandlers).length > 0
          ) {
            const { _mbMap } = get()

            Object.keys(layerOptions.eventHandlers).forEach(
              (eventKeyString) => {
                const eventKey = eventKeyString as keyof MapLayerEventType
                const handlerFn = layerOptions.eventHandlers[eventKey]
                if (handlerFn != null) {
                  _mbMap?.on(eventKey, layerOptions.id, handlerFn)
                }
              }
            )
          }
        },

        _disableLayerEventHandlers: (layerOptions: LayerOptions) => {
          if (
            layerOptions.eventHandlers != null &&
            Object.keys(layerOptions.eventHandlers).length > 0
          ) {
            const { _mbMap } = get()

            Object.keys(layerOptions.eventHandlers).forEach(
              (eventKeyString) => {
                const eventKey = eventKeyString as keyof MapLayerEventType
                const handlerFn = layerOptions.eventHandlers[eventKey]
                if (handlerFn != null) {
                  _mbMap?.off(eventKey, layerOptions.id, handlerFn)
                }
              }
            )
          }
        },

        _enableLayerGroupEventHandlers: (layerGroupId: string) => {
          const { _layerGroups, _enableLayerEventHandlers } = get()

          for (const layerId in _layerGroups[layerGroupId].layers) {
            const layerOptions = _layerGroups[layerGroupId].layers[layerId]
            _enableLayerEventHandlers(layerOptions)
          }
        },

        _disableLayerGroupEventHandlers: (layerGroupId: string) => {
          const { _layerGroups, _disableLayerEventHandlers } = get()

          for (const layerId in _layerGroups[layerGroupId].layers) {
            const layerOptions = _layerGroups[layerGroupId].layers[layerId]
            _disableLayerEventHandlers(layerOptions)
          }
        },

        _addPersistingLayerGroupAddOptions: (
          id: string,
          serializableLayerGroupAddOptions: SerializableLayerGroupAddOptions
        ) => {
          // TODO: Find a better fix for this, instead of casting to any
          // For some reason immer doesn't like the Mapbox Source object type
          set((state) => {
            state._persistingLayerGroupAddOptions[id] =
              serializableLayerGroupAddOptions as any
          })
        },

        _removePersistingLayerGroupAddOptions: (id: string) => {
          set((state) => {
            delete state._persistingLayerGroupAddOptions[id]
          })
        },

        _runHydrationActions: async () => {
          const {
            _setIsHydrated,
            _hydrationData,
            enableSerializableLayerGroup,
          } = get()

          const activeLayerGroupIds = Object.keys(
            getVisibleLayerGroups(_hydrationData.layerGroups)
          )

          Object.keys(_hydrationData.persistingLayerGroupAddOptions).forEach(
            (key) => {
              try {
                const opts = cloneDeep(
                  _hydrationData.persistingLayerGroupAddOptions[key]
                )
                opts.isHidden = true

                if (activeLayerGroupIds.find((id) => id === key)) {
                  opts.isHidden = false

                  // remove from activeLayerGroupIds so it doesn't get enabled twice
                  activeLayerGroupIds.splice(
                    activeLayerGroupIds.findIndex((id) => id === key),

                    1
                  )
                }

                enableSerializableLayerGroup(key, opts, {
                  priority: QueuePriority.HIGH,
                })
              } catch (e) {
                console.error(
                  'Error enabling custom layer group from storage: ',
                  key,
                  _hydrationData.persistingLayerGroupAddOptions[key],
                  e
                )
              }
            }
          )

          _setIsHydrated(true)

          set((state) => {
            state._hydrationData = {
              layerGroups: {},
              persistingLayerGroupAddOptions: {},
            }
          })
        },
      }

      return { ...vars, ...actions }
    }),
    {
      name: 'mapStorage', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
      partialize: (state: State) => {
        return {
          // TODO: fix hydration. Currently rehydrates layerGroups that do not have data
          _hydrationData: {
            layerGroups: {},
            // layerGroups: state._layerGroups,
            persistingLayerGroupAddOptions:
              state._persistingLayerGroupAddOptions,
          },
        }
      },
      onRehydrateStorage: (state) => {
        return (state, error) => {
          if (error) {
            console.log('an error happened during hydration', error)
          }
          state?._runHydrationActions()
        }
      },
    }
  )
)

// implement at some point
// const setFilter = () => {}
// const AddMapEventHandler = () => {}
// const isSourceReady = () => {}
// const removeMapEventHandler = () => {}
// const enablePersonalDataset = () => {}
// const disablePersonalDataset = () => {}

// used in ForestArvometsa.tsx. Not all of these are needed
// const genericPopupHandler = () => {}
// const querySourceFeatures = () => {}

// use REDUX for these?
// const enableGroup = () => {}
// const disableGroup = () => {}
// const eetGroupState = () => {}
// const toggleGroup = () => {}
// const enableOnlyOneGroup = () => {}
// const isGroupEnable = () => {}
