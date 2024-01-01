import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import {
  Box,
  Button,
  ButtonGroup,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { cloneDeep } from 'lodash-es'

import DropDownSelectMinimal from '#/components/common/DropDownSelectMinimal'
import {
  addPaddingToLngLatBounds,
  getCombinedBoundsInLngLat,
} from '#/common/utils/gis'

import { ZONING_CODE_COL } from 'applets/hiilikartta/common/types'
import {
  CalcFeature,
  CalcFeatureCollection,
  CalcFeatureProperties,
} from 'applets/hiilikartta/common/types'
import {
  getCarbonChangeColorForProperties,
  isZoningClassValidExpression,
} from 'applets/hiilikartta/common/utils'

type Data = {
  id: string
  name: string
  data: CalcFeatureCollection
}

type Props = {
  datas: Data[]
  activeYear: string
  featureYears: string[]
  setActiveYear: (year: string) => void
  activeDataId: string
  setActiveDataId: (dataName: string) => void
}

const CarbonMapGraphMap = ({
  datas,
  activeYear,
  featureYears,
  setActiveYear,
  activeDataId,
  setActiveDataId,
}: Props) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapIsLoaded, setMapIsLoaded] = useState(false)
  const [localDatas, setLocalDatas] = useState<Data[]>([])
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
    setLocalDatas(cloneDeep(datas))
  }, [datas])

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
      const dataIds = localDatas.map((data) => data.id)
      sourceIds.current.forEach((sourceId) => {
        if (!dataIds.includes(sourceId)) {
          map.current!.removeLayer(`carbon-graph-layer-${sourceId}`)
          map.current!.removeSource(`carbon-graph-source-${sourceId}`)
        }
      })

      // Show only the active GeoJSON data on the map
      const updatedDatas = updateDataWithColor(localDatas, activeYear)

      updatedDatas.forEach((data) => {
        const sourceId = `carbon-graph-source-${data.id}`
        const layerId = `carbon-graph-layer-${data.id}`

        if (map.current!.getSource(sourceId)) {
          ;(map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(
            data.data
          )

          if (data.id === activeDataId) {
            map.current!.setLayoutProperty(layerId, 'visibility', 'visible')
            map.current!.setLayoutProperty(
              `${layerId}-symbol`,
              'visibility',
              'visible'
            )
            map.current!.setPaintProperty(layerId, 'fill-color', [
              'get',
              'color',
            ])
          } else {
            map.current!.setLayoutProperty(layerId, 'visibility', 'none')
            map.current!.setLayoutProperty(
              `${layerId}-symbol`,
              'visibility',
              'none'
            )
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
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.9,
              'fill-outline-color': '#274AFF',
            },
          })

          map.current!.addLayer({
            id: `${layerId}-symbol`,
            source: sourceId,
            type: 'symbol',
            layout: {
              'symbol-placement': 'point',
              'text-size': 20,
              'text-font': ['Open Sans Regular'],
              'text-field': [
                'case',
                isZoningClassValidExpression(),
                ['get', ZONING_CODE_COL],
                '!',
              ],
            },
            paint: {
              'text-color': 'black',
              'text-halo-blur': 1,
              'text-halo-color': 'rgb(242,243,240)',
              'text-halo-width': 2,
            },
            minzoom: 12,
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

      <Box
        sx={{
          position: 'absolute',
          bottom: '0.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000, // ensure it's above the map layers
          height: '2rem',
          backgroundColor: 'neutral.lighter',
          borderRadius: '1rem',
          opacity: 0.85,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pl: 2,
          pr: 2,
        }}
      >
        <DropDownSelectMinimal
          value={activeYear}
          options={featureYears.map((year) => ({
            label: year,
            value: year,
          }))}
          onChange={(event) => setActiveYear(event.target.value as string)}
        ></DropDownSelectMinimal>
      </Box>

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

const updateDataWithColor = (datas: Data[], year: string) => {
  return datas.map((data) => {
    const updatedFeatures = data.data.features.map((feature) => {
      const color = getCarbonChangeColorForProperties(feature.properties, year)
      return { ...feature, properties: { ...feature.properties, color } }
    })

    return { ...data, data: { ...data.data, features: updatedFeatures } }
  })
}

export default CarbonMapGraphMap
