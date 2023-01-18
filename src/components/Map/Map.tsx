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

import { LayerId, LayerConf, LayerOpt, LayerOpts, layerTypes, LayerType, ExtendedAnyLayer } from '#/types/map'
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
  toggleLayerGroup: (layer: LayerId, layerConf?: LayerConf) => Promise<void> | null
  enableLayerGroup: (layer: LayerId, layerConf?: LayerConf) => Promise<void> | null
  disableLayerGroup: (layer: LayerId) => Promise<void> | null
  activeLayerGroupIds: string[]
  layerGroups: {} | null
  registerGroup?: (layerGroup: any) => void | null
  addJSONLayer?: (id: string, groupId: string, json: any, projection: string) => void | null
  selectedFeatures: MapboxGeoJSONFeature[]
  // addMbStyle?: (style: any) => void
}

export const MapContext = createContext({ isLoaded: false } as IMapContext)

export const MapProvider = ({ children }: Props) => {
  const mapRef = useRef<HTMLDivElement>()
  const [map, setMap] = useState<Map | null>(null)
  const [mbMap, setMbMap] = useState<mapboxgl.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeLayerGroupIds, setActiveLayerGroupIds] = useState<string[]>([])
  const [layerGroups, setLayerGroups] = useState<any>({})
  const [layerOptions, setLayerOptions] = useState<LayerOpts>({})
  const [functionQueue, setFunctionQueue] = useState<any[]>([])

  const popupRef = useRef<HTMLDivElement>(null)
  const [popups, setPopups] = useState<any>({})
  const [popupOverlay, setPopupOverlay] = useState<any>(null)
  const [popupOnClose, setPopupOnClose] = useState<any>(null)
  const [popupKey, setPopupKey] = useState<any>(null)
  const [popupElement, setPopupElement] = useState<React.ReactNode | null>(null)

  const [selectedFeatures, setSelectedFeatures] = useState<MapboxGeoJSONFeature[]>([])
  const [newlySelectedFeatures, setNewlySelectedFeatures] = useState<MapboxGeoJSONFeature[]>([])

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
      interactive: true,
      keyboard: false,
      pitchWithRotate: false,
      scrollZoom: false,
      touchZoomRotate: false,
      style: emptyStyle,
    })

    const mbSelectionFunction = (e: MapLayerMouseEvent) => {
      // Set `bbox` as 5px reactangle area around clicked point.
      // Find features intersecting the bounding box.
      // @ts-ignore
      const point = mbMap.project(e.lngLat)

      const features = mbMap.queryRenderedFeatures(point)

      setNewlySelectedFeatures(features)
    }

    mbMap.on('click', mbSelectionFunction)

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
          center: proj.toLonLat(viewState.center) as [number, number],
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
      view: new View({ zoom: 5, center: proj.fromLonLat(center) }),
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

      const newPopupFunc = (evt: MapBrowserEvent<any>) => {
        let point = map?.getCoordinateFromPixel(evt.pixel)

        if (point != undefined) {
          point = proj.toLonLat(point)
          console.log(point)
          mbMap?.fire('click', {
            lngLat: point as mapboxgl.LngLatLike,
          })
        }

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
  }, [activeLayerGroupIds, map, isLoaded, popups])

  useEffect(() => {
    const filterSelectedFeatures = (
      layerOptions: LayerOpts,
      selectedFeatures: MapboxGeoJSONFeature[],
      newlySelectedFeatures: MapboxGeoJSONFeature[]
    ) => {
      const selectableLayers = Object.keys(
        _.pickBy(layerOptions, (value, _key) => {
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

      selectedLayerIds = _.uniq(selectedLayerIds)

      for (const id of selectedLayerIds) {
        const featureIds = selectedFeaturesCopy
          .filter((f) => f.layer.id === id)
          .map((feature) => {
            return feature.id
          })

        mbMap?.setFilter(getLayerName(id) + '-highlighted', ['in', 'id', ...featureIds])
      }

      setSelectedFeatures(selectedFeaturesCopy)
    }
  }, [newlySelectedFeatures, selectedFeatures, layerOptions, activeLayerGroupIds, layerGroups])

  useEffect(() => {
    // Run queued function once map has loaded
    if (isLoaded && functionQueue.length > 0) {
      setFunctionQueue([])
      functionQueue.forEach((call) => {
        // @ts-ignore
        values[call.func](...call.args)
      })
    }
  }, [isLoaded, functionQueue])

  useEffect(() => {
    if (isLoaded) {
      let activeLayerIds: string[] = []

      for (const layerGroupId of activeLayerGroupIds) {
        const layerGroupLayers = layerGroups[layerGroupId]

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
        mbMap?.setLayoutProperty(layer, 'visibility', isVisible ? 'visible' : 'none')
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

  const addMbStyle = async (id: LayerId, layerConf: LayerConf, isVisible: boolean = true) => {
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

  const addMbStyleToMb = async (id: LayerId, layerConf: LayerConf, isVisible: boolean = true) => {
    const style = await layerConf.style()

    for (const sourceKey in style.sources) {
      mbMap?.addSource(sourceKey, style.sources[sourceKey])
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

      mbMap?.addLayer(layer)

      if (isVisible) {
        mbMap?.setLayoutProperty(layer.id, 'visibility', 'visible')
      } else {
        mbMap?.setLayoutProperty(layer.id, 'visibility', 'none')
      }
    }

    if (isVisible) {
      const activeLayerGroupIdsCopy = [...activeLayerGroupIds, id]
      setActiveLayerGroupIds(activeLayerGroupIdsCopy)
    }

    setLayerOptions(layerOptionsCopy)

    const layerGroupsCopy = { ...layerGroups, [id]: layerGroup }
    setLayerGroups(layerGroupsCopy)

    // if (layerConf.popup) {
    //   mbMap?.on('click', (e: MapLayerMouseEvent) => {
    //     // Set `bbox` as 5px reactangle area around clicked point.
    //     // Find features intersecting the bounding box.
    //     // @ts-ignore
    //     const point = mbMap.project(e.lngLat)
    //     const selectedFeatures = mbMap.queryRenderedFeatures(point, {
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
    //     // mbMap.setFilter('counties-highlighted', ['in', 'FIPS', ...fips])
    //   })
    //   mbMap?.on('mouseenter', function () {
    //     mbMap.getCanvas().style.cursor = 'pointer'
    //   })
    //   mbMap?.on('mouseleave', function () {
    //     mbMap.getCanvas().style.cursor = ''
    //   })
    // }
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

    //   const activeLayerGroupIdsCopy = [...activeLayerGroupIds, groupId]
    //   setActiveLayerGroupIds(activeLayerGroupIdsCopy)
  }

  const mapLoadCheck = (layerId: LayerId, layerConf?: LayerConf) => {
    // If map is not initialized, add function to queue
    if (!isLoaded) {
      const functionQueueCopy = [...functionQueue, { func: 'enableLayerGroup', args: [layerId, layerConf] }]
      setFunctionQueue(functionQueueCopy)
      return false
    }
    return true
  }

  const enableLayerGroup = async (layerId: LayerId, layerConf?: LayerConf) => {
    if (layerGroups[layerId]) {
      setGroupVisibility(layerId, true)

      const activeLayerGroupIdsCopy = [...activeLayerGroupIds, layerId]
      setActiveLayerGroupIds(activeLayerGroupIdsCopy)
    } else {
      if (!mapLoadCheck(layerId, layerConf)) {
        return
      }

      // Initialize layer if it doesn't exist
      let conf = layerConf

      if (!conf) {
        conf = layerConfs.find((el: LayerConf) => {
          return el.id === layerId
        })
      }

      if (conf) {
        if (conf.useMb) {
          addMbStyleToMb(layerId, conf)
        } else {
          addMbStyle(layerId, conf)
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
    addJSONLayer,
    selectedFeatures,

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
