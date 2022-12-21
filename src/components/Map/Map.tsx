'use client'

// This is the main Map component, exported as a context.
// Uses Openlayers with Mapbox GL added as a layer. This is due to the low performance of
// Openlayers as WebGL renderer, while Mapbox GL lacks a lot of features that Openlayers has.
// TODO: Look into Maplibre GL, which is a fork of Mapbox GL that is more open source friendly.
// See: https://github.com/geoblocks/ol-maplibre-layer

import 'ol/ol.css'
import _ from 'lodash'
import React, { createContext, useState, useRef, useEffect, useCallback } from 'react'
import Box from '@mui/material/Box'
import { Map, View } from 'ol'
import { unByKey } from 'ol/Observable'
import { Layer, Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import Overlay from 'ol/Overlay'
import OSM from 'ol/source/OSM'
import VectorSource from 'ol/source/Vector'
import { Attribution, ScaleLine, defaults as defaultControls } from 'ol/control'
import olms from 'ol-mapbox-style'
import { Style as MbStyle } from 'mapbox-gl'
// import GeoJSON from 'ol/format/GeoJSON'
import mapboxgl from 'mapbox-gl'
import { fromLonLat, toLonLat } from 'ol/proj'

import { LayerId, LayerConf } from '#/types/map'
import { layerConfs } from './Layers'
import { MapPopup } from './MapPopup'
import { getColorExpressionArrForValues } from '#/utils/mapUtils'

interface Props {
  children?: React.ReactNode
}

interface IMapContext {
  isLoaded: boolean
  map: Map | null
  mapToggleTerrain: () => void | null
  mapResetNorth: () => void | null
  getGeocoder: () => any | null
  mapRelocate: () => void | null
  mapZoomIn: () => void | null
  mapZoomOut: () => void | null
  toggleLayerGroup: (layer: LayerId) => Promise<void> | null
  activeLayerGroups: string[] | null
  layerGroups: {} | null
  registerGroup?: (layerGroup: any) => void | null
  addJSONLayer?: (id: string, groupId: string, json: any, projection: string) => void | null
  // addMbStyle?: (style: any) => void
}

export const MapContext = createContext({ isLoaded: false } as IMapContext)

export const MapProvider = ({ children }: Props) => {
  const mapRef = useRef<HTMLDivElement>()
  const [map, setMap] = useState<Map | null>(null)
  const [mbMap, setMbMap] = useState<mapboxgl.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeLayerGroups, setActiveLayerGroups] = useState<any[]>([])
  const [layerGroups, setLayerGroups] = useState<any>({})
  const [functionQueue, setFunctionQueue] = useState<any[]>([])

  const popupRef = useRef<HTMLDivElement>(null)
  const [popups, setPopups] = useState<any>({})
  const [popupOverlay, setPopupOverlay] = useState<any>(null)
  const [popupOnClose, setPopupOnClose] = useState<any>(null)
  const [popupKey, setPopupKey] = useState<any>(null)
  const [popupElement, setPopupElement] = useState<React.ReactNode | null>(null)

  useEffect(() => {
    // Mapbox does not render without a valid access token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string

    const center = [15, 62] as [number, number]

    const emptyStyle: MbStyle = {
      version: 8,
      name: 'Empty',
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

    const mbMap = new mapboxgl.Map({
      // style: 'mapbox://styles/mapbox/satellite-v9',
      attributionControl: false,
      boxZoom: false,
      center: center,
      container: 'map',
      doubleClickZoom: false,
      dragPan: false,
      dragRotate: false,
      interactive: false,
      keyboard: false,
      pitchWithRotate: false,
      scrollZoom: false,
      touchZoomRotate: false,
      style: emptyStyle,
    })

    const mbLayer = new Layer({
      render: function (frameState) {
        const canvas: any = mbMap.getCanvas()
        const viewState = frameState.viewState

        const visible = mbLayer.getVisible()
        canvas.style.display = visible ? 'block' : 'none'
        canvas.style.position = 'absolute'

        const opacity = mbLayer.getOpacity()
        canvas.style.opacity = opacity

        // adjust view parameters in mapbox
        const rotation = viewState.rotation
        mbMap.jumpTo({
          center: toLonLat(viewState.center) as [number, number],
          zoom: viewState.zoom - 1,
          bearing: (-rotation * 180) / Math.PI,
        })

        // cancel the scheduled update & trigger synchronous redraw
        // see https://github.com/mapbox/mapbox-gl-js/issues/7893#issue-408992184
        // NOTE: THIS MIGHT BREAK IF UPDATING THE MAPBOX VERSION
        //@ts-ignore
        if (mbMap._frame) {
          //@ts-ignore
          mbMap._frame.cancel()
          //@ts-ignore
          mbMap._frame = null
        } //@ts-ignore
        mbMap._render()

        return canvas
      },
    })

    const attribution = new Attribution({
      collapsible: false,
    })

    const options = {
      renderer: 'webgl',
      target: 'map',
      view: new View({ zoom: 5, center: fromLonLat(center) }),
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

    const mapObject = new Map(options)

    mapObject.setTarget(mapRef.current)

    setMap(mapObject)
    setMbMap(mbMap)

    return () => mapObject.setTarget(undefined)
  }, [])

  useEffect(() => {
    if (isLoaded === false && map) {
      setIsLoaded(true)

      // const popupContainer = document.createElement('div')
      // popupContainer.innerHTML = `
      //     <div id="popup" class="ol-popup">
      //         <a href="#" id="popup-closer" class="ol-popup-closer"></a>
      //         <div id="popup-content"></div>
      //     </div>
      // `
      // document.body.appendChild(popupContainer)

      // const content = document.getElementById('popup-content') as HTMLElement
      // const closer = document.getElementById('popup-closer') as HTMLElement

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

      map.addOverlay(overlay)
    }
  }, [map])

  useEffect(() => {
    if (isLoaded) {
      // remove the old callback and create a new one each time state is updated
      unByKey(popupKey)

      const newPopupFunc = (evt: any) => {
        let featureObjs: any[] = []

        map?.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
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

      const newpopupKey = map?.on('singleclick', newPopupFunc)

      setPopupKey(newpopupKey)
    }
  }, [activeLayerGroups, map, isLoaded, popups])

  useEffect(() => {
    // Run queued function once map has loaded
    if (isLoaded && functionQueue.length > 0) {
      setFunctionQueue([])
      functionQueue.forEach((call) => {
        // @ts-ignore
        values[call.func](...call.args)
      })
    }
  }, [isLoaded])

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
      layerGroup[layer].setVisible(isVisible)
    }
  }

  const addMbStyle = (id: LayerId, style: MbStyle, popupFunc?: any, isVisible: boolean = true) => {
    const sourceKeys = Object.keys(style.sources)

    const layerGroup: any = {}

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
            layer.set('group', id)
            layerGroup[layerKeys[0]] = layer
          }
        })

      const layerGroupsCopy = { ...layerGroups, [id]: layerGroup }
      setLayerGroups(layerGroupsCopy)

      if (isVisible) {
        const activeLayerGroupsCopy = [...activeLayerGroups, id]
        setActiveLayerGroups(activeLayerGroupsCopy)
      } else {
        for (const layer in layerGroup) {
          layerGroup[layer].setVisible(false)
        }
      }

      if (popupFunc) {
        const popupsCopy = { ...popups, [id]: popupFunc }
        setPopups(popupsCopy)
      }
      // applyStyle(olLayer, { version: style.version, sources: style.sources, layers }, sourceKey).then((data) => {
      //   map.addLayer(olLayer)
      //   console.log(olLayer)
      //   console.log(map.getAllLayers())
      // })
    })
  }

  const addGLStyle = (id: LayerId, style: any, popupFunc?: any, isVisible: boolean = true) => {
    for (const sourceKey in style.sources) {
      mbMap?.addSource(sourceKey, style.sources[sourceKey])
    }

    for (const layer of style.layers) {
      mbMap?.addLayer(layer)
    }
  }

  const addJSONLayer = (id: string, groupId: string, json: any, projection: string) => {
    const featureColorField = 'kt'
    // const vectorSource = new VectorSource({
    //   features: new GeoJSON().readFeatures(json, {
    //     featureProjection: projection,
    //   }),
    // })

    // const vectorLayer = new VectorLayer({
    //   source: vectorSource,
    //   // style: defaultVectorStyleFunction,
    // })

    // map.addLayer(vectorLayer)

    // const ktVals = ['uga', 'buga']

    // for (const i in ktVals) {
    //   const ktVal = ktVals[i]

    // }

    const uniqueVals = _.uniq(_.map(json.features, 'properties.' + featureColorField))
    const colorArr = getColorExpressionArrForValues(uniqueVals)

    mbMap?.addSource('carbon-shapes', {
      type: 'geojson',
      // Use a URL for the value for the `data` property.
      data: json,
    })
    mbMap?.addLayer({
      id: 'carbon-shapes-outline',
      type: 'line',
      source: 'carbon-shapes',
      paint: {
        'line-opacity': 0.9,
      },
    })

    mbMap?.addLayer({
      id: 'carbon-shapes-fill',
      type: 'fill',
      source: 'carbon-shapes', // reference the data source
      layout: {},
      paint: {
        'fill-color': ['match', ['get', featureColorField], ...colorArr, 'white'],
        'fill-opacity': 0.7,
      },
    })

    mbMap?.addLayer({
      id: `carbon-shapes-sym`,
      source: 'carbon-shapes',
      type: 'symbol',
      layout: {
        'symbol-placement': 'point',
        'text-size': 20,
        'text-font': ['Open Sans Regular'],
        'text-field': ['case', ['has', 'kt'], ['get', 'kt'], ''],
      },
      paint: {
        'text-color': '#999',
        'text-halo-blur': 1,
        'text-halo-color': 'rgb(242,243,240)',
        'text-halo-width': 2,
      },
      minzoom: 12,
    })

    //   let layerGroup: any = {}

    //   if (layerGroups[groupId]) {
    //     layerGroup = layerGroups[groupId]
    //   }

    //   layerGroup[id] = vectorLayer

    //   const layerGroupsCopy = { ...layerGroups, [groupId]: vectorLayer }
    //   setLayerGroups(layerGroupsCopy)

    //   const activeLayerGroupsCopy = [...activeLayerGroups, groupId]
    //   setActiveLayerGroups(activeLayerGroupsCopy)
  }

  const toggleLayerGroup = async (layerId: LayerId) => {
    // If map is not initialized, add function to queue
    if (!isLoaded) {
      const functionQueueCopy = [...functionQueue, { func: 'toggleLayerGroup', args: [layerId] }]
      setFunctionQueue(functionQueueCopy)
      return
    }

    if (activeLayerGroups.includes(layerId)) {
      const activeLayerGroupsCopy = [...activeLayerGroups]
      activeLayerGroupsCopy.splice(activeLayerGroupsCopy.indexOf(layerId), 1)

      setActiveLayerGroups(activeLayerGroupsCopy)
      setGroupVisibility(layerId, false)
    } else {
      if (layerGroups[layerId]) {
        setGroupVisibility(layerId, true)

        const activeLayerGroupsCopy = [...activeLayerGroups, layerId]
        setActiveLayerGroups(activeLayerGroupsCopy)
      } else {
        // Initialize layer if it doesn't exist
        const layerConf = layerConfs.find((el: LayerConf) => {
          return el.id === layerId
        })
        if (layerConf) {
          const style = await layerConf.style()
          if (layerConf.useGL) {
            addGLStyle(layerId, style, layerConf.popup)
          } else {
            addMbStyle(layerId, style, layerConf.popup)
          }
        } else {
          console.error('No layer config found for id: ' + layerId)
        }
      }
    }
  }

  // implement at some point
  // const setFilter = () => {}
  // const AddMapEventHandler = () => {}
  // const isSourceReady = () => {}
  // const removeMapEventHandler = () => {}
  // const enablePersonalDataset = () => {}
  // const disablePersonalDataset = () => {}

  // used in ForestArvometsa.tsx. Not all of these are needed
  // const fitBounds = () => {}
  // const genericPopupHandler = () => {}
  // const querySourceFeatures = () => {}
  // const setLayoutProperty = () => {}
  // const setPaintProperty = () => {}

  // use REDUX for these?
  // const enableGroup = () => {}
  // const disableGroup = () => {}
  // const eetGroupState = () => {}
  // const toggleGroup = () => {}
  // const enableOnlyOneGroup = () => {}
  // const isGroupEnable = () => {}

  const values: IMapContext = {
    isLoaded,
    map,
    activeLayerGroups,
    layerGroups,
    mapToggleTerrain,
    mapResetNorth,
    getGeocoder,
    mapRelocate,
    mapZoomIn,
    mapZoomOut,
    toggleLayerGroup,
    addJSONLayer,

    // enableGroup,
    // setFilter,
    // AddMapEventHandler,
    // isSourceReady,
    // removeMapEventHandler,
    // enablePersonalDataset,
    // disablePersonalDataset,

    // fitBounds,
    // genericPopupHandler,
    // querySourceFeatures,
    // setLayoutProperty,
    // setPaintProperty,
  }

  return (
    <MapContext.Provider value={values}>
      <Box
        ref={mapRef}
        id="map"
        className="ol-map"
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          '.ol-scale-line': { right: '8px', left: 'auto', bottom: '26px' },
        }}
      ></Box>
      <MapPopup onClose={popupOnClose} ref={popupRef}>
        {popupElement}
      </MapPopup>
      {children}
    </MapContext.Provider>
  )
}
