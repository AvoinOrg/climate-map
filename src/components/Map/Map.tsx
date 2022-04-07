import 'ol/ol.css'
import React, { useContext, createContext, useState, useRef, useEffect } from 'react'
import { Map, View } from 'ol'
import olms from 'ol-mapbox-style'

interface Props {
  children: any
  zoom: number
  center: [number, number]
}

interface IMapContext {
  map?: Map
  mapToggleTerrain?: () => void
  mapResetNorth?: () => void
  getGeocoder?: () => any
  mapRelocate?: () => void
  mapZoomIn?: () => void
  mapZoomOut?: () => void
  activeLayers?: any[]
  layerGroups?: any[]
}

const MapContext = createContext<IMapContext>({})

export const MapProvider = ({ children, zoom, center }: Props) => {
  const [map, setMap] = useState<Map>(null)
  const [activeLayers, setActiveLayers] = useState<any[]>([])
  const [layerGroups, setLayerGroups] = useState<any[]>([])
  const mapRef = useRef()

  useEffect(() => {
    const options = {
      view: new View({ zoom, center }),
      layers: [] as any[],
      controls: [] as any[],
      overlays: [] as any[],
    }
    const mapObject = new Map(options)

    mapObject.setTarget(mapRef.current)

    setMap(mapObject)
    return () => mapObject.setTarget(undefined)
  }, [])

  useEffect(() => {
    if (!map) return
    map.getView().setZoom(zoom)
  }, [zoom])

  useEffect(() => {
    if (!map) return
    map.getView().setCenter(center)
  }, [center])

  // TODO ZONE
  const getGeocoder = () => {}
  const mapRelocate = () => {}
  const mapResetNorth = () => {}
  const mapToggleTerrain = () => {}
  const mapZoomIn = () => {}
  const mapZoomOut = () => {}

  // use REDUX for these?
  const enableGroup = () => {}
  const disableGroup = () => {}
  const eetGroupState = () => {}
  const toggleGroup = () => {}
  const enableOnlyOneGroup = () => {}
  const isGroupEnable = () => {}

  const values = {
    map,
    mapToggleTerrain,
    mapResetNorth,
    getGeocoder,
    mapRelocate,
    mapZoomIn,
    mapZoomOut,
    activeLayers,
    layerGroups,
    enableGroup,
  }

  return (
    <MapContext.Provider value={values}>
      <div ref={mapRef} id="map" className="ol-map"></div>
      {children}
    </MapContext.Provider>
  )
}

export default MapContext
