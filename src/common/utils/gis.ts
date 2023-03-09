import area from '@turf/area'

export const getGeoJsonArea = (geoJson: any) => {
  return area(geoJson)
}
