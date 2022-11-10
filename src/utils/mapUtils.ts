import { Expression } from 'mapbox-gl'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'

export const fillOpacity = 0.65

export const roundToSignificantDigitsPos = (n: number, expr: Expression) => [
  // Multiply back by true scale
  '/',
  // Round to two significant digits:
  ['round', ['/', expr, ['^', 10, ['+', -n + 1, ['floor', ['log10', expr]]]]]],
  ['^', 10, ['-', n - 1, ['floor', ['log10', expr]]]],
]
export const roundToSignificantDigits = (n: number, expr: Expression) => [
  'case',
  ['==', 0, expr],
  0,
  ['>', 0, expr],
  ['*', -1, roundToSignificantDigitsPos(n, ['*', -1, expr])],
  roundToSignificantDigitsPos(n, expr),
]

const defaultVectorStyles: any = {
  LineString: new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  MultiLineString: new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  MultiPolygon: new Style({
    stroke: new Stroke({
      color: 'yellow',
      width: 1,
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 0, 0.1)',
    }),
  }),
  Polygon: new Style({
    stroke: new Stroke({
      color: 'blue',
      lineDash: [4],
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }),
  GeometryCollection: new Style({
    stroke: new Stroke({
      color: 'magenta',
      width: 2,
    }),
    fill: new Fill({
      color: 'magenta',
    }),
    image: new CircleStyle({
      radius: 10,
      fill: null,
      stroke: new Stroke({
        color: 'magenta',
      }),
    }),
  }),
  Circle: new Style({
    stroke: new Stroke({
      color: 'red',
      width: 2,
    }),
    fill: new Fill({
      color: 'rgba(255,0,0,0.2)',
    }),
  }),
}

export const defaultVectorStyleFunction = (feature: any) => {
  return defaultVectorStyles[feature.getGeometry().getType()]
}
