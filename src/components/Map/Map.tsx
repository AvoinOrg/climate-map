// This is the main Map component, exported as a context.
// Uses Openlayers with Mapbox GL added as a layer. This is due to the low performance of
// Openlayers as WebGL renderer, while Mapbox GL lacks a lot of features that Openlayers has.
// TODO: Look into Maplibre GL, which is a fork of Mapbox GL that is more open source friendly.
// See: https://github.com/geoblocks/ol-maplibre-layer
//
'use client'

import 'ol/ol.css'
import '#/common/style/mapbox.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

import { isEqual, pickBy, uniq } from 'lodash-es'

import React, { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import { Map as OlMap, View, MapBrowserEvent } from 'ol'
import * as proj from 'ol/proj'
import { unByKey } from 'ol/Observable'
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import Overlay from 'ol/Overlay'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Attribution, ScaleLine, defaults as defaultControls } from 'ol/control'

import {
  MapLayerMouseEvent,
  Style as MbStyle,
  MapboxGeoJSONFeature,
} from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useUIStore } from '../../common/store'
import { useMapStore } from '../../common/store'

import {
  LayerOptions,
  LayerOptionsObj,
  MapLibraryMode,
  QueuePriority,
  PopupOpts,
  FunctionQueue,
} from '#/common/types/map'
import { getAllLayerOptionsObj, getLayerName } from '#/common/utils/map'
import { OverlayMessages } from './OverlayMessages'
import { MapButtons } from './MapButtons'
import { useVisibleLayerGroups } from '#/common/hooks/map/useVisibleLayerGroups'
import { useVisibleLayerGroupIds } from '#/common/hooks/map/useVisibleLayerGroupIds'

interface Props {
  children?: React.ReactNode
}

const DEFAULT_CENTER = [15, 62] as [number, number]
const DEFAULT_ZOOM = 5

export const Map = ({ children }: Props) => {
  const setIsMapPopupOpen = useUIStore((state) => state.setIsMapPopupOpen)
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)

  const mapDivRef = useRef<HTMLDivElement>()
  const mapRef = useRef<OlMap | null>(null)
  const mapLibraryRef = useRef<MapLibraryMode | null>(null)
  const hasProcessedFeatureSelection = useRef(true)

  const _mbMap = useMapStore((state) => state._mbMap)
  const _setMbMap = useMapStore((state) => state._setMbMap)
  const mapLibraryMode = useMapStore((state) => state.mapLibraryMode)
  const isLoaded = useMapStore((state) => state.isLoaded)
  const _setIsLoaded = useMapStore((state) => state._setIsLoaded)
  const _isMapReady = useMapStore((state) => state._isMapReady)
  const _isHydrated = useMapStore((state) => state._isHydrated)
  const _setIsMapReady = useMapStore((state) => state._setIsMapReady)
  const _functionQueue = useMapStore((state) => state._functionQueue)
  const _executeFunctionQueue = useMapStore(
    (state) => state._executeFunctionQueue
  )
  const _layerGroups = useMapStore((state) => state._layerGroups)
  const mapContext = useMapStore((state) => state.mapContext)

  const overlayMessage = useMapStore((state) => state.overlayMessage)
  const selectedFeatures = useMapStore((state) => state.selectedFeatures)
  const setSelectedFeatures = useMapStore((state) => state.setSelectedFeatures)
  const _isFunctionQueueExecuting = useMapStore(
    (state) => state._isFunctionQueueExecuting
  )

  const visibleLayerGroups = useVisibleLayerGroups()
  const visibleLayerGroupIds = useVisibleLayerGroupIds()

  const [isMapReady, setIsMapReady] = useState(false)
  const [isMbMapReady, setIsMbMapReady] = useState(false)
  const [draw, setDraw] = useState<MapboxDraw>()
  const [isDrawEnabled, setIsDrawEnabled] = useState(false)

  const popupRef = useRef<HTMLDivElement>(null)
  const [popups, setPopups] = useState<any>({})
  const [popupOnClose, setPopupOnClose] = useState<any>(null)
  const [popupKey, setPopupKey] = useState<any>(null)
  const [popupOpts, setPopupOpts] = useState<PopupOpts | null>(null)

  const [newlySelectedFeatures, setNewlySelectedFeatures] = useState<
    MapboxGeoJSONFeature[]
  >([])

  // The following functions are used to initialize the map,
  // depending on the map's mode (Openlayers, Mapbox GL, or hybrid of both)
  const initMbMap = (
    viewSettings: { center: [number, number]; zoom?: number },
    isHybrid = true
  ) => {
    // Mapbox does not render without a valid access token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string

    let newMbMap: mapboxgl.Map

    if (isHybrid) {
      const emptyStyle: MbStyle = {
        version: 8,
        name: 'empty',
        metadata: {
          'mapbox:autocomposite': true,
          'mapbox:type': 'template',
        },
        glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': 'rgba(0,0,0,0)',
            },
          },
        ],
      }

      newMbMap = new mapboxgl.Map({
        // style: 'mapbox://styles/mapbox/satellite-v9',
        attributionControl: false,
        boxZoom: false,
        center: viewSettings.center,
        container: 'map',
        doubleClickZoom: false,
        dragPan: false,
        dragRotate: false,
        interactive: true,
        keyboard: false,
        pitchWithRotate: false,
        scrollZoom: false,
        touchZoomRotate: false,
        style: emptyStyle,
      })
    } else {
      const style: MbStyle = {
        version: 8,
        glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '© <a target="_top" rel="noopener" href="https://openstreetmap.org/">OpenStreetMap</a>, under the <a target="_top" rel="noopener" href="https://operations.osmfoundation.org/policies/tiles/">tile usage policy</a>.',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
        ],
      }

      newMbMap = new mapboxgl.Map({
        //@ts-ignore
        container: 'map', // container id
        style: style,
        center: viewSettings.center, // starting position [lng, lat]
        zoom: viewSettings.zoom, // starting zoom
        attributionControl: false,
        // transformRequest: (url) => {
        //   return {
        //     url: url,
        //     headers: { "Accept-Encoding": "gzip" },
        //   };
        // },
      })

      newMbMap.addControl(
        new mapboxgl.AttributionControl({
          compact: true,
        })
      )
    }

    if (_mbMap && _mbMap.getStyle()) {
      const sources = _mbMap.getStyle().sources
      for (const key in sources) {
        newMbMap.addSource(key, sources[key])
      }
      for (const layer of _mbMap.getStyle().layers) {
        newMbMap.addLayer(layer)
      }
      _mbMap.remove()
    }

    const mbSelectionFunction = (e: MapLayerMouseEvent) => {
      // Set `bbox` as 5px reactangle area around clicked point.
      // Find features intersecting the bounding box.
      // @ts-ignore
      const point = newMbMap.project(e.lngLat)

      const features = newMbMap.queryRenderedFeatures(point)

      hasProcessedFeatureSelection.current = false
      setNewlySelectedFeatures(features)
    }

    newMbMap.on('click', mbSelectionFunction)

    newMbMap.on('load', () => {
      setIsMbMapReady(true)
    })

    return newMbMap
  }

  const getHybridMbLayer = (newMbMap: mapboxgl.Map) => {
    const mbLayer = new Layer({
      render: function (frameState) {
        const canvas: any = newMbMap.getCanvas()
        const viewState = frameState.viewState

        const visible = mbLayer.getVisible()
        canvas.style.display = visible ? 'block' : 'none'
        canvas.style.position = 'absolute'

        const opacity = mbLayer.getOpacity()
        canvas.style.opacity = opacity

        // adjust view parameters in mapbox
        const rotation = viewState.rotation
        newMbMap.jumpTo({
          center: proj.toLonLat(viewState.center) as [number, number],
          zoom: viewState.zoom - 1,
          bearing: (-rotation * 180) / Math.PI,
        })

        // cancel the scheduled update & trigger synchronous redraw
        // see https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
        // NOTE: THIS MIGHT BREAK IF UPDATING THE MAPBOX VERSION
        //@ts-ignore
        if (newMbMap._frame) {
          //@ts-ignore
          newMbMap._frame.cancel()
          //@ts-ignore
          newMbMap._frame = null
        } //@ts-ignore
        newMbMap._render()

        return canvas
      },
    })

    return mbLayer
  }

  const initHybridMap = (viewSettings: {
    center: [number, number]
    zoom?: number
  }) => {
    const newMbMap = initMbMap(viewSettings, true)
    const mbLayer = getHybridMbLayer(newMbMap)

    const attribution = new Attribution({
      collapsible: false,
    })

    const options = {
      renderer: 'webgl',
      target: 'map',
      view: new View({
        zoom: viewSettings.zoom,
        center: proj.fromLonLat(viewSettings.center),
      }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource({
            attributions:
              '© Powered by <a href="https://www.netlify.com/" target="_blank">Netlify</a>',
          }),
        }),
        mbLayer,
      ],
      controls: defaultControls({ attribution: false }).extend([
        attribution,
        new ScaleLine(),
      ]),
    }
    const newMap = new OlMap(options)

    newMap.once('rendercomplete', () => {
      newMap.setTarget(mapDivRef.current)

      const overlay = new Overlay({
        element: popupRef.current as HTMLElement,
        autoPan: true,
        // autoPanAnimation: {
        //   duration: 250,
        // },
      })

      const onclick = () => {
        overlay.setPosition(undefined)
        return false
      }

      setPopupOnClose(() => onclick)

      newMap.addOverlay(overlay)

      _setIsMapReady(true)
    })

    return { newMap, newMbMap }
  }

  const initMapMode = (
    mode: MapLibraryMode,
    viewSettings: { center: [number, number]; zoom?: number }
  ) => {
    switch (mode) {
      case 'mapbox': {
        let newMbMap = initMbMap(viewSettings, false)
        _setMbMap(newMbMap)

        mapLibraryRef.current = 'mapbox'

        return () => {
          newMbMap.remove()
          mapLibraryRef.current = null
        }
      }
      case 'hybrid': {
        let { newMap, newMbMap } = initHybridMap(viewSettings)
        mapRef.current = newMap
        _setMbMap(newMbMap)

        mapLibraryRef.current = 'hybrid'

        return () => {
          newMap.setTarget(undefined)
          newMbMap.remove()
          mapLibraryRef.current = null
        }
      }
    }
  }

  // handles the initialization of map, using the above functions.
  useEffect(() => {
    let center = DEFAULT_CENTER
    let zoom = DEFAULT_ZOOM

    if (!mapLibraryRef.current) {
      return initMapMode(mapLibraryMode, { center, zoom })
    } else if (mapLibraryRef.current !== mapLibraryMode) {
      _setIsMapReady(false)

      if (mapLibraryRef.current === 'mapbox') {
        const mbCenter = _mbMap?.getCenter()
        if (mbCenter != null) {
          center = [mbCenter.lng, mbCenter.lat]
        }

        const mbZoom = _mbMap?.getZoom()
        if (mbZoom != null) {
          zoom = mbZoom
        }
      } else {
        const olCenter = mapRef.current?.getView().getCenter()
        if (olCenter != null) {
          center = proj.toLonLat(olCenter) as [number, number]
        }
        const olZoom = mapRef.current?.getView().getZoom()
        if (olZoom != null) {
          zoom = olZoom
        }
      }

      return initMapMode(mapLibraryMode, { center, zoom })
    }
  }, [mapLibraryMode])

  // This effect runs only when OpenLayers is used
  // It refreshes the set of popup functions whenever
  // layerGroups get hidden or shown
  useEffect(() => {
    if (isMapReady) {
      if (mapLibraryRef.current !== 'mapbox') {
        // remove the old callback and create a new one each time state is updated
        unByKey(popupKey)

        const newPopupFunc = (evt: MapBrowserEvent<any>) => {
          let point = mapRef.current?.getCoordinateFromPixel(evt.pixel)

          if (point != undefined) {
            point = proj.toLonLat(point)
            _mbMap?.fire('click', {
              lngLat: point as mapboxgl.LngLatLike,
            })
          }

          let featureObjs: any[] = []

          mapRef.current?.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
            featureObjs.push({ feature, layer })
          })

          if (featureObjs.length > 0) {
            featureObjs = featureObjs.sort((a: any, b: any) => {
              const aZ = a.layer.getZIndex()
              const bZ = b.layer.getZIndex()

              if (aZ > bZ) {
                return -1
              } else if (bZ > aZ) {
                return 1
              } else {
                return 0
              }
            })

            const featureGroup = featureObjs[0].layer.get('group')
            const features = featureObjs.map((f) => {
              if (f.layer.get('group') === featureGroup) {
                return f.feature
              }
            })

            const Popup = popups[featureGroup]
            if (Popup != null) {
              const popupOpts: PopupOpts = {
                features,
                PopupElement: Popup,
              }

              setPopupOpts(popupOpts)
              setIsMapPopupOpen(true)
            }

            // console.log(features)
            // for (const i in activeLayers) {
            //   console.log(layers[activeLayers[i]].getSource)
            //   if (layers[activeLayers[i]].hasFeature(features[0])) {
            //     console.log("asdfasdf")
            //   }
            // }
            // map.forEachLayerAtPixel(evt.pixel, function (layer: any) {})
          }
        }
        const newpopupKey = mapRef.current?.on('singleclick', newPopupFunc)

        setPopupKey(newpopupKey)
      } else {
      }
    }
  }, [visibleLayerGroupIds, mapLibraryMode, isLoaded, popups])

  // This effect filters the selected features to those,
  // that are from selectable layers. Also applies styling
  // to the layers, so that the features are visually selected.
  useEffect(() => {
    if (isLoaded && !hasProcessedFeatureSelection.current) {
      hasProcessedFeatureSelection.current = true

      if (newlySelectedFeatures.length === 0) {
        return
      } else {
        setNewlySelectedFeatures([])
      }

      const filterSelectedFeatures = (
        layerOptionsObj: LayerOptionsObj,
        activeLayerIds: string[],
        selectedFeatures: MapboxGeoJSONFeature[],
        newlySelectedFeatures: MapboxGeoJSONFeature[]
      ) => {
        const selectableLayers = Object.keys(
          pickBy(layerOptionsObj, (value: LayerOptions, _key: string) => {
            return value.selectable
          })
        )

        // remove features from unselectable layers
        let filteredFeatures = newlySelectedFeatures.filter((f) =>
          selectableLayers.includes(f.layer.id)
        )

        filteredFeatures = filteredFeatures.filter((f) =>
          activeLayerIds.includes(f.layer.id)
        )

        // remove reatures without an id and log an error
        filteredFeatures = filteredFeatures.filter((f) => {
          if (f.id == null) {
            console.error(
              'Feature without id on layer "',
              f.layer.id,
              '". Check that the source style has either "generateId" or "promoteId" set.'
            )
            return false
          }
          return true
        })

        let selectedFeaturesCopy = [...selectedFeatures]

        // go through filtered features and compare them to previously selected features
        for (const feature of filteredFeatures) {
          const layerId = feature.layer.id

          // if the feature is already selected, unselect
          if (selectedFeaturesCopy.find((f) => f.id === feature.id)) {
            selectedFeaturesCopy = selectedFeaturesCopy.filter(
              (f) => f.id !== feature.id
            )
            continue
          }

          // if the layer is not multi-selectable, unselect all other features from that layer
          if (!layerOptionsObj[layerId].multiSelectable) {
            selectedFeaturesCopy = selectedFeaturesCopy.filter(
              (f) => f.layer.id !== feature.layer.id
            )
          }

          selectedFeaturesCopy.push(feature)
        }

        return selectedFeaturesCopy
      }

      const layerOptionsObj = getAllLayerOptionsObj(_layerGroups)

      let activeLayerIds: string[] = []
      for (const layerGroupId of Object.keys(visibleLayerGroups)) {
        const layerGroup = visibleLayerGroups[layerGroupId]
        activeLayerIds = [...activeLayerIds, ...Object.keys(layerGroup.layers)]
      }

      const selectedFeaturesCopy = filterSelectedFeatures(
        layerOptionsObj,
        activeLayerIds,
        selectedFeatures,
        newlySelectedFeatures
      )

      // TODO: "selectedFeaturesCopy" is calculated twice for each update, which
      // is not great. However, this allows direct manipulation of
      // "selectedFeatures" from other components. Make smarter later.
      if (!isEqual(selectedFeatures, selectedFeaturesCopy)) {
        let selectedLayerIds: string[] = []
        selectedFeaturesCopy.map((feature) => {
          selectedLayerIds.push(feature.layer.id)
        })

        if (selectedFeaturesCopy)
          // add layer ids from the previous selection
          selectedFeatures.map((feature) => {
            selectedLayerIds.push(feature.layer.id)
          })

        selectedLayerIds = uniq(selectedLayerIds)

        for (const id of selectedLayerIds) {
          const featureIds = selectedFeaturesCopy
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

        setSelectedFeatures(selectedFeaturesCopy)
      }
    }
  }, [
    newlySelectedFeatures,
    selectedFeatures,
    isLoaded,
    visibleLayerGroups,
    _layerGroups,
  ])

  useEffect(() => {
    if (!isLoaded && mapContext != null) {
      switch (mapLibraryMode) {
        case 'mapbox': {
          if (isMbMapReady) {
            _setIsMapReady(true)
          }
        }
        case 'hybrid': {
          if (isMbMapReady && isMapReady) {
            _setIsMapReady(true)
          }
        }
      }
    }
  }, [isLoaded, isMapReady, isMbMapReady, mapLibraryMode, mapContext])

  useEffect(() => {
    // Run queued functions once map has loaded
    if (_isMapReady && !_isFunctionQueueExecuting && !isLoaded && _isHydrated) {
      _executeFunctionQueue(() => _setIsLoaded(true))
    }
  }, [
    _isMapReady,
    _isHydrated,
    _functionQueue,
    _isFunctionQueueExecuting,
    isLoaded,
  ])

  useEffect(() => {
    if (isLoaded) {
      _mbMap?.resize()
    }
  }, [isSidebarOpen, isLoaded])

  return (
    <>
      {/* <Box
        ref={mapDivRef}
        id="map"
        className="ol-map"
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
        }}
      ></Box> */}
      <Box
        ref={mapDivRef}
        id="map"
        className={'ol-map'}
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          overflow: 'hidden',
          ...(mapLibraryMode === 'hybrid' && {
            '.ol-scale-line': { right: '8px', left: 'auto', bottom: '26px' },
          }),
          // pointerEvents: 'none',
          // '> *': {
          //   pointerEvents: 'auto',
          // },
        }}
      ></Box>
      <OverlayMessages message={overlayMessage}></OverlayMessages>
      <MapButtons></MapButtons>
      {children}
    </>
  )
}
