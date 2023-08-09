import { Expression, MapboxGeoJSONFeature } from 'mapbox-gl'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import Layer from 'ol/layer/Layer'
import WebGLVectorLayerRenderer from 'ol/renderer/webgl/VectorLayer'
import { asArray } from 'ol/color'
// import { packColor } from 'ol/renderer/webgl/shaders'
import { Geometry, Position } from 'geojson'
import { LayerType, layerTypes, LayerOpt, ExtendedAnyLayer } from '../types/map'

export const fillOpacity = 0.65

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
      fill: undefined,
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

// export class WebGLLayer extends Layer {
//   createRenderer = (): any => {
//     return new WebGLVectorLayerRenderer(this, {
//       fill: {
//         attributes: {
//           color: (feature: any) => {
//             const color = asArray(feature.get('COLOR') || '#eee')
//             color[3] = 0.85
//             return packColor(color)
//           },
//           opacity: () => {
//             return 0.6
//           },
//         },
//       },
//       stroke: {
//         attributes: {
//           color: (feature: any) => {
//             const color = [...asArray(feature.get('COLOR') || '#eee')]
//             color.forEach((_, i) => (color[i] = Math.round(color[i] * 0.75))) // darken slightly
//             return packColor(color)
//           },
//           width: () => {
//             return 1.5
//           },
//           opacity: () => {
//             return 1
//           },
//         },
//       },
//     })
//   }
// }

export const stringToColor = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    colour += ('00' + value.toString(16)).substr(-2)
  }

  return colour
}

export const getColorExpressionArrForValues = (values: any[]) => {
  let colorArr: string[] = []

  values.forEach((value) => {
    colorArr.push(value)
    colorArr.push(stringToColor(value))
  })

  return colorArr
}

// NB: By using the '/' operator instead of '*', we get rid of float bugs like 1.2000000000004.
export const roundToSignificantDigitsPosExpr = (n: number, expr: Expression) => [
  // Multiply back by true scale
  '/',
  // Round to two significant digits:
  ['round', ['/', expr, ['^', 10, ['+', -n + 1, ['floor', ['log10', expr]]]]]],
  ['^', 10, ['-', n - 1, ['floor', ['log10', expr]]]],
]
export const roundToSignificantDigitsExpr = (n: number, expr: Expression) => [
  'case',
  ['==', 0, expr],
  0,
  ['>', 0, expr],
  ['*', -1, roundToSignificantDigitsPosExpr(n, ['*', -1, expr])],
  roundToSignificantDigitsPosExpr(n, expr),
]

export const getCombinedBounds = (features: MapboxGeoJSONFeature[]) => {
  const coords = features.map((f) => {
    const g: any = f.geometry
    return g.coordinates
  })

  return coords.reduce(
    ([a1, b1, c1, d1], [a2, b2, c2, d2]) => [Math.min(a1, a2), Math.min(b1, b2), Math.max(c1, c2), Math.max(d1, d2)],
    [999, 999, -999, -999] // fallback bounds
  )
}

export const getCoordinateFromGeometry = (geometry: Geometry): Position | null => {
  switch (geometry.type) {
    case 'Point':
      return geometry.coordinates as Position
    case 'LineString':
    case 'Polygon':
      return geometry.coordinates[0] as Position
    case 'MultiPoint':
    case 'MultiLineString':
    case 'MultiPolygon':
      return geometry.coordinates[0][0] as Position
    case 'GeometryCollection':
      if (geometry.geometries.length > 0) {
        return getCoordinateFromGeometry(geometry.geometries[0])
      }
      return null
    default:
      return null
  }
}

export const positionToLngLatLike = (position: Position): mapboxgl.LngLatLike => {
  return { lng: position[0], lat: position[1] }
}

export const getLayerType = (layerGroupId: string): LayerType => {
  const suffix = layerGroupId.split('-').slice(-1)[0]
  if (layerTypes.includes(suffix)) {
    return suffix as LayerType
  }

  console.error(
    'Invalid layer type: "' + suffix + '" for layer: ' + layerGroupId + '". Valid types are: ' + layerTypes.join(', ')
  )
  return 'invalid'
}

export const getLayerName = (layerGroupId: string): LayerType => {
  const layerGroupIdSplitArr = layerGroupId.split('-')
  if (layerGroupIdSplitArr.length > 2) {
    console.error('Invalid layer id. Only use hyphen ("-") to separate the LayerType-suffix from the rest of the id.')
  }

  const name = layerGroupIdSplitArr.slice(0, -1).join('-')
  if (name.length > 0) {
    return name
  }

  return layerGroupId
}

export const assertValidHighlightingConf = (layerOpt: LayerOpt, layers: ExtendedAnyLayer[]) => {
  if (layerOpt.layerType === 'fill') {
    if (layerOpt.selectable) {
      if (!layers.find((l: any) => l.id === layerOpt.name + '-highlighted')) {
        console.error("Layer '" + layerOpt.name + "' is selectable but missing the corresponding highlighted layer.")
      }
    }
  }
}
