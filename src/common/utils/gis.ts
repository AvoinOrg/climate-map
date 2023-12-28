import area from '@turf/area'
import bbox from '@turf/bbox'
import bboxPolygon from '@turf/bbox-polygon'
import { featureCollection } from '@turf/helpers'
import { LngLatBounds } from 'mapbox-gl'

export const getGeoJsonArea = (geoJson: any) => {
  return area(geoJson)
}

export const getCombinedBounds = (geoJsons: any[]) => {
  const bboxes = geoJsons.map((geoJson) => bbox(geoJson))
  const bboxFeatureCollection = featureCollection(
    bboxes.map((bbox) => bboxPolygon(bbox))
  )

  const combinedBounds = bbox(bboxFeatureCollection)

  return combinedBounds
}

export const getCombinedBoundsInLngLat = (geoJsons: any[]) => {
  const bbox = getCombinedBounds(geoJsons)

  if (bbox.includes(Infinity) || bbox.includes(-Infinity)) {
    return null
  }

  const bounds = new LngLatBounds([bbox[0], bbox[1]], [bbox[2], bbox[3]])

  return bounds
}

export const addPaddingToLngLatBounds = (
  bounds: LngLatBounds,
  paddingFrac: number
) => {
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()

  // Calculate width and height of the bounding box
  const width = ne.lng - sw.lng
  const height = ne.lat - sw.lat

  // Calculate padding in terms of longitude and latitude
  const paddingWidth = width * paddingFrac
  const paddingHeight = height * paddingFrac

  // Adjust bounds with padding
  const paddedBounds = new LngLatBounds(
    [sw.lng - paddingWidth, sw.lat - paddingHeight],
    [ne.lng + paddingWidth, ne.lat + paddingHeight]
  )

  return paddedBounds
}
