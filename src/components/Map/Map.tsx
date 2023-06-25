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

import { pickBy, uniq } from 'lodash-es'

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

import { MapLayerMouseEvent, Style as MbStyle, MapboxGeoJSONFeature } from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useUIStore } from '../../common/store'
import { useMapStore } from '../../common/store'

import { LayerOpt, LayerOpts, MapLibraryMode, QueuePriority, PopupOpts } from '#/common/types/map'
import { getLayerName } from '#/common/utils/map'
import { OverlayMessages } from './OverlayMessages'
import { GroupOrientation } from './MapButtons'

interface Props {
  children?: React.ReactNode
}

const DEFAULT_CENTER = [15, 62] as [number, number]
const DEFAULT_ZOOM = 5

export const Map = ({ children }: Props) => {
  const setIsMapPopupOpen = useUIStore((state) => state.setIsMapPopupOpen)

  const mapDivRef = useRef<HTMLDivElement>()
  const mapRef = useRef<OlMap | null>(null)
  const mapLibraryRef = useRef<MapLibraryMode | null>(null)

  const _mbMapRef = useMapStore((state) => state._mbMapRef)
  const mapLibraryMode = useMapStore((state) => state.mapLibraryMode)
  const isLoaded = useMapStore((state) => state.isLoaded)
  const _setIsLoaded = useMapStore((state) => state._setIsLoaded)
  const _functionQueue = useMapStore((state) => state._functionQueue)
  const _setFunctionQueue = useMapStore((state) => state._setFunctionQueue)
  const _layerGroups = useMapStore((state) => state._layerGroups)
  const activeLayerGroupIds = useMapStore((state) => state.activeLayerGroupIds)
  const _layerOptions = useMapStore((state) => state._layerOptions)
  const overlayMessage = useMapStore((state) => state.overlayMessage)
  const selectedFeatures = useMapStore((state) => state.selectedFeatures)
  const setSelectedFeatures = useMapStore((state) => state.setSelectedFeatures)

  const [isMapReady, setIsMapReady] = useState(false)
  const [isMbMapReady, setIsMbMapReady] = useState(false)
  const [draw, setDraw] = useState<MapboxDraw>()
  const [isDrawEnabled, setIsDrawEnabled] = useState(false)

  const popupRef = useRef<HTMLDivElement>(null)
  const [popups, setPopups] = useState<any>({})
  const [popupOnClose, setPopupOnClose] = useState<any>(null)
  const [popupKey, setPopupKey] = useState<any>(null)
  const [popupOpts, setPopupOpts] = useState<PopupOpts | null>(null)

  const [newlySelectedFeatures, setNewlySelectedFeatures] = useState<MapboxGeoJSONFeature[]>([])

  const initMbMap = (viewSettings: { center: [number, number]; zoom?: number }, isHybrid = true) => {
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
              'Map tiles by <a target="_top" rel="noopener" href="https://tile.openstreetmap.org/">OpenStreetMap tile servers</a>, under the <a target="_top" rel="noopener" href="https://operations.osmfoundation.org/policies/tiles/">tile usage policy</a>. Data by <a target="_top" rel="noopener" href="http://openstreetmap.org">OpenStreetMap</a>',
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
        attributionControl: true,
        // transformRequest: (url) => {
        //   return {
        //     url: url,
        //     headers: { "Accept-Encoding": "gzip" },
        //   };
        // },
      })
    }

    if (_mbMapRef.current && _mbMapRef.current.getStyle()) {
      const sources = _mbMapRef.current.getStyle().sources
      for (const key in sources) {
        newMbMap.addSource(key, sources[key])
      }
      for (const layer of _mbMapRef.current.getStyle().layers) {
        newMbMap.addLayer(layer)
      }
      _mbMapRef.current.remove()
    }

    const mbSelectionFunction = (e: MapLayerMouseEvent) => {
      // Set `bbox` as 5px reactangle area around clicked point.
      // Find features intersecting the bounding box.
      // @ts-ignore
      const point = newMbMap.project(e.lngLat)

      const features = newMbMap.queryRenderedFeatures(point)

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

  const initHybridMap = (viewSettings: { center: [number, number]; zoom?: number }) => {
    const newMbMap = initMbMap(viewSettings, true)
    const mbLayer = getHybridMbLayer(newMbMap)

    const attribution = new Attribution({
      collapsible: false,
    })

    const options = {
      renderer: 'webgl',
      target: 'map',
      view: new View({ zoom: viewSettings.zoom, center: proj.fromLonLat(viewSettings.center) }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource({
            attributions: '© Powered by <a href="https://www.netlify.com/" target="_blank">Netlify</a>',
          }),
        }),
        mbLayer,
      ],
      controls: defaultControls({ attribution: false }).extend([attribution, new ScaleLine()]),
    }
    const newMap = new OlMap(options)

    newMap.once('rendercomplete', () => {
      setIsMapReady(true)
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
    })

    return { newMap, newMbMap }
  }

  const initMapMode = (mode: MapLibraryMode, viewSettings: { center: [number, number]; zoom?: number }) => {
    switch (mode) {
      case 'mapbox': {
        let newMbMap = initMbMap(viewSettings, false)
        _mbMapRef.current = newMbMap

        mapLibraryRef.current = 'mapbox'

        return () => {
          newMbMap.remove()
          mapLibraryRef.current = null
        }
      }
      case 'hybrid': {
        let { newMap, newMbMap } = initHybridMap(viewSettings)
        mapRef.current = newMap
        _mbMapRef.current = newMbMap

        mapLibraryRef.current = 'hybrid'

        return () => {
          newMap.setTarget(undefined)
          newMbMap.remove()
          mapLibraryRef.current = null
        }
      }
    }
  }
  useEffect(() => {
    let center = DEFAULT_CENTER
    let zoom = DEFAULT_ZOOM

    if (!mapLibraryRef.current) {
      return initMapMode(mapLibraryMode, { center, zoom })
    } else if (mapLibraryRef.current !== mapLibraryMode) {
      _setIsLoaded(false)

      if (mapLibraryRef.current === 'mapbox') {
        const mbCenter = _mbMapRef.current?.getCenter()
        if (mbCenter != null) {
          center = [mbCenter.lng, mbCenter.lat]
        }

        const mbZoom = _mbMapRef.current?.getZoom()
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

  useEffect(() => {
    if (isLoaded) {
      if (mapLibraryRef.current !== 'mapbox') {
        // remove the old callback and create a new one each time state is updated
        unByKey(popupKey)

        const newPopupFunc = (evt: MapBrowserEvent<any>) => {
          let point = mapRef.current?.getCoordinateFromPixel(evt.pixel)

          if (point != undefined) {
            point = proj.toLonLat(point)
            _mbMapRef.current?.fire('click', {
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
  }, [activeLayerGroupIds, mapLibraryMode, isLoaded, popups])

  useEffect(() => {
    const filterSelectedFeatures = (
      _layerOptions: LayerOpts,
      selectedFeatures: MapboxGeoJSONFeature[],
      newlySelectedFeatures: MapboxGeoJSONFeature[]
    ) => {
      const selectableLayers = Object.keys(
        pickBy(_layerOptions, (value: LayerOpt, _key: string) => {
          return value.selectable
        })
      )

      // remove features from unselectable layers
      let newlySelectedFeaturesCopy = newlySelectedFeatures.filter((f) => selectableLayers.includes(f.layer.id))

      // remove reatures without an id and log an error
      newlySelectedFeaturesCopy = newlySelectedFeaturesCopy.filter((f) => {
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

      for (const feature of newlySelectedFeaturesCopy) {
        const layerId = feature.layer.id

        // if the feature is already selected, unselect
        if (selectedFeaturesCopy.find((f) => f.id === feature.id)) {
          selectedFeaturesCopy = selectedFeaturesCopy.filter((f) => f.id !== feature.id)
          continue
        }

        // if the layer is not multi-selectable, unselect all other features from that layer
        if (!_layerOptions[layerId].multiSelectable) {
          selectedFeaturesCopy = selectedFeaturesCopy.filter((f) => f.layer.id !== feature.layer.id)
        }

        selectedFeaturesCopy.push(feature)
      }

      return selectedFeaturesCopy
    }

    if (newlySelectedFeatures.length > 0) {
      setNewlySelectedFeatures([])

      // Set a filter matching selected features by FIPS codes
      // to activate the 'counties-highlighted' layer.
      const selectedFeaturesCopy = filterSelectedFeatures(_layerOptions, selectedFeatures, newlySelectedFeatures)

      let selectedLayerIds: string[] = []
      selectedFeaturesCopy.map((feature) => {
        selectedLayerIds.push(feature.layer.id)
      })

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

        _mbMapRef.current?.setFilter(getLayerName(id) + '-highlighted', ['in', 'id', ...featureIds])
      }

      setSelectedFeatures(selectedFeaturesCopy)
    }
  }, [newlySelectedFeatures, selectedFeatures, _layerOptions, activeLayerGroupIds, _layerGroups])

  useEffect(() => {
    // Run queued function once map has loaded
    if (!isLoaded) {
      switch (mapLibraryMode) {
        case 'mapbox': {
          if (isMbMapReady) {
            _setIsLoaded(true)
          }
        }
        case 'hybrid': {
          if (isMbMapReady && isMapReady) {
            _setIsLoaded(true)
          }
        }
      }
    }
  }, [isLoaded, isMapReady, isMbMapReady, mapLibraryMode])

  useEffect(() => {
    // Run queued function once map has loaded
    if (isLoaded && _functionQueue.length > 0) {
      let functionsToCall: any[] = []
      let _newFunctionQueue: any[] = []

      // reverse the QueuePriority enum array, since we want to call the highest priority functions first
      let priorityArr = Object.values(QueuePriority)
      priorityArr = priorityArr.reverse().splice(0, priorityArr.length / 2)

      for (let i in priorityArr) {
        functionsToCall = functionsToCall.concat(_functionQueue.filter((f) => f.priority === priorityArr[i]))

        if (functionsToCall.length > 0) {
          _newFunctionQueue = _functionQueue.filter((f) => !functionsToCall.includes(f))
          break
        }
      }

      const callFuncs = async () => {
        await Promise.all(
          functionsToCall.map((call) => {
            try {
              // @ts-ignore
              return values[call.func](...call.args)
            } catch (e) {
              console.error("Couldn't run queued map function", call.func, call.args)
              console.error(e)
              call.promise.reject()
              call.promise = null
              return null
            }
          })
        )

        functionsToCall.forEach((call) => {
          if (call.promise != null) {
            call.promise.resolve()
          }
        })

        _setFunctionQueue(_newFunctionQueue)
      }

      callFuncs()
    }
  }, [isLoaded, _functionQueue])

  useEffect(() => {
    if (isLoaded) {
      let activeLayerIds: string[] = []

      for (const layerId of activeLayerGroupIds) {
        const layerGroupLayers = _layerGroups[layerId]

        activeLayerIds = [...activeLayerIds, ...Object.keys(layerGroupLayers)]
      }

      let selectedFeaturesCopy = [...selectedFeatures]

      selectedFeaturesCopy = selectedFeaturesCopy.filter((feature) => {
        return activeLayerIds.includes(feature.layer.id)
      })

      if (selectedFeaturesCopy.length !== selectedFeatures.length) {
        setSelectedFeatures(selectedFeaturesCopy)
      }
    }
  }, [isLoaded, selectedFeatures, activeLayerGroupIds, _layerGroups])

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
          position: 'absolute !important',
          top: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          ...(mapLibraryMode === 'hybrid' && { '.ol-scale-line': { right: '8px', left: 'auto', bottom: '26px' } }),
          // pointerEvents: 'none',
          // '> *': {
          //   pointerEvents: 'auto',
          // },
        }}
      ></Box>
      <OverlayMessages message={overlayMessage}></OverlayMessages>
      <GroupOrientation></GroupOrientation>
      {children}
    </>
  )
}
