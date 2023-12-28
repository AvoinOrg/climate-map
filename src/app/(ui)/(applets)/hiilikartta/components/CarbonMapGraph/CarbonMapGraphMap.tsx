import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { Box, Button, ButtonGroup, Typography } from '@mui/material'
import turfBbox from '@turf/bbox'

import { CalcFeatureCollection } from 'applets/hiilikartta/common/types'
import {
  addPaddingToLngLatBounds,
  getCombinedBoundsInLngLat,
} from '#/common/utils/gis'

type Props = {
  datas: {
    id: string
    name: string
    data: CalcFeatureCollection
  }[]
  activeYear: number
  activeDataId: string
  setActiveDataId: (dataName: string) => void
}

const CarbonMapGraphMap = ({
  datas,
  activeYear,
  activeDataId,
  setActiveDataId,
}: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapIsLoaded, setMapIsLoaded] = useState(false)
  const sourceIds = useRef<string[]>([])

  useEffect(() => {
    // Ensure mapboxgl.accessToken is set
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string

    if (map.current) return // Initialize the map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v11', // Specify the map style
      center: [0, 0], // Specify the initial map center coordinates
      zoom: 2, // Specify the initial zoom level
    })

    map.current.on('load', () => {
      setMapIsLoaded(true)
    })

    return () => {
      map.current?.remove() // Clean up the map instance on unmount
    }
  }, [])

  useEffect(() => {
    if (mapIsLoaded) {
      const bounds = getCombinedBoundsInLngLat(datas.map((data) => data.data))

      if (bounds) {
        const paddedBounds = addPaddingToLngLatBounds(bounds, 1)
        map.current?.setMaxBounds(paddedBounds)
        map.current?.fitBounds(bounds, {
          padding: 20,
        })
      }
    }
  }, [datas, mapIsLoaded])

  useEffect(() => {
    if (mapIsLoaded) {
      // Remove old GeoJSON data
      const dataIds = datas.map((data) => data.id)
      sourceIds.current.forEach((sourceId) => {
        if (!dataIds.includes(sourceId)) {
          map.current!.removeLayer(`carbon-graph-layer-${sourceId}`)
          map.current!.removeSource(`carbon-graph-source-${sourceId}`)
        }
      })

      // Show only the active GeoJSON data on the map
      datas.forEach((data) => {
        const sourceId = `carbon-graph-source-${data.id}`
        const layerId = `carbon-graph-layer-${data.id}`

        if (map.current!.getSource(sourceId)) {
          if (data.id === activeDataId) {
            map.current!.setLayoutProperty(layerId, 'visibility', 'visible')
            ;(
              map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource
            ).setData(data.data)
          } else {
            map.current!.setLayoutProperty(layerId, 'visibility', 'none')
          }
        } else {
          map.current!.addSource(sourceId, {
            type: 'geojson',
            data: data.data,
          })

          map.current!.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            layout: {
              visibility: data.id === activeDataId ? 'visible' : 'none',
            },
            paint: {
              'fill-color': '#888', // Customize the fill color
              'fill-opacity': 0.4, // Customize the fill opacity
            },
          })
        }
      })
    }
  }, [activeYear, mapIsLoaded, activeDataId, datas])

  return (
    <Box
      style={{
        height: '400px',
        width: '100%',
        position: 'relative',
      }}
    >
      <Box ref={mapContainer} style={{ height: '100%', width: '100%' }} />

      {/* UI for selecting GeoJSON data */}
      <Box
        sx={{
          position: 'absolute',
          top: '0.75rem',
          left: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none',
        }}
      >
        {datas.map((data) => (
          <Button
            sx={{
              borderRadius: '0.3125rem',
              border: 'none',
              color: 'neutral.darker',
              pointerEvents: 'auto',
              backgroundColor: 'neutral.lighter',
              opacity: 0.85,
              mb: '0.5rem',
              maxWidth: '200px',
              display: 'flex',
              justifyContent: 'flex-start',
              height: '1.75rem',
              '&:hover': {
                opacity: 0.95,
                backgroundColor: 'neutral.lighter',
              },
              ...(data.id === activeDataId && {
                border: '1px solid',
                borderColor: 'secondary.dark',
                color: 'secondary.dark',
              }),
            }}
            key={data.id}
            onClick={() => setActiveDataId(data.id)}
          >
            <Typography
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                typography: 'body2',
                letterSpacing: 'normal',
                fontSize: '0.75rem',
                lineHeight: 'normal',
              }}
            >
              {data.name}
            </Typography>
          </Button>
        ))}
      </Box>
    </Box>
  )
}

export default CarbonMapGraphMap
