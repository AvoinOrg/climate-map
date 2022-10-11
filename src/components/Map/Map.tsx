import 'ol/ol.css'
import React, { createContext, useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import { fromLonLat } from 'ol/proj'
import { Map, View } from 'ol'
import { unByKey } from 'ol/Observable'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import Overlay from 'ol/Overlay'
import { OSM, Vector as VectorSource } from 'ol/source'
import { Attribution, ScaleLine, defaults as defaultControls } from 'ol/control'
import olms from 'ol-mapbox-style'
import { Style as MbStyle } from 'mapbox-gl'
import { Style } from 'ol/style'
import { sanitize } from 'dompurify'

import { LayerId, LayerConf } from 'Types/map'
import layerConfs from './Layers/layers'

interface Props {
  children: any
}

interface IMapContext {
  isLoaded: boolean
  map?: Map
  mapToggleTerrain?: () => void
  mapResetNorth?: () => void
  getGeocoder?: () => any
  mapRelocate?: () => void
  mapZoomIn?: () => void
  mapZoomOut?: () => void
  toggleLayerGroup?: (layer: string) => void
  activeLayerGroups?: string[]
  layerGroups?: {}
  registerGroup?: (layerGroup: any) => void
  // addMbStyle?: (style: any) => void
}

const MapContext = createContext<IMapContext>({ isLoaded: false })

export const MapProvider = ({ children }: Props) => {
  const [map, setMap] = useState<Map>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeLayerGroups, setActiveLayerGroups] = useState<any[]>([])
  const [layerGroups, setLayerGroups] = useState<any>({})
  const [popupFuncs, setPopupFuncs] = useState<any>({})
  const [popup, setPopup] = useState<any>(null)
  const [popupFuncKey, setPopupFuncKey] = useState<any>(null)

  const mapRef = useRef()

  const attribution = new Attribution({
    collapsible: false,
  })

  useEffect(() => {
    const options = {
      rendered: 'webgl',
      view: new View({ zoom: 5, center: fromLonLat([15, 62]) }),
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource({
            attributions: '© Powered by <a href="https://www.netlify.com/" target="_blank">Netlify</a>',
          }),
        }),
      ],
      controls: defaultControls({ attribution: false }).extend([attribution, new ScaleLine()]),
    }

    const mapObject = new Map(options)

    mapObject.setTarget(mapRef.current)

    setMap(mapObject)
    return () => mapObject.setTarget(undefined)
  }, [])

  useEffect(() => {
    if (isLoaded === false && map) {
      setIsLoaded(true)

      const popupContainer = document.createElement('div')
      popupContainer.innerHTML = `
          <div id="popup" class="ol-popup">
              <a href="#" id="popup-closer" class="ol-popup-closer"></a>
              <div id="popup-content"></div>
          </div>
      `
      document.body.appendChild(popupContainer)

      const content = document.getElementById('popup-content') as HTMLElement
      const closer = document.getElementById('popup-closer') as HTMLElement

      const overlay = new Overlay({
        element: popupContainer,
        autoPan: true,
        autoPanAnimation: {
          duration: 250,
        },
      })

      closer.onclick = () => {
        overlay.setPosition(undefined)
        closer.blur()
        return false
      }

      const popup = { content, closer, overlay }
      setPopup(popup)

      map.addOverlay(overlay)
    }
  }, [map])

  useEffect(() => {
    if (isLoaded) {
      // remove the old callback and create a new one each time state is updated
      unByKey(popupFuncKey)

      const newPopupFunc = (evt: any) => {
        let featureObjs: any[] = []

        map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
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

          const featureObj = featureObjs[0]
          const popupFunc = popupFuncs[featureObj.layer.get('group')]

          if (popupFunc != null) {
            const html = popupFunc(featureObj.feature)

            createPopup(evt.coordinate, html)
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

      const newPopupFuncKey = map.on('singleclick', newPopupFunc)

      setPopupFuncKey(newPopupFuncKey)
    }
  }, [activeLayerGroups, map, isLoaded, popupFuncs])

  const createPopup = (coords: any, html: string) => {
    popup.overlay.setPosition(coords)
    popup.content.innerHTML = sanitize(html)
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

    olms(map, style).then((map) => {
      map
        .getLayers()
        .getArray()
        .forEach((layer: any) => {
          const sourceKey = layer.get('mapbox-source')

          if (layer.get('mapbox-source') && sourceKeys.includes(sourceKey)) {
            layer.set('group', id)
            layerGroup[sourceKey] = layer
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
        const popupFuncsCopy = { ...popupFuncs, [id]: popupFunc }
        setPopupFuncs(popupFuncsCopy)
      }
      // applyStyle(olLayer, { version: style.version, sources: style.sources, layers }, sourceKey).then((data) => {
      //   map.addLayer(olLayer)
      //   console.log(olLayer)
      //   console.log(map.getAllLayers())
      // })
    })
  }
  const toggleLayerGroup = (layerId: LayerId) => {
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
        const layerConf = layerConfs.find((el: LayerConf) => {
          return el.id === layerId
        })
        if (layerConf) {
          addMbStyle(layerId, layerConf.style, layerConf.popupFunc)
        } else {
          console.error('No layer config found for id: ' + layerId)
        }
      }
    }
  }

  // use REDUX for these?
  const enableGroup = () => {}
  const disableGroup = () => {}
  const eetGroupState = () => {}
  const toggleGroup = () => {}
  const enableOnlyOneGroup = () => {}
  const isGroupEnable = () => {}

  const values = {
    map,
    isLoaded,
    activeLayerGroups,
    mapToggleTerrain,
    mapResetNorth,
    getGeocoder,
    mapRelocate,
    mapZoomIn,
    mapZoomOut,
    enableGroup,
    toggleLayerGroup,
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
      {children}
    </MapContext.Provider>
  )
}

export default MapContext
