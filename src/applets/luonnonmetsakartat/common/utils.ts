import type { GeoJSONSource } from 'maplibre-gl'

import {
  ExtendedStyleSpecification,
  LayerConf,
  LayerEventHandlerAddOptions,
} from '#/common/types/map'
import { getContrastColor } from '#/common/utils/styling'
import { useMapStore } from '#/common/store'

import AreaModalAdmin from '../components/AreaModalAdmin'
import { State, useAppletStore } from '../state/appletStore'
import AreaModal from '../components/AreaModal'
import { FolayerFeature } from './types'
import { buildFolayerTileUrl } from './geoServer'

const FOLAYER_LABEL_TEXT_PADDING_PX = 40

export const getFolayerIdWithoutHyphens = (layerId: string) => {
  return layerId.replace(/-/g, '')
}

export const getFolayerSourceId = (layerId: string, isAdmin: boolean) => {
  const layerIdWithoutHyphens = getFolayerIdWithoutHyphens(layerId)
  return `${layerIdWithoutHyphens}_luonnonmetsakartat${isAdmin ? '_admin' : ''}`
}

export const getFolayerGroupId = (layerId: string, isAdmin: boolean) => {
  return getFolayerSourceId(layerId, isAdmin)
}

export const getFolayerSourceLayer = (layerId: string) => {
  return `forest_areas_${getFolayerIdWithoutHyphens(layerId)}`
}

export const getFolayerCentroidSourceLayer = (layerId: string) => {
  return `forest_areas_${getFolayerIdWithoutHyphens(layerId)}_centroid`
}

export const getFolayerCentroidSourceId = (
  layerId: string,
  isAdmin: boolean
) => {
  const layerIdWithoutHyphens = getFolayerIdWithoutHyphens(layerId)
  return `${layerIdWithoutHyphens}_luonnonmetsakartat_centroid${
    isAdmin ? '_admin' : ''
  }`
}

export const createFolayerConf = async ({
  folayerId,
  folayerName,
  colorCode,
  isAdmin = false,
}: {
  folayerId: string
  folayerName: string
  colorCode: string
  isAdmin?: boolean
}) => {
  const groupId = getFolayerGroupId(folayerId, isAdmin)
  // const addImage = useMapStore.getState().addImage
  const sourceId = getFolayerSourceId(folayerId, isAdmin)
  const sourceLayer = getFolayerSourceLayer(folayerId)

  const centroidSourceId = getFolayerCentroidSourceId(folayerId, isAdmin)
  const tileUrl = buildFolayerTileUrl({ sourceLayer })
  if (!tileUrl) {
    return {
      id: groupId,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
    } satisfies LayerConf
  }

  const validColorCode = colorCode || '#4cbf00' // Default to green if none provided
  const contrastColor = getContrastColor(validColorCode)

  // const pinSvgString = `
  //   <svg xmlns="http://www.w3.org/2000/svg"
  //       width="24"
  //       height="24"
  //       viewBox="0 0 24 24"
  //       fill="${validColorCode}"
  //       fill-opacity="0.8"
  //       stroke="black"
  //       stroke-opacity="1"
  //       stroke-width="1.5"
  //       stroke-linecap="round"
  //       stroke-linejoin="round"
  //       class="mapbox-pin-icon">
  //       <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
  //       <circle cx="12" cy="10" r="3"></circle>
  //     </svg>`

  // const pinId = `pin-${sourceId}`
  // await addImage(pinId, sourceId, pinSvgString, validColorCode)

  const style: ExtendedStyleSpecification = {
    version: 8,
    sources: {
      [sourceId]: {
        type: 'vector',
        scheme: 'tms',
        tiles: [tileUrl],
        bounds: [19, 59, 32, 71], // Finland
        promoteId: 'id',
        extendedOpts: {
          useAccessToken: isAdmin ? true : false,
          selectable: true,
          multiSelectable: false,
        },
      },
      // [centroidSourceId]: {
      //   type: 'geojson',
      //   data: `${SERVER_URL}/${GS_WORKSPACE}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${GS_WORKSPACE}:${centroidSourceLayer}&outputFormat=application/json&srsName=EPSG:4326`,
      //   cluster: true, // Enable Maplibre GL JS clustering
      //   clusterMaxZoom: 11, // Max zoom to cluster points on
      //   clusterRadius: 45, // Radius of clusters in pixels
      //   promoteId: 'id', // Promote ID if your GeoJSON features have a unique 'id' property
      //   extendedOpts: {
      //     useAccessToken: true,
      //     ensureLocalData: true,
      //     selectable: true,
      //     multiSelectable: false,
      //   },
      // },
      [centroidSourceId]: {
        type: 'store',
        cluster: true, // Enable Maplibre GL JS clustering
        clusterMaxZoom: 11, // Max zoom to cluster points on
        clusterRadius: 45, // Radius of clusters in pixels
        promoteId: 'id',
        extendedOpts: {
          selectable: true,
          multiSelectable: false,
          storeData: {
            sync: {
              store: useAppletStore,
              selector: (state: State) =>
                state.folayerAreaConfs[folayerId]?.data,
            },
          },
          dataSearchOpts: {
            name: folayerName,
            fields: ['name'],
            displayPattern: (feature: any) => {
              const folayerFeature = feature as FolayerFeature
              const parts = [folayerFeature.properties.name]
              if (folayerFeature.properties.municipality) {
                parts.push(folayerFeature.properties.municipality)
              }
              return parts
            },
            appendDatasetName: true,
            // getCoordinates: (feature: any) => {
            //   if (feature.geometry && feature.geometry.type === 'Point') {
            //     return feature.geometry.coordinates as [number, number]
            //   }
            //   return null
            // },
          },
        },
      },
    },
    layers: [
      // Fill layer - shown at medium to high zoom levels
      {
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId,
        'source-layer': sourceLayer,
        layout: {},
        paint: {
          // Use the provided colorCode for the fill
          'fill-color': validColorCode,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.9, // Higher opacity when selected
            0.7, // Default opacity
          ],
        },
        selectable: true,
        minzoom: 7, // Only show fills at medium to high zoom levels
      },
      // Outline layer - shown at medium to high zoom levels
      {
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        'source-layer': sourceLayer,
        paint: {
          'line-color': 'black', // Keep outline black for contrast
          'line-opacity': 1,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3, // Thicker outline when selected
            1.5, // Default outline width
          ],
        },
        minzoom: 7, // Only show outlines at medium to high zoom levels
      },
      // Text labels - shown only at high zoom levels
      {
        id: `${sourceId}-symbol`,
        source: sourceId,
        'source-layer': sourceLayer,
        type: 'symbol',
        layout: {
          'symbol-placement': 'point',
          'text-field': ['get', 'name'], // Use the 'name' property
          'text-size': 14,
          'text-font': ['Open Sans Regular'],
          'text-anchor': 'center',
          'text-justify': 'center',
          'text-allow-overlap': false,
          'text-padding': FOLAYER_LABEL_TEXT_PADDING_PX,
          'text-max-width': 10, // Wrap text after about 10 characters
          'text-offset': [0, 0.2], // Small offset to center text better
        },
        paint: {
          'text-color': 'black', // Keep text black for readability
          'text-halo-blur': 1,
          'text-halo-color': 'rgb(242,243,240)', // Light halo for contrast
          'text-halo-width': 2,
        },
        minzoom: 11, // Only show text at high zoom levels
        selectable: true,
      },
      {
        id: `${centroidSourceId}-cluster_circle`,
        type: 'circle',
        source: centroidSourceId, // Use the clustered source
        // 'source-layer': centroidSourceLayer,
        filter: ['has', 'point_count'], // Only apply to clustered points
        paint: {
          // Use step expressions to style circles based on point count
          'circle-color': validColorCode,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15, // Default radius (for < 10 points)
            10,
            20, // Radius for >= 10 points
            50,
            25, // Radius for >= 50 points
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'black',
          'circle-opacity': 0.9,
        },
        hoverPointer: true,
        maxzoom: 10, // Match the maxzoom of the individual pins
      },

      {
        id: `${centroidSourceId}-cluster_count`,
        type: 'symbol',
        source: centroidSourceId, // Use the clustered source
        // 'source-layer': centroidSourceLayer,
        filter: ['has', 'point_count'], // Only apply to clustered points
        layout: {
          'text-field': '{point_count_abbreviated}', // Display the abbreviated count
          'text-font': ['Open Sans Semibold'],
          'text-size': 12,
        },
        paint: {
          'text-color': contrastColor, // Black text for contrast
        },
        hoverPointer: true,
        maxzoom: 10, // Match the maxzoom of the individual pins
      },
      {
        id: `${centroidSourceId}-unclustered`,
        type: 'circle',
        source: centroidSourceId, // Use the clustered source
        // 'source-layer': centroidSourceLayer,
        filter: ['!', ['has', 'point_count']], // Only apply to clustered points
        paint: {
          'circle-color': validColorCode,
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            14,
            12,
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3, // Selected stroke width
            1, // Default stroke width
          ],
          'circle-stroke-color': 'black',
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1.0, // Selected opacity
            0.9, // Default opacity
          ],
        },
        selectable: true,
        maxzoom: 12, // Match the maxzoom of the individual pins
      },
      // Centroid Pin layer - shown at low to medium zoom levels
      // {
      //   id: `${centroidSourceId}-pin`,
      //   type: 'symbol',
      //   source: centroidSourceId,
      //  'source-layer': centroidSourceLayer,
      //   layout: {
      //     'symbol-placement': 'point',
      //     'icon-image': pinId, // Assuming 'pin' is a loaded image/sprite
      //     'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 9, 0.8],
      //     'icon-allow-overlap': true,
      //     'icon-anchor': 'bottom',
      //     'icon-offset': [0, -5],
      //     'icon-ignore-placement': true,
      //     'icon-pitch-alignment': 'viewport',
      //     visibility: 'visible',
      //   },
      //   paint: {
      //     'icon-opacity': [
      //       'case',
      //       ['boolean', ['feature-state', 'selected'], false],
      //       1.0, // Fully opaque when selected
      //       0.8, // Slightly transparent by default
      //     ],
      //     'icon-halo-color': 'white', // Keep halo black for contrast
      //     'icon-halo-width': [
      //       'case',
      //       ['boolean', ['feature-state', 'selected'], false],
      //       10, // Wider halo when selected
      //       0.5, // Default halo width
      //     ],
      //   },
      //   maxzoom: 12, // Hide pins at higher zoom levels where fill/outline are visible
      //   selectable: true,
      // },
    ],
  }

  // const selectionHandler: MapEventHandler = (map: Map) => {
  //   const selectableLayers = [
  //     `${centroidSourceId}-unclustered`, // Unclustered circles
  //     `${sourceId}-fill`, // Polygon fills
  //   ]

  //   let selectedFeatureId: string | number | null = null // Track selected ID

  //   map.on('click', selectableLayers, (e: MapLayerMouseEvent) => {
  //     if (!e.features || e.features.length === 0) return

  //     const clickedFeature = e.features[0]
  //     const featureId = clickedFeature.properties?.id // Get ID from properties

  //     // Clear previous selection if a valid feature was clicked
  //     if (selectedFeatureId !== null) {
  //       map.setFeatureState(
  //         { source: centroidSourceId, id: selectedFeatureId },
  //         { selected: false }
  //       )
  //       map.setFeatureState(
  //         { source: sourceId, id: selectedFeatureId },
  //         { selected: false }
  //       )
  //       selectedFeatureId = null
  //     }

  //     // Set new selection if a valid ID exists
  //     if (featureId !== undefined && featureId !== null) {
  //       selectedFeatureId = featureId

  //       map.setFeatureState(
  //         { source: centroidSourceId, id: featureId },
  //         { selected: true }
  //       )
  //       map.setFeatureState(
  //         { source: sourceId, id: featureId },
  //         { selected: true }
  //       )

  //       console.log(
  //         `Selected feature ID: ${featureId} on layer ${clickedFeature.layer.id}`
  //       )
  //       // Add other actions like showing a popup or flying to the feature
  //     }
  //   })

  //   // Optional: Clear selection when clicking off features
  //   map.on('click', (e) => {
  //     if (
  //       !map.queryRenderedFeatures(e.point, { layers: selectableLayers }).length
  //     ) {
  //       if (selectedFeatureId !== null) {
  //         map.setFeatureState(
  //           { source: centroidSourceId, id: selectedFeatureId },
  //           { selected: false }
  //         )
  //         map.setFeatureState(
  //           { source: sourceId, id: selectedFeatureId },
  //           { selected: false }
  //         )
  //         selectedFeatureId = null
  //         console.log('Selection cleared')
  //       }
  //     }
  //   })
  // }

  // const mouseEnterHandler: MapEventHandler = (map: Map) => {
  //   const eventType = 'mouseenter'
  //   const selectableLayers = [
  //     `${centroidSourceId}-unclustered`,
  //     `${sourceId}-fill`,
  //     `${centroidSourceId}-cluster_circle`, // Add cluster layer for pointer change
  //   ]

  //   map.on(eventType, selectableLayers, () => {
  //     map.getCanvas().style.cursor = 'pointer'
  //   })

  //   return { selectableLayers, eventType }
  // }

  // const mouseLeaveHandler: MapEventHandler = (map: Map) => {
  //   const selectableLayers = [
  //     `${centroidSourceId}-unclustered`,
  //     `${sourceId}-fill`,
  //     `${centroidSourceId}-cluster_circle`,
  //   ]
  //   map.on('mouseleave', selectableLayers, () => {
  //     map.getCanvas().style.cursor = ''
  //   })
  // }

  const eventHandlers: LayerEventHandlerAddOptions[] = [
    {
      layers: [`${centroidSourceId}-cluster_circle`],
      eventType: 'click',
      handlerCreator: (map) => {
        // This returns the actual event handler function
        return (e) => {
          if (!e.features?.[0]?.properties) {
            return
          }

          const features = e.features
          const clusterId = features[0].properties.cluster_id
          const source = map.getSource(centroidSourceId) as GeoJSONSource

          if (!source || typeof source.getClusterExpansionZoom !== 'function') {
            console.error(
              'Source not found or is not a clustered GeoJSON source:',
              centroidSourceId
            )
            return
          }

          source
            .getClusterExpansionZoom(clusterId)
            .then((zoom: number) => {
              // Ensure features[0] and its geometry exist and are of type Point
              if (features[0]?.geometry?.type === 'Point') {
                useMapStore.getState().easeTo({
                  options: {
                    center: features[0].geometry.coordinates as [
                      number,
                      number,
                    ],
                    zoom: zoom + 0.5, // Add a slight zoom buffer
                  },
                })
              } else {
                console.warn(
                  'Clicked cluster feature is not a Point or geometry is missing.'
                )
              }
            })
            .catch((err: any) => {
              // Catch any errors from the promise
              console.error('Error getting cluster expansion zoom:', err)
            })
        }
      },
    },
  ]

  const layerConf = {
    id: groupId,
    style: style,
    eventHandlers: eventHandlers,
    popupOpts: {
      component: isAdmin ? AreaModalAdmin : AreaModal,
      componentProps: {
        folayerId: folayerId,
      },
      source: centroidSourceId,
      type: 'modal',
      multiPoppable: false,
    },
    joinedSelectionSources: [
      [
        { source: centroidSourceId },
        { source: sourceId, sourceLayer: sourceLayer },
      ],
    ],
  } as LayerConf

  return layerConf
}

export {
  folayerDataValidateColumnValues,
  folayerDataFindDuplicateIds,
  folayerDataFindDuplicateNameMunicipalityPairs,
  type FolayerDataColumnValidation,
} from 'applets/luonnonmetsakartat/common/folayerShapefile'
