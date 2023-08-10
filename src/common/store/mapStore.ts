// The map store is a zustand store that manages the map state.
// A lot of the logic is split between this file and the Map component.

import { map, cloneDeep } from 'lodash-es'
import olms from 'ol-mapbox-style'
import turfBbox from '@turf/bbox'
import { immer } from 'zustand/middleware/immer'
import { produce } from 'immer'
import { FeatureCollection } from 'geojson'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import {
  MapLayerMouseEvent,
  Map as MbMap,
  LngLatBounds,
  MapboxGeoJSONFeature,
  AnyLayer,
} from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useUIStore } from '#/common/store'
import { Map as OlMap } from 'ol'

import {
  LayerGroupId,
  LayerConfAnyId,
  LayerOpt,
  ExtendedAnyLayer,
  OverlayMessage,
  MapLibraryMode,
  QueuePriority,
  PopupOpts,
  QueueFunction,
  FunctionQueue,
  LayerGroupAddOptions,
  CustomLayerGroupAddOptions,
  LayerGroupAddOptionsWithConf,
  QueueOptions,
  MapContext,
} from '#/common/types/map'
import { layerConfs } from '#/components/Map/Layers'

import {
  getLayerName,
  getLayerType,
  assertValidHighlightingConf,
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
  selectedFeatures: MapboxGeoJSONFeature[]
  // Options for popup windows, when clicking a feature on the map
  popupOpts: PopupOpts | null
  activeLayerGroupIds: string[]
  // Whether user has activated drawing mode
  isDrawEnabled: boolean
  mapContext: string
  // The below are internal variables.
  // isMapReady is after the internal map object is ready to be interacted with,
  // but before the map functions are ready to be used by external components.
  _isMapReady: boolean
  _draw: MapboxDraw | null
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
  _layerGroups: Record<string, any>
  _layerOptions: Record<string, LayerOpt>
  // For persisting user customised or uploaded layer configurations.
  _persistingLayerGroupAddOptions: Record<string, CustomLayerGroupAddOptions>
  _isHydrated: boolean
  _hydrationData: {
    activeLayerGroupIds: string[]
    persistingLayerGroupAddOptions: Record<string, CustomLayerGroupAddOptions>
  }
}

export type Actions = {
  // Bounds of the source of a layer, e.g. the features in a geojson object
  getSourceBounds: (sourceId: string) => LngLatBounds | null
  getSourceJson: (id: string) => FeatureCollection | null
  addLayerGroup: (
    layerGroupId: LayerGroupId,
    options?: LayerGroupAddOptions,
    queueOptions?: QueueOptions
  ) => Promise<void>
  enableLayerGroup: (
    layerGroupId: LayerGroupId,
    options?: LayerGroupAddOptions
  ) => Promise<void>
  disableLayerGroup: (layerGroupId: LayerGroupId) => Promise<void>
  toggleLayerGroup: (
    layerGroupId: LayerGroupId,
    options?: LayerGroupAddOptions
  ) => Promise<void>
  // AnyLayerGroup allows adding layerGroups with custom ids,
  // e.g., uploaded custom layers with generated ids.
  addCustomLayerGroup: (
    layerGroupIdString: string,
    options?: CustomLayerGroupAddOptions
  ) => Promise<void>
  toggleCustomLayerGroup: (
    layerGroupIdString: string,
    options?: CustomLayerGroupAddOptions
  ) => Promise<void>
  enableCustomLayerGroup: (
    layerGroupIdString: string,
    options?: CustomLayerGroupAddOptions
  ) => Promise<void>
  disableCustomLayerGroup: (layerGroupIdString: string) => Promise<void>
  setLayoutProperty: (
    layer: string,
    name: string,
    value: any,
    queueOptions?: QueueOptions
  ) => Promise<void>
  setPaintProperty: (
    layer: string,
    name: string,
    value: any,
    queueOptions?: QueueOptions
  ) => Promise<void>
  // Only show specific features in a layer
  setFilter: (
    layer: string,
    filter: any[],
    queueOptions?: QueueOptions
  ) => Promise<void>
  setOverlayMessage: (
    condition: boolean,
    message: OverlayMessage,
    queueOptions?: QueueOptions
  ) => Promise<void>
  fitBounds: (
    bbox: number[] | LngLatBounds,
    options: { duration?: number; lonExtra?: number; latExtra?: number }
  ) => Promise<any>
  setSelectedFeatures: (features: MapboxGeoJSONFeature[]) => void
  setMapLibraryMode: (mode: MapLibraryMode) => void
  getGeocoder: () => void
  mapRelocate: () => void
  mapResetNorth: () => void
  mapToggleTerrain: () => void
  mapZoomIn: () => void
  mapZoomOut: () => void
  setIsDrawPolygon: (isDrawPolygon: boolean) => Promise<void>
  setMapContext: (mapContext: MapContext) => void
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
    customLayerGroupAddOptions: CustomLayerGroupAddOptions
  ) => void
  _removePersistingLayerGroupAddOptions: (layerGroupId: string) => void
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
        selectedFeatures: [],
        popupOpts: null,
        isDrawEnabled: false,
        activeLayerGroupIds: [],
        mapContext: 'main',
        _isMapReady: false,
        _draw: null,
        _functionQueue: [],
        _isFunctionQueueExecuting: false,
        _mbMap: null,
        _olMap: null,
        _layerGroups: {},
        _layerOptions: {},
        _isHydrated: false,
        _persistingLayerGroupAddOptions: {},
        _hydrationData: {
          activeLayerGroupIds: [],
          persistingLayerGroupAddOptions: {},
        },
      }

      // A boilerplate for functions that are queued until the map object is ready
      const queueableFnInit = <
        A1 extends any[],
        A2 extends [queueOptions?: QueueOptions]
      >(
        fn: (...args: A1) => Promise<void>,
        queueOptions?: QueueOptions
      ) => {
        const queueableFn = (
          fnWithArgs: { fn: (...args: A1) => Promise<void>; args: A1 },
          qOpts: QueueOptions
        ) => {
          const { isLoaded, _addToFunctionQueue } = get()

          if (!isLoaded && !qOpts.skipQueue) {
            return _addToFunctionQueue({
              fn: fnWithArgs.fn,
              args: fnWithArgs.args,
              priority: qOpts.priority,
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
            queueableFn({ fn: fn, args: fnArgs }, qOpts)
          },
        }) as unknown as (...args: [...A1, ...A2]) => Promise<void>
      }

      const actions: Actions = {
        getSourceBounds: (sourceId: string): LngLatBounds | null => {
          // Query source features for the specified source
          try {
            const { _mbMap, getSourceJson } = get()

            if (!_mbMap) {
              return null
            }

            let featureColl: FeatureCollection | null = null

            const sourceFeatures = getSourceJson(sourceId)
            if (sourceFeatures) {
              featureColl = sourceFeatures
            } else {
              const features = _mbMap.querySourceFeatures(sourceId)

              if (features.length > 0 && features[0].geometry) {
                featureColl = { type: 'FeatureCollection', features: features }
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

        getSourceJson: (id: string) => {
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

        setMapLibraryMode: (mode: MapLibraryMode) => {
          set((state) => {
            state.mapLibraryMode = mode
          })
        },

        setSelectedFeatures: (features: MapboxGeoJSONFeature[]) => {
          set(
            produce((draft: State) => {
              draft.selectedFeatures = features
            })
          )
        },

        // TODO: The logic of this function is getting too complex. Now we have
        // LayerConfs fetched from the common storage and LayerConfs supplied by the calling
        // component. Solution:
        // make "options" mandatory, and always supply a layerConf from the calling function.
        addLayerGroup: queueableFnInit(
          async (
            layerGroupId: LayerGroupId,
            options?: CustomLayerGroupAddOptions
          ) => {
            const {
              _addMbStyleToMb,
              _addMbStyle,
              _persistingLayerGroupAddOptions,
              _addPersistingLayerGroupAddOptions,
            } = get()

            // Initialize layer if it doesn't exist
            let opts = options || {}

            if (opts.persist) {
              _addPersistingLayerGroupAddOptions(layerGroupId, opts)
            }

            if (!opts.layerConf) {
              opts = _persistingLayerGroupAddOptions[layerGroupId]
            }

            if (!opts.layerConf) {
              opts.layerConf = layerConfs.find((el: LayerConfAnyId) => {
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
            } else {
              console.error('No layer config found for id: ' + layerGroupId)
            }
          },
          { priority: QueuePriority.HIGH }
        ),

        enableLayerGroup: async (
          layerGroupId: LayerGroupId,
          options?: LayerGroupAddOptions
        ) => {
          const { _layerGroups, _setGroupVisibility, addLayerGroup } = get()
          if (_layerGroups[layerGroupId]) {
            _setGroupVisibility(layerGroupId, true)

            set((state) => {
              state.activeLayerGroupIds.push(layerGroupId)
            })
          } else {
            addLayerGroup(layerGroupId, options)
          }
        },

        disableLayerGroup: async (layerGroupId: LayerGroupId) => {
          const { _setGroupVisibility, activeLayerGroupIds } = get()

          const activeLayerGroupIdsCopy = [...activeLayerGroupIds]
          activeLayerGroupIdsCopy.splice(
            activeLayerGroupIdsCopy.indexOf(layerGroupId),
            1
          )

          set((state) => {
            state.activeLayerGroupIds = state.activeLayerGroupIds.filter(
              (id: string) => id !== layerGroupId
            )
          })

          _setGroupVisibility(layerGroupId, false)
        },

        toggleLayerGroup: async (
          layerGroupId: LayerGroupId,
          options?: LayerGroupAddOptions
        ) => {
          const { activeLayerGroupIds, disableLayerGroup, enableLayerGroup } =
            get()

          if (activeLayerGroupIds.includes(layerGroupId)) {
            disableLayerGroup(layerGroupId)
          } else {
            enableLayerGroup(layerGroupId, options)
          }
        },

        // these are used used for layers with dynamic ids
        addCustomLayerGroup: async (
          layerGroupIdString: string,
          options?: CustomLayerGroupAddOptions
        ) => {
          const { addLayerGroup } = get()

          try {
            addLayerGroup(
              layerGroupIdString as LayerGroupId,
              options as LayerGroupAddOptions
            )
          } catch (e) {
            'Unable to add layer with id: ' + layerGroupIdString
            console.error(e)
          }
        },

        toggleCustomLayerGroup: async (
          layerGroupIdString: string,
          options?: CustomLayerGroupAddOptions
        ) => {
          const { toggleLayerGroup } = get()

          try {
            toggleLayerGroup(
              layerGroupIdString as LayerGroupId,
              options as LayerGroupAddOptions
            )
          } catch (e) {
            'Unable to toggle layer with id: ' + layerGroupIdString
            console.error(e)
          }
        },

        enableCustomLayerGroup: async (
          layerGroupIdString: string,
          options?: CustomLayerGroupAddOptions
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

        disableCustomLayerGroup: async (layerGroupIdString: string) => {
          const { disableLayerGroup } = get()

          disableLayerGroup(layerGroupIdString as LayerGroupId)
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
              duration = 1000,
              lonExtra = 0,
              latExtra = 0,
            }: { duration?: number; lonExtra?: number; latExtra?: number } = {}
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

        setIsDrawPolygon: queueableFnInit(async (isDrawPolygon: boolean) => {
          const { _mbMap } = get()

          // TODO: Fix drawing. Figure out which layer to use, and dynamically add it to the map
          const sourceName = 'carbon-shapes'

          const draw = new MapboxDraw({
            displayControlsDefault: false,
            // Select which mapbox-gl-draw control buttons to add to the map.
            controls: {
              polygon: true,
              trash: true,
            },
            // Set mapbox-gl-draw to draw by default.
            // The user does not have to click the polygon control button first.
            // defaultMode: 'draw_polygon',
          })
          const source = cloneDeep(_mbMap?.getStyle().sources[sourceName])

          _mbMap?.removeLayer('carbon-shapes-outline')
          _mbMap?.removeLayer('carbon-shapes-fill')
          _mbMap?.removeLayer('carbon-shapes-sym')
          _mbMap?.removeSource(sourceName)

          // console.log(source.data.features)
          _mbMap?.addControl(draw, 'bottom-right')

          //@ts-ignore
          draw.add(source.data)

          set((state) => {
            state._draw = draw
            state.isDrawEnabled = true
          })

          return
        }),

        setMapContext: (mapContext: MapContext) => {
          set((state) => {
            state.mapContext = mapContext
          })
        },

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
          const { _layerGroups, _layerOptions, _mbMap } = get()
          const layerGroup = _layerGroups[layerGroupId]

          for (const layer in layerGroup) {
            if (_layerOptions[layer].useMb) {
              _mbMap?.setLayoutProperty(
                layer,
                'visibility',
                isVisible ? 'visible' : 'none'
              )
            } else {
              layerGroup[layer].setVisible(isVisible)
            }
          }
        },

        _setPopupOpts: (popupOpts: PopupOpts) => {
          set(
            produce((state) => {
              state.popupOpts = popupOpts
            })
          )
        },

        _addMbStyle: async (
          id: LayerGroupId,
          options: LayerGroupAddOptionsWithConf
        ) => {
          const style = await options.layerConf.style()
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
                    const layerOpt: LayerOpt = {
                      id: layerKeys[0],
                      source: sourceKey,
                      name: getLayerName(layerKeys[0]),
                      layerType: getLayerType(layerKeys[0]),
                      selectable: conf.selectable || false,
                      multiSelectable: conf.multiSelectable || false,
                      popup: options.layerConf.popup || false,
                      useMb: false,
                    }

                    assertValidHighlightingConf(layerOpt, layers)

                    layer.set('group', id)
                    layerGroup[layerKeys[0]] = layer

                    set((state) => {
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
          } = get()
          const setIsMapPopupOpen = useUIStore.getState().setIsMapPopupOpen

          const style = await options.layerConf.style()

          let layerInsertId: string | null = null

          try {
            for (const sourceKey in style.sources) {
              _mbMap?.addSource(sourceKey, style.sources[sourceKey])
            }

            const layerGroup: any = {}

            for (const layer of style.layers) {
              const layerOpt: LayerOpt = {
                id: layer.id,
                source: layer.source,
                name: getLayerName(layer.id),
                layerType: getLayerType(layer.id),
                selectable: layer.selectable || false,
                multiSelectable: layer.multiSelectable || false,
                popup: options.layerConf.popup || false,
                useMb: true,
              }

              if (layerOpt.layerType === 'fill') {
                if (layer.selectable) {
                  if (
                    !style.layers.find(
                      (l: any) => l.id === layerOpt.name + '-highlighted'
                    )
                  ) {
                    console.error(
                      "Layer '" +
                        layerOpt.name +
                        "' is selectable but missing the corresponding highlighted layer."
                    )
                  }
                }
                if (options.layerConf.popup) {
                  const Popup: any = options.layerConf.popup

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

              assertValidHighlightingConf(layerOpt, style.layers)

              set((state) => {
                state._layerOptions[layerOpt.id] = layerOpt
                layerGroup[layer.id] = layer
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

            if (!options.isHidden) {
              set((state) => {
                state.activeLayerGroupIds.push(id)
                state._layerGroups[id] = layerGroup
              })
            }
          } catch (e: any) {
            if (!e.message.includes('There is already a source')) {
              console.error(e)
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
                functionsToCall.map((call) => {
                  try {
                    // casting to any because TS can't infer the actual parameters of the function
                    return call.fn(...call.args)
                  } catch (e) {
                    console.error(
                      "Couldn't run queued map function",
                      call.fn,
                      call.args
                    )
                    console.error(e)
                    call.promise.reject()
                    return null
                  }
                })
              )

              functionsToCall.forEach((call) => {
                if (call.promise != null) {
                  call.promise.resolve()
                }
              })
            }

            await callFuncs()

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

        _addPersistingLayerGroupAddOptions: (
          id: string,
          customLayerGroupAddOptions: CustomLayerGroupAddOptions
        ) => {
          set((state) => {
            state._persistingLayerGroupAddOptions[id] =
              customLayerGroupAddOptions
          })
        },

        _removePersistingLayerGroupAddOptions: (id: string) => {
          set((state) => {
            delete state._persistingLayerGroupAddOptions[id]
          })
        },

        _runHydrationActions: async () => {
          const { _setIsHydrated, _hydrationData, enableCustomLayerGroup } = get()

          _hydrationData.activeLayerGroupIds.map((id) =>
            enableCustomLayerGroup(id)
          )

          _setIsHydrated(true)
        },
      }

      return { ...vars, ...actions }
    }),
    {
      name: 'mapStorage', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
      partialize: (state: State) => ({
        _hydrationData: { activeLayerGroupIds: state.activeLayerGroupIds },
        _persistingLayerGroupAddOptions: state._persistingLayerGroupAddOptions,
      }),
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
