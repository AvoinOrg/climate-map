import 'ol/ol.css'
import React, { useContext, createContext, useState, useRef, useEffect } from 'react'
import { Map, View } from 'ol'
import olms from 'ol-mapbox-style'

interface Props {
  children: any
  zoom: number
  center: [number, number]
}

const MapContext = createContext({})

export const MapProvider = ({ children, zoom, center }: Props) => {
  const [map, setMap] = useState<Map>(null)
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

  const values = {
    map,
    // profileMessage,
    // setProfileMessage,
  }

  return (
    <MapContext.Provider value={values}>
      <div ref={mapRef} className="ol-map"></div>
      {children}
    </MapContext.Provider>
  )
}

export default MapContext
