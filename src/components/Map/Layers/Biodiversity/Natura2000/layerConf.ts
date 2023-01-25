import { Style as MbStyle, AnyLayer } from 'mapbox-gl'

import { LayerId, LayerConf } from '#/common/types/map'

const id: LayerId = 'natura2000'

const natura2000Mappings = {
  natura2000_sac: { layer: 'NaturaSAC_alueet', color: 'cyan' },
  natura2000_sac_lines: { layer: 'NaturaSAC_viivat', color: 'gray' },
  natura2000_sci: { layer: 'NaturaSCI_alueet', color: 'purple' },
  natura2000_spa: { layer: 'NaturaSPA_alueet', color: 'magenta' },
  natura2000_impl_ma: { layer: 'NaturaTotTapa_ma', color: '#ca9f74' },
  natura2000_impl_r: { layer: 'NaturaTotTapa_r', color: 'brown' },
}

const getNaturaLayers = () => {
  const layers: AnyLayer[] = []

  Object.entries(natura2000Mappings).forEach(([baseName, x]) => {
    layers.push({
      id: baseName + '-fill',
      source: id,
      'source-layer': x.layer,
      type: 'fill',
      paint: {
        'fill-color': x.color,
        'fill-opacity': 0.45,
      },
    })

    layers.push({
      id: `${baseName}-symbol`,
      source: id,
      'source-layer': x.layer,
      type: 'symbol',
      layout: {
        'text-font': ['Open Sans Regular'],
        'text-field': [
          'case',
          ['has', 'nimiSuomi'],
          ['coalesce', ['get', 'nimiSuomi'], ''],
          ['has', 'nimiRuotsi'],
          ['coalesce', ['get', 'nimiRuotsi'], ''],
          ['has', 'nimi'],
          ['coalesce', ['get', 'nimi'], ''],
          '',
        ],
      },
      paint: {
        'text-color': '#999',
        'text-halo-blur': 1,
        'text-halo-color': 'rgb(242,243,240)',
        'text-halo-width': 2,
      },
    })
  })

  return layers
}

const getStyle = async (): Promise<MbStyle> => {
  const style: MbStyle = {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/natura2000/{z}/{x}/{y}.pbf'],
        maxzoom: 11,
        bounds: [19, 59, 32, 71], // Finland
        // SYKE applies Creative Commons By 4.0 International license for open datasets.
        attribution: '<a href=https://www.syke.fi/en-US/Open_information">SYKE</a>',
      },
    },
    layers: getNaturaLayers(),
  }

  return style
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
