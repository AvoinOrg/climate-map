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

import { pickBy, uniq, map, cloneDeep } from 'lodash-es'

import React, { createContext, useState, useRef, useEffect, useCallback } from 'react'
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

import { LngLat, MapLayerMouseEvent, PointLike, Style as MbStyle, MapboxGeoJSONFeature } from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

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
} from '#/common/types/map'
import { layerConfs } from './Layers'
import { MapPopup } from './MapPopup'
import { getColorExpressionArrForValues } from '#/common/utils/map'
import { OverlayMessages } from './OverlayMessages'
import { ConstructionOutlined } from '@mui/icons-material'
interface Props {
  children?: React.ReactNode
}

interface IMapContext {
  isLoaded: boolean
  setMapLibraryMode: (mode: MapLibraryMode) => void
  mapToggleTerrain: () => void | null
  mapResetNorth: () => void | null
  getGeocoder: () => any | null
  mapRelocate: () => void | null
  mapZoomIn: () => void | null
  mapZoomOut: () => void | null
  toggleLayerGroup: (layerId: LayerId, layerConf?: LayerConf) => Promise<void> | null
  enableLayerGroup: (layerId: LayerId, layerConf?: LayerConf) => Promise<void> | null
  disableLayerGroup: (layerId: LayerId) => Promise<void> | null
  toggleAnyLayerGroup: (layerId: string, layerConf?: LayerConfAnyId) => Promise<void> | null
  enableAnyLayerGroup: (layerId: string, layerConf?: LayerConfAnyId) => Promise<void> | null
  disableAnyLayerGroup: (layerId: string) => Promise<void> | null
  activeLayerGroupIds: string[]
  layerGroups: {} | null
  registerGroup?: (layerGroup: any) => void | null
  addJSONLayer: (id: string, groupId: string, json: any, featureColorCol: string, projection: string) => void | null
  getSourceJson: (id: string) => any
  selectedFeatures: MapboxGeoJSONFeature[]
  setLayoutProperty: (layerId: string, property: string, value: any) => Promise<void> | null
  setPaintProperty: (layerId: string, property: string, value: any) => Promise<void> | null
  setFilter: (layerId: string, filter: any) => Promise<void> | null
  setOverlayMessage: (condition: boolean, nmessage: OverlayMessage) => Promise<void> | null
  fitBounds: (bbox: number[], lonExtra: number, latExtra: number) => Promise<void> | null
  isDrawEnabled: boolean
  setIsDrawEnabled: (enabled: boolean) => void
  // isDrawPolygon: () => void
  setIsDrawPolygon: (enabled: boolean) => void
  // addMbStyle?: (style: any) => void
}

export const MapContext = createContext({ isLoaded: false } as IMapContext)

const DEFAULT_MAP_LIBRARY_MODE: MapLibraryMode = 'hybrid'
const DEFAULT_CENTER = [15, 62] as [number, number]
const DEFAULT_ZOOM = 5

export const MapProvider = ({ children }: Props) => {
  const mapDivRef = useRef<HTMLDivElement>()
  const mapRef = useRef<Map | null>(null)
  const mbMapRef = useRef<mapboxgl.Map | null>(null)
  const mapLibraryRef = useRef<MapLibraryMode | null>(null)
  const [mapLibraryMode, setMapLibraryMode] = useState<MapLibraryMode>(DEFAULT_MAP_LIBRARY_MODE)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isMbMapReady, setIsMbMapReady] = useState(false)
  const [activeLayerGroupIds, setActiveLayerGroupIds] = useState<string[]>([])
  const [layerGroups, setLayerGroups] = useState<any>({})
  const [layerOptions, setLayerOptions] = useState<LayerOpts>({})
  const [functionQueue, setFunctionQueue] = useState<any[]>([])
  const [draw, setDraw] = useState<MapboxDraw>()
  const [isDrawEnabled, setIsDrawEnabled] = useState(false)

  const popupRef = useRef<HTMLDivElement>(null)
  const [popups, setPopups] = useState<any>({})
  const [popupOverlay, setPopupOverlay] = useState<any>(null)
  const [popupOnClose, setPopupOnClose] = useState<any>(null)
  const [popupKey, setPopupKey] = useState<any>(null)
  const [popupElement, setPopupElement] = useState<React.ReactNode | null>(null)

  const [selectedFeatures, setSelectedFeatures] = useState<MapboxGeoJSONFeature[]>([])
  const [newlySelectedFeatures, setNewlySelectedFeatures] = useState<MapboxGeoJSONFeature[]>([])
  const [overlayMessage, _setOverlayMessage] = useState<OverlayMessage | null>(null)

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

    if (mbMapRef.current && mbMapRef.current.getStyle()) {
      const sources = mbMapRef.current.getStyle().sources
      for (const key in sources) {
        newMbMap.addSource(key, sources[key])
      }
      for (const layer of mbMapRef.current.getStyle().layers) {
        newMbMap.addLayer(layer)
      }
      mbMapRef.current.remove()
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
    const newMap = new Map(options)

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
      setPopupOverlay(overlay)

      newMap.addOverlay(overlay)
    })

    return { newMap, newMbMap }
  }

  const initMapMode = (mode: MapLibraryMode, viewSettings: { center: [number, number]; zoom?: number }) => {
    switch (mode) {
      case 'mapbox': {
        let newMbMap = initMbMap(viewSettings, false)
        mbMapRef.current = newMbMap

        mapLibraryRef.current = 'mapbox'

        return () => {
          newMbMap.remove()
          mapLibraryRef.current = null
        }
      }
      case 'hybrid': {
        let { newMap, newMbMap } = initHybridMap(viewSettings)
        mapRef.current = newMap
        mbMapRef.current = newMbMap

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
      setIsLoaded(false)

      if (mapLibraryRef.current === 'mapbox') {
        const mbCenter = mbMapRef.current?.getCenter()
        if (mbCenter != null) {
          center = [mbCenter.lng, mbCenter.lat]
        }

        const mbZoom = mbMapRef.current?.getZoom()
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
      // remove the old callback and create a new one each time state is updated
      unByKey(popupKey)

      const newPopupFunc = (evt: MapBrowserEvent<any>) => {
        let point = mapRef.current?.getCoordinateFromPixel(evt.pixel)

        if (point != undefined) {
          point = proj.toLonLat(point)
          mbMapRef.current?.fire('click', {
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
            const popupElement = <Popup features={features}></Popup>

            createPopup(evt.coordinate, popupElement)
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
    }
  }, [activeLayerGroupIds, isLoaded, popups])

  useEffect(() => {
    const filterSelectedFeatures = (
      layerOptions: LayerOpts,
      selectedFeatures: MapboxGeoJSONFeature[],
      newlySelectedFeatures: MapboxGeoJSONFeature[]
    ) => {
      const selectableLayers = Object.keys(
        pickBy(layerOptions, (value: LayerOpt, _key: string) => {
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
        if (!layerOptions[layerId].multiSelectable) {
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
      const selectedFeaturesCopy = filterSelectedFeatures(layerOptions, selectedFeatures, newlySelectedFeatures)

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

        mbMapRef.current?.setFilter(getLayerName(id) + '-highlighted', ['in', 'id', ...featureIds])
      }

      setSelectedFeatures(selectedFeaturesCopy)
    }
  }, [newlySelectedFeatures, selectedFeatures, layerOptions, activeLayerGroupIds, layerGroups])

  useEffect(() => {
    // Run queued function once map has loaded
    if (!isLoaded) {
      switch (mapLibraryMode) {
        case 'mapbox': {
          if (isMbMapReady) {
            setIsLoaded(true)
          }
        }
        case 'hybrid': {
          if (isMbMapReady && isMapReady) {
            setIsLoaded(true)
          }
        }
      }
    }
  }, [isLoaded, isMapReady, isMbMapReady, mapLibraryMode])

  useEffect(() => {
    // Run queued function once map has loaded
    if (isLoaded && functionQueue.length > 0) {
      let functionsToCall: any[] = []
      let newFunctionQueue: any[] = []

      // reverse the QueuePriority enum array, since we want to call the highest priority functions first
      let priorityArr = Object.values(QueuePriority)
      priorityArr = priorityArr.reverse().splice(0, priorityArr.length / 2)

      for (let i in priorityArr) {
        functionsToCall = functionsToCall.concat(functionQueue.filter((f) => f.priority === priorityArr[i]))

        if (functionsToCall.length > 0) {
          newFunctionQueue = functionQueue.filter((f) => !functionsToCall.includes(f))
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

        setFunctionQueue(newFunctionQueue)
      }

      callFuncs()
    }
  }, [isLoaded, functionQueue])

  useEffect(() => {
    if (isLoaded) {
      let activeLayerIds: string[] = []

      for (const layerId of activeLayerGroupIds) {
        const layerGroupLayers = layerGroups[layerId]

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
  }, [isLoaded, selectedFeatures, activeLayerGroupIds, layerGroups])

  const createPopup = (coords: any, popupElement: React.ReactNode) => {
    popupOverlay.setPosition(coords)
    setPopupElement(popupElement)
  }

  // TODO ZONE
  const getGeocoder = () => {}
  const mapRelocate = () => {}
  const mapResetNorth = () => {}
  const mapToggleTerrain = () => {}
  const mapZoomIn = () => {}
  const mapZoomOut = () => {}

  // const convertMbSourceToLayer = (source: any): [any, SourceType] => {
  //   switch (source.type as SourceType) {
  //     case 'vector': {
  //       const layer = new VectorTileLayer({
  //         source: new VectorTileSource({
  //           url: 'https://server.avoin.org/data/map/snow_cover_loss_2016/{z}/{x}/{y}.pbf',
  //           format: new MVT(),
  //         }),
  //       })

  //       return [layer, 'vector']
  //     }
  //     case 'raster': {
  //       const layer = new TileLayer({
  //         source: new XYZSource({
  //           url: source.url,
  //         }),
  //       })
  //       return [layer, 'raster']
  //     }
  //     case 'geojson': {
  //       const layer = new VectorLayer({
  //         source: new VectorSource({
  //           url: source.url,
  //           format: new GeoJSON(),
  //         }),
  //       })
  //       return [layer, 'geojson']
  //     }
  //     default: {
  //       console.error('Invalid vector source: ' + source.type)
  //       return
  //     }
  //   }
  // }

  // const convertMbLayer = (layer: any) => {
  //   let layer = null
  // }

  const setGroupVisibility = (layerId: LayerId, isVisible: boolean) => {
    const layerGroup = layerGroups[layerId]

    for (const layer in layerGroup) {
      if (layerOptions[layer].useMb) {
        mbMapRef.current?.setLayoutProperty(layer, 'visibility', isVisible ? 'visible' : 'none')
      } else {
        layerGroup[layer].setVisible(isVisible)
      }
    }
  }

  const getLayerType = (layerId: string): LayerType => {
    const suffix = layerId.split('-').slice(-1)[0]
    if (layerTypes.includes(suffix)) {
      return suffix as LayerType
    }

    console.error(
      'Invalid layer type: "' + suffix + '" for layer: ' + layerId + '". Valid types are: ' + layerTypes.join(', ')
    )
    return 'invalid'
  }

  const getLayerName = (layerId: string): LayerType => {
    const layerIdSplitArr = layerId.split('-')
    if (layerIdSplitArr.length > 2) {
      console.error('Invalid layer id. Only use hyphen ("-") to separate the LayerType-suffix from the rest of the id.')
    }

    const name = layerIdSplitArr.slice(0, -1).join('-')
    if (name.length > 0) {
      return name
    }

    return layerId
  }

  const assertValidHighlightingConf = (layerOpt: LayerOpt, layers: ExtendedAnyLayer[]) => {
    if (layerOpt.layerType === 'fill') {
      if (layerOpt.selectable) {
        if (!layers.find((l: any) => l.id === layerOpt.name + '-highlighted')) {
          console.error("Layer '" + layerOpt.name + "' is selectable but missing the corresponding highlighted layer.")
        }
      }
    }
  }

  const addMbStyle = async (id: LayerId, layerConf: LayerConfAnyId, isVisible: boolean = true) => {
    const style = await layerConf.style()
    const layers: ExtendedAnyLayer[] = style.layers
    const sourceKeys = Object.keys(style.sources)

    const layerGroup: any = {}

    const newLayerOptions: LayerOpts = {}

    // After addings the layers using style, find them and add them to the layerGroup
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
              newLayerOptions[layerKeys[0]] = layerOpt
            } else {
              console.error('Could not find layer configuration for layer: ' + layerKeys[0])
            }
          }
        })

      const layerGroupsCopy = { ...layerGroups, [id]: layerGroup }
      setLayerGroups(layerGroupsCopy)

      const layerOptionsCopy = { ...layerOptions, ...newLayerOptions }
      setLayerOptions(layerOptionsCopy)

      if (isVisible) {
        const activeLayerGroupIdsCopy = [...activeLayerGroupIds, id]
        setActiveLayerGroupIds(activeLayerGroupIdsCopy)
      } else {
        for (const layer in layerGroup) {
          layerGroup[layer].setVisible(false)
        }
      }

      if (layerConf.popup) {
        const popupsCopy = { ...popups, [id]: layerConf.popup }
        setPopups(popupsCopy)
      }
      // applyStyle(olLayer, { version: style.version, sources: style.sources, layers }, sourceKey).then((data) => {
      //   map.addLayer(olLayer)
      //   console.log(olLayer)
      //   console.log(map.getAllLayers())
      // })
    })
  }

  const addMbStyleToMb = async (id: LayerId, layerConf: LayerConfAnyId, isVisible: boolean = true) => {
    const style = await layerConf.style()

    try {
      for (const sourceKey in style.sources) {
        mbMapRef.current?.addSource(sourceKey, style.sources[sourceKey])
      }

      const layerOptionsCopy = { ...layerOptions }
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
        }

        assertValidHighlightingConf(layerOpt, style.layers)

        layerOptionsCopy[layerOpt.id] = layerOpt
        layerGroup[layer.id] = layer

        mbMapRef.current?.addLayer(layer)

        if (isVisible) {
          mbMapRef.current?.setLayoutProperty(layer.id, 'visibility', 'visible')
        } else {
          mbMapRef.current?.setLayoutProperty(layer.id, 'visibility', 'none')
        }
      }

      if (isVisible) {
        const activeLayerGroupIdsCopy = [...activeLayerGroupIds, id]
        setActiveLayerGroupIds(activeLayerGroupIdsCopy)

        setLayerOptions(layerOptionsCopy)

        const layerGroupsCopy = { ...layerGroups, [id]: layerGroup }
        setLayerGroups(layerGroupsCopy)
      }
    } catch (e: any) {
      if (!e.message.includes('There is already a source')) {
        console.error(e)
      }
    }

    // if (layerConf.popup) {
    //   mbMapRef.current?.on('click', (e: MapLayerMouseEvent) => {
    //     // Set `bbox` as 5px reactangle area around clicked point.
    //     // Find features intersecting the bounding box.
    //     // @ts-ignore
    //     const point = mbMapRef.current.project(e.lngLat)
    //     const selectedFeatures = mbMapRef.current.queryRenderedFeatures(point, {
    //       layers: [
    //         'fi_forests_country-fill',
    //         'fi_forests_region-fill',
    //         'fi_forests_municipality-fill',
    //         'fi_forests_estate-fill',
    //         'fi_forests_parcel-fill',
    //       ],
    //     })
    //     console.log(selectedFeatures)
    //     const ids = selectedFeatures.map((feature: any) => feature.properties.id)
    //     // Set a filter matching selected features by FIPS codes
    //     // to activate the 'counties-highlighted' layer.
    //     // mbMapRef.current.setFilter('counties-highlighted', ['in', 'FIPS', ...fips])
    //   })
    //   mbMapRef.current?.on('mouseenter', function () {
    //     mbMapRef.current.getCanvas().style.cursor = 'pointer'
    //   })
    //   mbMapRef.current?.on('mouseleave', function () {
    //     mbMapRef.current.getCanvas().style.cursor = ''
    //   })
    // }
  }

  const getSourceJson = (id: string) => {
    try {
      //@ts-ignore
      const geojson = mbMapRef.current?.getSource(id)._options.data
      return geojson
    } catch (e) {
      console.error(e)
    }
  }

  // ensures that latest state is used in the callback
  const addToFunctionQueue = (funcName: string, args: any[], priority = QueuePriority.LOW): Promise<any> => {
    // construct a promise that will be manually resolved when the function is called
    let promiseResolve: any, promiseReject: any
    const promise = new Promise((resolve, reject) => {
      promiseResolve = resolve
      promiseReject = reject
    })

    setFunctionQueue((prevQueue) => [
      ...prevQueue,
      { func: funcName, args: args, priority: priority, promise: { resolve: promiseResolve, reject: promiseReject } },
    ])

    return promise
  }

  const enableLayerGroup = async (layerId: LayerId, layerConf?: LayerConf) => {
    if (layerGroups[layerId]) {
      setGroupVisibility(layerId, true)

      const activeLayerGroupIdsCopy = [...activeLayerGroupIds, layerId]
      setActiveLayerGroupIds(activeLayerGroupIdsCopy)
    } else {
      if (!isLoaded) {
        return addToFunctionQueue('enableLayerGroup', [layerId, layerConf], QueuePriority.HIGH)
      }

      // Initialize layer if it doesn't exist
      let conf = layerConf

      if (!conf) {
        conf = layerConfs.find((el: LayerConfAnyId) => {
          return el.id === layerId
        })
      }

      if (conf) {
        if (conf.useMb) {
          await addMbStyleToMb(layerId, conf)
        } else {
          await addMbStyle(layerId, conf)
        }
      } else {
        console.error('No layer config found for id: ' + layerId)
      }
    }
  }

  const disableLayerGroup = async (layerId: LayerId) => {
    const activeLayerGroupIdsCopy = [...activeLayerGroupIds]
    activeLayerGroupIdsCopy.splice(activeLayerGroupIdsCopy.indexOf(layerId), 1)

    setActiveLayerGroupIds(activeLayerGroupIdsCopy)
    setGroupVisibility(layerId, false)
  }

  const toggleLayerGroup = async (layerId: LayerId, layerConf?: LayerConf) => {
    if (activeLayerGroupIds.includes(layerId)) {
      disableLayerGroup(layerId)
    } else {
      enableLayerGroup(layerId, layerConf)
    }
  }

  // these are used used for layers with dynamic ids
  const toggleAnyLayerGroup = async (layerIdString: string, layerConf?: LayerConfAnyId) => {
    // @ts-ignore
    toggleLayerGroup(layerIdString as LayerId, layerConf)
  }

  const enableAnyLayerGroup = async (layerIdString: string, layerConf?: LayerConfAnyId) => {
    // @ts-ignore
    enableLayerGroup(layerIdString as LayerId, layerConf)
  }

  const disableAnyLayerGroup = async (layerIdString: string) => {
    disableLayerGroup(layerIdString as LayerId)
  }

  const setLayoutProperty = async (layer: string, name: string, value: any): Promise<any> => {
    if (!isLoaded) {
      return addToFunctionQueue('setLayoutProperty', [layer, name, value])
    }
    mbMapRef.current?.setLayoutProperty(layer, name, value)
  }

  const setPaintProperty = async (layer: string, name: string, value: any): Promise<any> => {
    if (!isLoaded) {
      return addToFunctionQueue('setPaintProperty', [layer, name, value])
    }
    mbMapRef.current?.setPaintProperty(layer, name, value)
  }

  const setFilter = async (layer: string, filter: any[]): Promise<any> => {
    if (!isLoaded) {
      return addToFunctionQueue('setFilter', [layer, filter])
    }
    mbMapRef.current?.setFilter(layer, filter)
  }

  const setOverlayMessage = async (condition: boolean, message: OverlayMessage) => {
    _setOverlayMessage(condition ? message : null)
  }

  const fitBounds = (bbox: number[], lonExtra: number, latExtra: number): Promise<any> => {
    if (!isLoaded) {
      return addToFunctionQueue('fitBounds', [bbox, lonExtra, latExtra])
    }

    const flyOptions = {}
    const [lonMin, latMin, lonMax, latMax] = bbox
    const lonDiff = lonMax - lonMin
    const latDiff = latMax - latMin
    mbMapRef.current?.fitBounds(
      [
        [lonMin - lonExtra * lonDiff, latMin - latExtra * latDiff],
        [lonMax + lonExtra * lonDiff, latMax + latExtra * latDiff],
      ],
      flyOptions
    )

    return Promise.resolve()
  }

  const setIsDrawPolygon = (enabled: boolean) => {
    if (!isLoaded) {
      addToFunctionQueue('setIsDrawPolygon', [enabled])
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
    const source = cloneDeep(mbMapRef.current?.getStyle().sources[sourceName])

    mbMapRef.current?.removeLayer('carbon-shapes-outline')
    mbMapRef.current?.removeLayer('carbon-shapes-fill')
    mbMapRef.current?.removeLayer('carbon-shapes-sym')
    mbMapRef.current?.removeSource(sourceName)

    // console.log(source.data.features)
    mbMapRef.current?.addControl(draw, 'bottom-right')

    //@ts-ignore
    draw.add(source.data)

    setDraw(draw)
    setIsDrawEnabled(true)
  }

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

  const values: IMapContext = {
    isLoaded,
    setMapLibraryMode,
    activeLayerGroupIds,
    layerGroups,
    mapToggleTerrain,
    mapResetNorth,
    getGeocoder,
    mapRelocate,
    mapZoomIn,
    mapZoomOut,
    toggleLayerGroup,
    enableLayerGroup,
    disableLayerGroup,
    toggleAnyLayerGroup,
    enableAnyLayerGroup,
    disableAnyLayerGroup,
    getSourceJson,
    selectedFeatures,
    setLayoutProperty,
    setPaintProperty,
    setFilter,
    setOverlayMessage,
    fitBounds,
    isDrawEnabled,
    setIsDrawEnabled,
    setIsDrawPolygon,
    // enableGroup,
    // setFilter,
    // AddMapEventHandler,
    // isSourceReady,
    // removeMapEventHandler,
    // enablePersonalDataset,
    // disablePersonalDataset,

    // genericPopupHandler,
    // querySourceFeatures,
    // setLayoutProperty,
    // setPaintProperty,
  }

  return (
    <MapContext.Provider value={values}>
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
      <MapPopup onClose={popupOnClose} ref={popupRef}>
        {popupElement}
      </MapPopup>
      <OverlayMessages message={overlayMessage}></OverlayMessages>
      {children}
    </MapContext.Provider>
  )
}
