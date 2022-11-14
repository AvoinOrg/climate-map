import { Expression } from 'mapbox-gl'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import Layer from 'ol/layer/Layer'
import WebGLVectorLayerRenderer from 'ol/renderer/webgl/VectorLayer'
import { asArray } from 'ol/color'
import { packColor } from 'ol/renderer/webgl/shaders'

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

export class WebGLLayer extends Layer {
  createRenderer = (): any => {
    return new WebGLVectorLayerRenderer(this, {
      fill: {
        attributes: {
          color: (feature: any) => {
            const color = asArray(feature.get('COLOR') || '#eee')
            color[3] = 0.85
            return packColor(color)
          },
          opacity: () => {
            return 0.6
          },
        },
      },
      stroke: {
        attributes: {
          color: (feature: any) => {
            const color = [...asArray(feature.get('COLOR') || '#eee')]
            color.forEach((_, i) => (color[i] = Math.round(color[i] * 0.75))) // darken slightly
            return packColor(color)
          },
          width: () => {
            return 1.5
          },
          opacity: () => {
            return 1
          },
        },
      },
    })
  }
}
