import React, { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import {
  Box,
  Button,
  styled,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  Table,
} from '@mui/material'
import { T, useTranslate } from '@tolgee/react'

import DropDownSelectMinimal from '#/components/common/DropDownSelectMinimal'
import {
  addPaddingToLngLatBounds,
  getCombinedBoundsInLngLat,
} from '#/common/utils/gis'

import {
  GraphCalcType,
  MapGraphCalcFeature,
  MapGraphData,
  MapGraphDataSelectOption,
  ZONING_CODE_COL,
} from 'applets/hiilikartta/common/types'
import { isZoningCodeValidExpression } from 'applets/hiilikartta/common/utils'
import { mergeArraysAlternate, pp } from '#/common/utils/general'
import { Cross } from '#/components/icons'

type Props = {
  datas: MapGraphData[]
  activeYear: string
  featureYears: string[]
  setActiveYear: (year: string) => void
  activeDataOption: MapGraphDataSelectOption
  setActiveDataOption: (option: MapGraphDataSelectOption) => void
  activeCalcType: GraphCalcType
  activeAreaType: string
  setUseCurrent: (useCurrent: boolean) => void
}

const CarbonMapGraphMap = ({
  datas,
  activeYear,
  featureYears,
  setActiveYear,
  activeDataOption,
  setActiveDataOption,
}: Props) => {
  const { t } = useTranslate('hiilikartta')
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    feature: MapGraphCalcFeature | null
    x: number
    y: number
  }>({
    visible: false,
    feature: null,
    x: 0,
    y: 0,
  })
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapIsLoaded, setMapIsLoaded] = useState(false)
  const allDataIds = useRef<string[]>([])
  const selectOptions = useMemo(() => {
    const currentSituationAppendix = ` (${t(
      'report.general.current_situation'
    )})`
    const datasCurrent = datas.map((data) => ({
      id: data.id,
      name: data.name + currentSituationAppendix,
      isCurrent: true,
    }))
    const datasPlanned = datas.map((data) => ({
      id: data.id,
      name: data.name,
      isCurrent: false,
    }))
    return mergeArraysAlternate(datasPlanned, datasCurrent)
  }, [datas])

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
      // Remove old GeoJSON data
      const dataIds = datas.map((data) => data.id)
      // Check if bounds need to be reset
      if (
        allDataIds.current.length != dataIds.length ||
        !dataIds.every((dataId) => allDataIds.current.includes(dataId))
      ) {
        const bounds = getCombinedBoundsInLngLat(datas.map((data) => data.data))
        if (bounds) {
          const paddedBounds = addPaddingToLngLatBounds(bounds, 1)
          map.current?.setMaxBounds(paddedBounds)
          map.current?.fitBounds(bounds, {
            padding: 20,
          })
        }
      }
      allDataIds.current.forEach((dataId) => {
        if (!dataIds.includes(dataId)) {
          map.current!.removeLayer(`carbon-graph-layer-${dataId}`)
          map.current!.removeLayer(`carbon-graph-layer-${dataId}-symbol`)
          map.current!.removeSource(`carbon-graph-source-${dataId}`)
        }
      })

      allDataIds.current = dataIds

      datas.forEach((data) => {
        const sourceId = `carbon-graph-source-${data.id}`
        const layerId = `carbon-graph-layer-${data.id}`

        if (map.current!.getSource(sourceId)) {
          ;(map.current!.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(
            data.data
          )

          if (data.id === activeDataOption.id) {
            map.current!.setLayoutProperty(layerId, 'visibility', 'visible')
            map.current!.setLayoutProperty(
              `${layerId}-symbol`,
              'visibility',
              'visible'
            )
            map.current!.setFilter(layerId, ['!=', 'isHidden', true])
            map.current!.setFilter(`${layerId}-symbol`, [
              '!=',
              'isHidden',
              true,
            ])
            if (activeDataOption.isCurrent) {
              map.current!.setFilter(`${layerId}-symbol`, [
                '!=',
                'isHidden',
                false,
              ])
            }
            map.current!.setPaintProperty(layerId, 'fill-color', [
              'get',
              activeDataOption.isCurrent ? 'colorNochange' : 'color',
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
              visibility: data.id === activeDataOption.id ? 'visible' : 'none',
            },
            paint: {
              'fill-color': [
                'get',
                activeDataOption.isCurrent ? 'colorNochange' : 'color',
              ],
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
                ['==', ['get', ZONING_CODE_COL], 'none'],
                '',
                isZoningCodeValidExpression(),
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

          if (activeDataOption.isCurrent) {
            map.current!.setFilter(`${layerId}-symbol`, [
              '!=',
              'isHidden',
              false,
            ])
          }
        }
      })
    }
  }, [mapIsLoaded, datas, activeDataOption])

  useEffect(() => {
    if (map.current != null) {
      const layerId = `carbon-graph-layer-${activeDataOption.id}`
      const handleMouseEnter = () => {
        map.current!.getCanvas().style.cursor = 'pointer'
      }
      const handleMouseLeave = () => {
        map.current!.getCanvas().style.cursor = ''
      }
      map.current.on('mouseenter', layerId, handleMouseEnter)
      map.current.on('mouseleave', layerId, handleMouseLeave)

      const handleFeatureClick = (e: any) => {
        if (map.current != null) {
          const features = map.current.queryRenderedFeatures(e.point)
          if (features.length > 0) {
            // @ts-ignore
            const feature = features[0] as MapGraphCalcFeature
            if (feature && feature.properties) {
              setTooltip({
                visible: true,
                feature: feature,
                x: e.point.x,
                y: e.point.y,
              })
            }
          } else {
            setTooltip((prev) => ({ ...prev, visible: false }))
          }
        }
      }
      map.current.on('click', handleFeatureClick)

      return () => {
        if (map.current) {
          map.current.off('click', handleFeatureClick)
          map.current.off('mouseenter', layerId, handleMouseEnter)
          map.current.off('mouseleave', layerId, handleMouseLeave)
        }
      }
    }
  }, [map.current, activeDataOption.isCurrent])

  const handlePlanSelectClick = (data: MapGraphDataSelectOption) => {
    setActiveDataOption(data)
  }

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
        {selectOptions.map((option) => (
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
              ...(option.id === activeDataOption.id &&
                option.isCurrent === activeDataOption.isCurrent && {
                  border: '1px solid',
                  borderColor: 'secondary.dark',
                  color: 'secondary.dark',
                }),
            }}
            key={option.id + option.isCurrent}
            onClick={() => handlePlanSelectClick(option)}
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
              {option.name}
            </Typography>
          </Button>
        ))}
      </Box>
      <Box
        sx={{
          display: tooltip.visible ? 'flex' : 'none',
          flexDirection: 'column',
          position: 'absolute',
          left: tooltip.x - 11,
          top: tooltip.y + 10,
          zIndex: 1500, // Ensure it's above the map layers
          backgroundColor: 'white',
          // border: '1px solid #ddd', // Optional border
          boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)', // Optional shadow
          borderRadius: '4px',
          padding: '10px',
          minWidth: '150px',
          pointerEvents: 'auto', // To allow clicking on the close button
          '::after': {
            content: '""',
            position: 'absolute',
            top: '-17px', // Position the pointer above the tooltip box
            left: '3px', // Position the pointer towards the left of the tooltip box
            borderWidth: '10px',
            borderStyle: 'solid',
            borderColor: 'transparent transparent white transparent', // Point downwards
          },
        }}
      >
        {tooltip.feature && (
          <>
            <Box
              sx={{
                alignSelf: 'flex-end',
                flexDirection: 'row',
                cursor: 'pointer',
                width: '20px',
                height: '20px',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'start',
              }}
            >
              <Box
                sx={{ display: 'inline' }}
                onClick={() =>
                  setTooltip((prev: any) => ({ ...prev, visible: false }))
                }
              >
                <Cross sx={{ width: '15px', height: '15px' }}></Cross>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Table>
                <TableBody>
                  <TableRow key={'zoning_code'}>
                    <FirstColumnCell component="th" scope="row">
                      <T
                        ns="hiilikartta"
                        keyName="report.map_graph.tooltip_zoning_code"
                      ></T>
                    </FirstColumnCell>
                    <DataCell key={'zoning_code_val'} align="left">
                      {tooltip.feature.properties[ZONING_CODE_COL]}
                    </DataCell>
                  </TableRow>
                  <TableRow key={'area'}>
                    <FirstColumnCell component="th" scope="row">
                      <T
                        ns="hiilikartta"
                        keyName="report.map_graph.tooltip_area"
                      ></T>
                    </FirstColumnCell>
                    <DataCell key={'zoning_code_val'} align="left">
                      {pp(tooltip.feature.properties.area / 10000, 2)}
                    </DataCell>
                  </TableRow>
                  <TableRow key={'co2_ha'}>
                    <FirstColumnCell component="th" scope="row">
                      <T
                        ns="hiilikartta"
                        keyName="report.map_graph.unit_co2_ha_compared"
                      ></T>
                    </FirstColumnCell>
                    <DataCell key={'co2_ha_val'} align="left">
                      {pp(
                        activeDataOption.isCurrent
                          ? tooltip.feature.properties.valueHaNochange
                          : tooltip.feature.properties.valueHa,
                        0
                      )}
                    </DataCell>
                  </TableRow>
                  <TableRow key={'co2_total'}>
                    <FirstColumnCell component="th" scope="row">
                      <T
                        ns="hiilikartta"
                        keyName="report.map_graph.unit_co2_total_compared"
                      ></T>
                    </FirstColumnCell>
                    <DataCell key={'co2_total_val'} align="left">
                      {pp(
                        activeDataOption.isCurrent
                          ? tooltip.feature.properties.valueTotalNochange
                          : tooltip.feature.properties.valueTotal,
                        0
                      )}
                    </DataCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

const FirstColumnCell = styled(TableCell)(({ theme }) => ({
  ...theme.typography.body7,
  borderBottom: 'none',
  padding: '6px',
}))

const DataCell = styled(TableCell)(({ theme }) => ({
  ...theme.typography.body7,
  fontWeight: 'bold',
  letterSpacing: '0.125rem',
  borderBottom: 'none',
  padding: '6px',
}))

export default CarbonMapGraphMap
