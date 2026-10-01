import type { LayerConf, ExtendedLayerSpecification } from '#/common/types/map'
import type { AreaSourceDescriptor } from 'applets/energy/layers/areaSource'
import { areaMetricColorExpression } from 'applets/energy/common/areas/mapModes'

export const areaLayerIds = (descriptor: AreaSourceDescriptor) =>
  [
    `${descriptor.sourceId.replaceAll('-', '_')}-fill`,
    `${descriptor.sourceId.replaceAll('-', '_')}-outline`,
  ] as const
export const createAreaLayerConf = (
  descriptor: AreaSourceDescriptor
): LayerConf => {
  const [fill, outline] = areaLayerIds(descriptor)
  const shared = {
    source: descriptor.sourceId,
    'source-layer': descriptor.sourceLayer,
    minzoom: descriptor.source.minzoom,
    selectable: true,
    filter: [
      'all',
      ['==', ['get', 'release_id'], descriptor.releaseId],
      ['==', ['get', 'level'], descriptor.level],
      ['==', ['typeof', ['get', 'area_id']], 'string'],
    ],
  }
  return {
    id: descriptor.sourceId,
    style: {
      version: 8,
      sources: { [descriptor.sourceId]: descriptor.source },
      layers: [
        {
          ...shared,
          id: fill,
          type: 'fill',
          paint: {
            'fill-color': areaMetricColorExpression('certificate_coverage'),
            'fill-opacity': 0.72,
          },
        },
        {
          ...shared,
          id: outline,
          type: 'line',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              '#111111',
              ['boolean', ['feature-state', 'hover'], false],
              '#075CFF',
              '#44546A',
            ],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              4,
              ['boolean', ['feature-state', 'hover'], false],
              3,
              1,
            ],
          },
        },
      ] as ExtendedLayerSpecification[],
    },
  }
}
