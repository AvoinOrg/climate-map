import { areaThemeStyle } from 'applets/energy/common/areas/thematicStyle'
import { useAppletStore } from 'applets/energy/state/appletStore'
import type { LayerConf, ExtendedLayerSpecification } from '#/common/types/map'
import type { AreaSourceDescriptor } from 'applets/energy/layers/areaSource'
import { AUTOMATIC_AREA_RANGES } from 'applets/energy/common/areas/mapModes'

export const areaLayerIds = (descriptor: AreaSourceDescriptor) =>
  [
    `${descriptor.sourceId.replaceAll('-', '_')}-fill`,
    `${descriptor.sourceId.replaceAll('-', '_')}-outline`,
  ] as const
export const createAreaLayerConf = (
  descriptor: AreaSourceDescriptor
): LayerConf => {
  const theme = areaThemeStyle(useAppletStore.getState())
  const [fill, outline] = areaLayerIds(descriptor)
  const range = AUTOMATIC_AREA_RANGES[descriptor.level]
  const shared = {
    source: descriptor.sourceId,
    'source-layer': descriptor.sourceLayer,
    minzoom: Math.min(
      range.maxzoom,
      Math.max(descriptor.source.minzoom ?? 0, range.minzoom)
    ),
    maxzoom: range.maxzoom,
    selectable: true,
    layout: { visibility: theme.visible ? 'visible' : 'none' },
    filter: [
      'all',
      ['==', ['get', 'level'], descriptor.level],
      ['==', ['typeof', ['get', 'area_id']], 'string'],
      theme.eligibility,
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
            'fill-color': theme.color,
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
