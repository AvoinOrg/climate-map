import { map, cloneDeep } from 'lodash-es'
import olms from 'ol-mapbox-style'
import turfBbox from '@turf/bbox'
import { immer } from 'zustand/middleware/immer'
import { produce } from 'immer'
import { FeatureCollection } from 'geojson'
import { create } from 'zustand'

import { MapLayerMouseEvent, Map as MbMap, LngLatBounds, MapboxGeoJSONFeature, AnyLayer } from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useUIStore } from '#/common/store'
import { Map as OlMap } from 'ol'

import {
  LayerId,
  LayerConfAnyId,
  LayerOpt,
  ExtendedAnyLayer,
  OverlayMessage,
  MapLibraryMode,
  QueuePriority,
  LayerConf,
  PopupOpts,
  QueueFunction,
  FunctionQueue,
  LayerAddOptions,
  AnyLayerAddOptions,
} from '#/common/types/map'
import { layerConfs } from '#/components/Map/Layers'

import { getLayerName, getLayerType, assertValidHighlightingConf } from '#/common/utils/map'

const DEFAULT_MAP_LIBRARY_MODE: MapLibraryMode = 'mapbox'

type Vars = {
  mapLibraryMode: MapLibraryMode
  isLoaded: boolean
  overlayMessage: OverlayMessage | null
  selectedFeatures: MapboxGeoJSONFeature[]
  popupOpts: PopupOpts | null
  activeLayerGroupIds: string[]
  isDrawEnabled: boolean
  _draw: MapboxDraw | null
  _functionQueue: FunctionQueue
  _mbMap: MbMap | null
  _olMap: OlMap | null
  _layerGroups: Record<string, any>
  _layerOptions: Record<string, LayerOpt>
}

type Actions = {
  getSourceBounds: (sourceId: string) => LngLatBounds | null
  getSourceJson: (id: string) => FeatureCollection | null
  addLayerGroup: (layerId: LayerId, options?: LayerAddOptions) => Promise<void>
  enableLayerGroup: (layerId: LayerId, options?: LayerAddOptions) => Promise<void>
  disableLayerGroup: (layerId: LayerId) => Promise<void>
  toggleLayerGroup: (layerId: LayerId, options?: LayerAddOptions) => Promise<void>
  addAnyLayerGroup: (layerIdString: string, options?: AnyLayerAddOptions) => Promise<void>
  toggleAnyLayerGroup: (layerIdString: string, options?: AnyLayerAddOptions) => Promise<void>
  enableAnyLayerGroup: (layerIdString: string, options?: AnyLayerAddOptions) => Promise<void>
  disableAnyLayerGroup: (layerIdString: string) => Promise<void>
  setLayoutProperty: (layer: string, name: string, value: any) => Promise<void>
  setPaintProperty: (layer: string, name: string, value: any) => Promise<void>
  setFilter: (layer: string, filter: any[]) => Promise<void>
  setOverlayMessage: (condition: boolean, message: OverlayMessage) => Promise<void>
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
  setIsDrawPolygon: (isDrawPolygon: boolean) => void
  _setIsLoaded: { (isLoaded: boolean): void }
  _setGroupVisibility: (layerId: LayerId, isVisible: boolean) => void
  _addMbStyle: (id: LayerId, layerConf: LayerConfAnyId, isVisible?: boolean) => Promise<void>
  _addMbPopup: (layer: string | string[], fn: (e: MapLayerMouseEvent) => void) => void
  _addMbStyleToMb: (id: LayerId, layerConf: LayerConfAnyId, isVisible?: boolean) => Promise<void>
  _addToFunctionQueue: (queueFunction: QueueFunction) => Promise<any>
  _setFunctionQueue: (functionQueue: FunctionQueue) => void
  _setPopupOpts: (popupOpts: PopupOpts) => void
  _setMbMap: (mbMap: MbMap) => void
}

type State = Vars & Actions

export const useMapStore = create<State>()(
  // Include your additional states and setters...

  // Add your additional actions...

  immer((set, get) => {
    const vars: Vars = {
      mapLibraryMode: DEFAULT_MAP_LIBRARY_MODE, // Assume an initial value
      isLoaded: false,
      overlayMessage: null,
      selectedFeatures: [],
      popupOpts: null,
      isDrawEnabled: false,
      activeLayerGroupIds: [],
      _draw: null,
      _functionQueue: [],
      _mbMap: null,
      _olMap: null,
      _layerGroups: {},
      _layerOptions: {},
    }

    const actions: Actions = {
      getSourceBounds: (sourceId: string): LngLatBounds | null => {
        // Query source features for the specified source

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
            if (source.tileBounds && source.tileBounds.bounds) {
              //@ts-ignore
              return source.tileBounds.bounds
            }
          }
        }

        if (!featureColl) {
          return null
        }

        const bbox = turfBbox(featureColl)

        // Convert Turf.js bbox to Mapbox LngLatBounds
        const bounds = new mapboxgl.LngLatBounds(
          [bbox[0], bbox[1]], // [west, south] or [minX, minY]
          [bbox[2], bbox[3]] // [east, north] or [maxX, maxY]
        )

        return bounds
      },

      getSourceJson: (id: string) => {
        try {
          const { _mbMap } = get()
          //@ts-ignore
          const geojson: FeatureCollection = _mbMap?.getSource(id)._options.data
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

      addLayerGroup: async (layerId: LayerId, options?: LayerAddOptions) => {
        const { isLoaded, _addToFunctionQueue, _addMbStyleToMb, _addMbStyle } = get()

        if (!isLoaded) {
          return _addToFunctionQueue({
            funcName: 'addLayerGroup',
            args: [layerId, options],
            priority: QueuePriority.HIGH,
          })
        }

        // Initialize layer if it doesn't exist
        let conf = options?.layerConf

        if (!conf) {
          conf = layerConfs.find((el: LayerConfAnyId) => {
            return el.id === layerId
          })
        }

        if (conf) {
          if (conf.useMb == null || conf.useMb) {
            await _addMbStyleToMb(layerId, conf)
          } else {
            await _addMbStyle(layerId, conf)
          }
        } else {
          console.error('No layer config found for id: ' + layerId)
        }
      },

      enableLayerGroup: async (layerId: LayerId, options?: LayerAddOptions) => {
        const { _layerGroups, _setGroupVisibility, addLayerGroup } = get()
        if (_layerGroups[layerId]) {
          _setGroupVisibility(layerId, true)

          set((state) => {
            state.activeLayerGroupIds.push(layerId)
          })
        } else {
          addLayerGroup(layerId, options)
        }
      },

      disableLayerGroup: async (layerId: LayerId) => {
        const { _setGroupVisibility, activeLayerGroupIds } = get()

        const activeLayerGroupIdsCopy = [...activeLayerGroupIds]
        activeLayerGroupIdsCopy.splice(activeLayerGroupIdsCopy.indexOf(layerId), 1)

        set((state) => {
          state.activeLayerGroupIds = state.activeLayerGroupIds.filter((id: string) => id !== layerId)
        })

        _setGroupVisibility(layerId, false)
      },

      toggleLayerGroup: async (layerId: LayerId, options?: LayerAddOptions) => {
        const { activeLayerGroupIds, disableLayerGroup, enableLayerGroup } = get()

        if (activeLayerGroupIds.includes(layerId)) {
          disableLayerGroup(layerId)
        } else {
          enableLayerGroup(layerId, options)
        }
      },

      // these are used used for layers with dynamic ids
      addAnyLayerGroup: async (layerIdString: string, options?: AnyLayerAddOptions) => {
        const { addLayerGroup } = get()

        try {
          addLayerGroup(layerIdString as LayerId, options as LayerAddOptions)
        } catch (e) {
          'Unable to add layer with id: ' + layerIdString
          console.error(e)
        }
      },

      toggleAnyLayerGroup: async (layerIdString: string, options?: AnyLayerAddOptions) => {
        const { toggleLayerGroup } = get()

        try {
          toggleLayerGroup(layerIdString as LayerId, options as LayerAddOptions)
        } catch (e) {
          'Unable to toggle layer with id: ' + layerIdString
          console.error(e)
        }
      },

      enableAnyLayerGroup: async (layerIdString: string, options?: AnyLayerAddOptions) => {
        const { enableLayerGroup } = get()

        try {
          enableLayerGroup(layerIdString as LayerId, options as LayerAddOptions)
        } catch (e) {
          'Unable to enable layer with id: ' + layerIdString
          console.error(e)
        }
      },

      disableAnyLayerGroup: async (layerIdString: string) => {
        const { disableLayerGroup } = get()

        disableLayerGroup(layerIdString as LayerId)
      },

      setLayoutProperty: async (layer: string, name: string, value: any): Promise<any> => {
        const { isLoaded, _addToFunctionQueue, _mbMap } = get()

        if (!isLoaded) {
          return _addToFunctionQueue({ funcName: 'setLayoutProperty', args: [layer, name, value] })
        }
        _mbMap?.setLayoutProperty(layer, name, value)
      },

      setPaintProperty: async (layer: string, name: string, value: any): Promise<any> => {
        const { isLoaded, _mbMap, _addToFunctionQueue } = get()
        if (!isLoaded) {
          return _addToFunctionQueue({ funcName: 'setPaintProperty', args: [layer, name, value] })
        }
        _mbMap?.setPaintProperty(layer, name, value)
      },

      setFilter: async (layer: string, filter: any[]): Promise<any> => {
        const { isLoaded, _mbMap, _addToFunctionQueue } = get()
        if (!isLoaded) {
          return _addToFunctionQueue({ funcName: 'setFilter', args: [layer, filter] })
        }
        _mbMap?.setFilter(layer, filter)
      },

      setOverlayMessage: async (condition: boolean, message: OverlayMessage) => {
        set((state) => {
          state.overlayMessage = condition ? message : null
        })
      },

      fitBounds: (
        bbox: number[] | LngLatBounds,
        {
          duration = 1000,
          lonExtra = 0,
          latExtra = 0,
        }: { duration?: number; lonExtra?: number; latExtra?: number } = {}
      ): Promise<any> => {
        const { isLoaded, _addToFunctionQueue, _mbMap } = get()

        if (!isLoaded) {
          return _addToFunctionQueue({ funcName: 'fitBounds', args: [bbox, { duration, lonExtra, latExtra }] })
        }

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
      },
      getGeocoder: () => {
        // set((state) => {
        // })
      },
      mapRelocate: () => {
        // set((state) => {
        // })
      },
      mapResetNorth: () => {
        // set((state) => {
        // })
      },
      mapToggleTerrain: () => {
        // set((state) => {
        // })
      },
      mapZoomIn: () => {
        // set((state) => {
        // })
      },
      mapZoomOut: () => {
        // set((state) => {
        // })
      },

      setIsDrawPolygon: (isDrawPolygon: boolean) => {
        const { isLoaded, _addToFunctionQueue, _mbMap } = get()

        // TODO: Fix drawing. Figure out which layer to use, and dynamically add it to the map
        const sourceName = 'carbon-shapes'

        if (!isLoaded) {
          _addToFunctionQueue({ funcName: 'setIsDrawPolygon', args: [isDrawPolygon] })
          return
        }

        // setMapLibraryMode('mapbox')

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
      },

      _setIsLoaded: (isLoaded: boolean) => {
        set((state) => {
          state.isLoaded = isLoaded
        })
      },

      _setGroupVisibility: (layerId: LayerId, isVisible: boolean) => {
        const { _layerGroups, _layerOptions, _mbMap } = get()
        const layerGroup = _layerGroups[layerId]

        for (const layer in layerGroup) {
          if (_layerOptions[layer].useMb) {
            _mbMap?.setLayoutProperty(layer, 'visibility', isVisible ? 'visible' : 'none')
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

      _addMbStyle: async (id: LayerId, layerConf: LayerConfAnyId, isVisible: boolean = true) => {
        const style = await layerConf.style()
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

              if (sourceKeys.includes(sourceKey) && layerKeys != null && layerKeys.length > 0) {
                const conf: ExtendedAnyLayer | undefined = layers.find((l: any) => l.id === layerKeys[0])

                if (conf) {
                  const layerOpt: LayerOpt = {
                    id: layerKeys[0],
                    source: sourceKey,
                    name: getLayerName(layerKeys[0]),
                    layerType: getLayerType(layerKeys[0]),
                    selectable: conf.selectable || false,
                    multiSelectable: conf.multiSelectable || false,
                    popup: layerConf.popup || false,
                    useMb: false,
                  }

                  assertValidHighlightingConf(layerOpt, layers)

                  layer.set('group', id)
                  layerGroup[layerKeys[0]] = layer

                  set((state) => {
                    state._layerOptions[layerKeys[0]] = layerOpt
                  })
                } else {
                  console.error('Could not find layer configuration for layer: ' + layerKeys[0])
                }
              }
            })

          set((state) => {
            state._layerGroups[id] = layerGroup
          })

          if (isVisible) {
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

      _addMbPopup: (layer: string | string[], fn: (e: MapLayerMouseEvent) => void) => {
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

      _addMbStyleToMb: async (id: LayerId, layerConf: LayerConfAnyId, isVisible: boolean = true) => {
        const { _addMbPopup, _mbMap } = get()
        const setIsMapPopupOpen = useUIStore.getState().setIsMapPopupOpen

        const style = await layerConf.style()

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
              popup: layerConf.popup || false,
              useMb: true,
            }

            if (layerOpt.layerType === 'fill') {
              if (layer.selectable) {
                if (!style.layers.find((l: any) => l.id === layerOpt.name + '-highlighted')) {
                  console.error(
                    "Layer '" + layerOpt.name + "' is selectable but missing the corresponding highlighted layer."
                  )
                }
              }
              if (layerConf.popup) {
                const Popup: any = layerConf.popup

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

            _mbMap?.addLayer(layer)

            if (isVisible) {
              _mbMap?.setLayoutProperty(layer.id, 'visibility', 'visible')
            } else {
              _mbMap?.setLayoutProperty(layer.id, 'visibility', 'none')
            }
          }

          if (isVisible) {
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
            funcName: queueFunction.funcName,
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

      _setMbMap: (mbMap: MbMap) => {
        set((state) => {
          state._mbMap = mbMap
        })
      },
    }

    return { ...vars, ...actions }
  })
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
