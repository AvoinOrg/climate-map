import { pickBy, uniq, map, cloneDeep } from 'lodash-es'

import React, { createContext, useState, useRef, useEffect, useCallback, useContext } from 'react'
import Box from '@mui/material/Box'
import { Map, View, MapBrowserEvent } from 'ol'
import * as proj from 'ol/proj'
import { unByKey } from 'ol/Observable'
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import Overlay from 'ol/Overlay'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Attribution, ScaleLine, defaults as defaultControls } from 'ol/control'
import olms, { getLayer } from 'ol-mapbox-style'
import turfBbox from '@turf/bbox'
import { immer } from 'zustand/middleware/immer'

import { MapLayerMouseEvent, Style as MbStyle, LngLatBounds, MapboxGeoJSONFeature } from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useUIStore } from '#/components/State'

import {
  LayerId,
  LayerConfAnyId,
  LayerOpt,
  LayerOpts,
  layerTypes,
  LayerType,
  ExtendedAnyLayer,
  OverlayMessage,
  MapLibraryMode,
  QueuePriority,
  ExtendedMbStyle,
  LayerConf,
  PopupOpts,
} from '#/common/types/map'
import { layerConfs } from './Layers'
import { MapPopup } from './MapPopup'
import { getColorExpressionArrForValues, getCoordinateFromGeometry, positionToLngLatLike } from '#/common/utils/map'
import { OverlayMessages } from './OverlayMessages'
import { ConstructionOutlined } from '@mui/icons-material'
import { FeatureCollection, Geometry } from 'geojson'
import { feature } from '@turf/helpers'
import { create } from 'zustand'

import { ProfileState, ModalState, NotificationMessage } from '#/common/types/state'

const DEFAULT_MAP_LIBRARY_MODE: MapLibraryMode = 'mapbox'
const DEFAULT_CENTER = [15, 62] as [number, number]
const DEFAULT_ZOOM = 5

type State = {
  isLoaded: boolean
  setMapLibraryMode: (mode: MapLibraryMode) => void
  mapToggleTerrain: () => void | null
  mapResetNorth: () => void | null
  getGeocoder: () => any | null
  mapRelocate: () => void | null
  mapZoomIn: () => void | null
  mapZoomOut: () => void | null
  toggleLayerGroup: (layerId: LayerId, layerConf?: LayerConf) => Promise<void> | null
  addLayerGroup: (layerId: LayerId, layerConf?: LayerConf) => Promise<void> | null
  enableLayerGroup: (layerId: LayerId, layerConf?: LayerConf) => Promise<void> | null
  disableLayerGroup: (layerId: LayerId) => Promise<void> | null
  addAnyLayerGroup: (layerId: string, layerConf?: LayerConfAnyId) => Promise<void> | null
  toggleAnyLayerGroup: (layerId: string, layerConf?: LayerConfAnyId) => Promise<void> | null
  enableAnyLayerGroup: (layerId: string, layerConf?: LayerConfAnyId) => Promise<void> | null
  disableAnyLayerGroup: (layerId: string) => Promise<void> | null
  getSourceBounds: (sourceId: string) => LngLatBounds | null
  activeLayerGroupIds: string[]
  layerGroups: {} | null
  registerGroup?: (layerGroup: any) => void | null
  getSourceJson: (id: string) => any
  selectedFeatures: MapboxGeoJSONFeature[]
  setLayoutProperty: (layerId: string, property: string, value: any) => Promise<void> | null
  setPaintProperty: (layerId: string, property: string, value: any) => Promise<void> | null
  setFilter: (layerId: string, filter: any) => Promise<void> | null
  setOverlayMessage: (condition: boolean, nmessage: OverlayMessage) => Promise<void> | null
  fitBounds: (
    bbox: number[] | LngLatBounds,
    options: { duration?: number; lonExtra?: number; latExtra?: number }
  ) => Promise<void> | null
  isDrawEnabled: boolean
  setIsDrawEnabled: (enabled: boolean) => void
  // isDrawPolygon: () => void
  setIsDrawPolygon: (enabled: boolean) => void
  // addMbStyle?: (style: any) => void
  popupOpts: PopupOpts | null
}

type Actions = {}
// export const useMapStore = create<MapState>((set, get) => ({
export const useMapStore = create<State & Actions>()(
  // Include your additional states and setters...

  // Add your additional actions...

  immer((set, get) => {
    return {
      mapLibraryMode: 'mapbox', // Assume an initial value
      isLoaded: false,
      _functionQueue: [],
      _mbMapRef: null,
      _mapRef: null,
      _layerGroups,
      _activeLayerGroupIds,
      _setGroupVisibility,

      getSourceBounds: (sourceId: string): LngLatBounds | null => {
        // Query source features for the specified source

        const { _mbMapRef, getSourceJson } = get()

        if (!_mbMapRef.current) {
          return null
        }

        let featureColl: FeatureCollection | null = null

        const sourceFeatures = getSourceJson(sourceId)
        if (sourceFeatures) {
          featureColl = sourceFeatures
        } else {
          const features = _mbMapRef.current.querySourceFeatures(sourceId)

          if (features.length > 0 && features[0].geometry) {
            featureColl = { type: 'FeatureCollection', features: features }
          } else {
            const source = _mbMapRef.current.getSource(sourceId)
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
          const { _mbMapRef } = get()
          //@ts-ignore
          const geojson: FeatureCollection = _mbMapRef.current?.getSource(id)._options.data
          return geojson
        } catch (e) {
          console.error(e)
        }
        return null
      },

      // ensures that latest state is used in the callback
      _addToFunctionQueue: (funcName: string, args: any[], priority = QueuePriority.LOW): Promise<any> => {
        // construct a promise that will be manually resolved when the function is called
        let promiseResolve: any, promiseReject: any
        const promise = new Promise((resolve, reject) => {
          promiseResolve = resolve
          promiseReject = reject
        })

        set((state) => {
          state._functionQueue.push({
            func: funcName,
            args: args,
            priority: priority,
            promise: {
              resolve: promiseResolve,
              reject: promiseReject,
            },
          })
        })

        return promise
      },

      addLayerGroup: async (layerId: LayerId, layerConf?: LayerConf) => {
        const { isLoaded, _addToFunctionQueue, _addMbStyleToMb, _addMbStyle } = get()

        if (!isLoaded) {
          return _addToFunctionQueue('addLayerGroup', [layerId, layerConf], QueuePriority.HIGH)
        }

        // Initialize layer if it doesn't exist
        let conf = layerConf

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

      enableLayerGroup: async (layerId: LayerId, layerConf?: LayerConf) => {
        const { _layerGroups, _setGroupVisibility, addLayerGroup } = get()
        if (_layerGroups[layerId]) {
          _setGroupVisibility(layerId, true)

          set((state) => {
            state.activeLayerGroupIds.push(layerId)
          })
        } else {
          addLayerGroup(layerId, layerConf)
        }
      },

      disableLayerGroup: async (layerId: LayerId) => {
        const { _mbMapRef, _activeLayerGroupIds } = get()

        const _activeLayerGroupIdsCopy = [..._activeLayerGroupIds]
        _activeLayerGroupIdsCopy.splice(_activeLayerGroupIdsCopy.indexOf(layerId), 1)

        set((state) => {
          state._activeLayerGroupIds = state._activeLayerGroupIds.filter((id: string) => id !== layerId)
        })

        _setGroupVisibility(layerId, false)
      },

      toggleLayerGroup: async (layerId: LayerId, layerConf?: LayerConf) => {
        const { _activeLayerGroupIds, disableLayerGroup, enableLayerGroup } = get()

        if (_activeLayerGroupIds.includes(layerId)) {
          disableLayerGroup(layerId)
        } else {
          enableLayerGroup(layerId, layerConf)
        }
      },

      // these are used used for layers with dynamic ids
      addAnyLayerGroup: async (layerIdString: string, layerConf?: LayerConfAnyId) => {
        const { addLayerGroup } = get()
        // @ts-ignore
        addLayerGroup(layerIdString as LayerId, layerConf)
      },

      toggleAnyLayerGroup: async (layerIdString: string, layerConf?: LayerConfAnyId) => {
        const { toggleLayerGroup } = get()
        // @ts-ignore
        toggleLayerGroup(layerIdString as LayerId, layerConf)
      },

      enableAnyLayerGroup: async (layerIdString: string, layerConf?: LayerConfAnyId) => {
        const { enableLayerGroup } = get()
        // @ts-ignore
        enableLayerGroup(layerIdString as LayerId, layerConf)
      },

      disableAnyLayerGroup: async (layerIdString: string) => {
        const { disableLayerGroup } = get()

        disableLayerGroup(layerIdString as LayerId)
      },

      setLayoutProperty: async (layer: string, name: string, value: any): Promise<any> => {
        const { isLoaded, _addToFunctionQueue, _mbMapRef } = get()

        if (!isLoaded) {
          return _addToFunctionQueue('setLayoutProperty', [layer, name, value])
        }
        _mbMapRef.current?.setLayoutProperty(layer, name, value)
      },

      setPaintProperty: async (layer: string, name: string, value: any): Promise<any> => {
        const { isLoaded, _mbMapRef, _addToFunctionQueue } = get()
        if (!isLoaded) {
          return _addToFunctionQueue('setPaintProperty', [layer, name, value])
        }
        _mbMapRef.current?.setPaintProperty(layer, name, value)
      },

      setFilter: async (layer: string, filter: any[]): Promise<any> => {
        const { isLoaded, _mbMapRef, _addToFunctionQueue } = get()
        if (!isLoaded) {
          return _addToFunctionQueue('setFilter', [layer, filter])
        }
        _mbMapRef.current?.setFilter(layer, filter)
      },

      setOverlayMessage: async (condition: boolean, message: OverlayMessage) => {
        _setOverlayMessage(condition ? message : null)
      },

      fitBounds: (
        bbox: number[] | LngLatBounds,
        options: { duration: 1000; lonExtra: 0; latExtra: 0 }
      ): Promise<any> => {
        const { isLoaded, _addToFunctionQueue, _mbMapRef } = get()

        if (!isLoaded) {
          return _addToFunctionQueue('fitBounds', [bbox, options])
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

        const flyOptions = { duration: options.duration }
        const lonDiff = lonMax - lonMin
        const latDiff = latMax - latMin
        _mbMapRef.current?.fitBounds(
          [
            [lonMin - options.lonExtra * lonDiff, latMin - options.latExtra * latDiff],
            [lonMax + options.lonExtra * lonDiff, latMax + options.latExtra * latDiff],
          ],
          flyOptions
        )

        return Promise.resolve()
      },

      //   setIsDrawPolygon: (enabled: boolean) => {
      //     const { isLoaded, _addToFunctionQueue, _mbMapRef } = get()

      //     if (!isLoaded) {
      //       _addToFunctionQueue('setIsDrawPolygon', [enabled])
      //       return
      //     }

      //     // setMapLibraryMode('mapbox')

      //     const draw = new MapboxDraw({
      //       displayControlsDefault: false,
      //       // Select which mapbox-gl-draw control buttons to add to the map.
      //       controls: {
      //         polygon: true,
      //         trash: true,
      //       },
      //       // Set mapbox-gl-draw to draw by default.
      //       // The user does not have to click the polygon control button first.
      //       // defaultMode: 'draw_polygon',
      //     })
      //     const source = cloneDeep(_mbMapRef.current?.getStyle().sources[sourceName])

      //     _mbMapRef.current?.removeLayer('carbon-shapes-outline')
      //     _mbMapRef.current?.removeLayer('carbon-shapes-fill')
      //     _mbMapRef.current?.removeLayer('carbon-shapes-sym')
      //     _mbMapRef.current?.removeSource(sourceName)

      //     // console.log(source.data.features)
      //     _mbMapRef.current?.addControl(draw, 'bottom-right')

      //     //@ts-ignore
      //     draw.add(source.data)

      //     setDraw(draw)
      //     setIsDrawEnabled(true)
      //   },
      // }
    }
  })
)
