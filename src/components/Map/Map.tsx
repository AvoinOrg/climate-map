import 'ol/ol.css'
import React, { createContext, useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import { fromLonLat } from 'ol/proj'
import { Map, View } from 'ol'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
import { OSM, Vector as VectorSource } from 'ol/source'
import { Attribution, ScaleLine, defaults as defaultControls } from 'ol/control'
import olms from 'ol-mapbox-style'
import { Style } from 'mapbox-gl'

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
  toggleLayer?: (layer: string, style: Style) => void
  activeLayers?: string[]
  layerGroups?: {}
  registerGroup?: (layerGroup: any) => void
  addMbStyle?: (style: any) => void
}

const MapContext = createContext<IMapContext>({ isLoaded: false })

export const MapProvider = ({ children }: Props) => {
  const [map, setMap] = useState<Map>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeLayers, setActiveLayers] = useState<any[]>([])
  const [layers, setLayers] = useState<any>({})
  const [sources, setSources] = useState<any>({})
  const mapRef = useRef()

  const attribution = new Attribution({
    collapsible: false,
  })

  useEffect(() => {
    const options = {
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
      overlays: [] as any[],
    }

    const mapObject = new Map(options)

    mapObject.setTarget(mapRef.current)

    setMap(mapObject)
    return () => mapObject.setTarget(undefined)
  }, [])

  useEffect(() => {
    if (map) {
      setIsLoaded(true)
    }
  }, [map])

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

  const addMbStyle = (style: any, isVisible: boolean = true) => {
    const sourceKey = Object.entries(style.sources)[0][0]
    olms(map, style).then((map) => {
      map
        .getLayers()
        .getArray()
        .forEach((layer: any) => {
          if (layer.values_['mapbox-source'] && layer.values_['mapbox-source'] === sourceKey) {
            const layersCopy = { ...layers, [sourceKey]: layer }
            setLayers(layersCopy)

            if (isVisible) {
              const activeLayersCopy = [...activeLayers, sourceKey]
              setActiveLayers(activeLayersCopy)
            } else {
              layer.setVisible(false)
            }
          }
        })
      // applyStyle(olLayer, { version: style.version, sources: style.sources, layers }, sourceKey).then((data) => {
      //   map.addLayer(olLayer)
      //   console.log(olLayer)
      //   console.log(map.getAllLayers())
      // })
    })
  }
  const toggleLayer = (layerName: string, style?: Style) => {
    if (activeLayers.includes(layerName)) {
      const activeLayersCopy = [...activeLayers]
      activeLayersCopy.splice(activeLayers.indexOf(layerName), 1)

      setActiveLayers(activeLayersCopy)
      layers[layerName].setVisible(false)
    } else {
      if (layers[layerName]) {
        layers[layerName].setVisible(true)

        const activeLayersCopy = [...activeLayers, layerName]
        setActiveLayers(activeLayersCopy)
      } else if (style) {
        addMbStyle(style)
      } else {
        console.error('Layer not initialized: ' + layerName)
      }
    }
  }

  const addMbLayer = (layer: any) => {}

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
    activeLayers,
    mapToggleTerrain,
    mapResetNorth,
    getGeocoder,
    mapRelocate,
    mapZoomIn,
    mapZoomOut,
    enableGroup,
    addMbStyle,
    toggleLayer,
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
