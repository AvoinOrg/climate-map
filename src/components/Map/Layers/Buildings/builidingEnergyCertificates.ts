import { Style as MbStyle } from 'mapbox-gl'
import { Fill, Stroke, Style } from 'ol/style'
import Feature from 'ol/Feature'
import _ from 'lodash'

import { fillOpacity, createPopup } from 'Utils/mapUtils'
import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'building_energy_certs'

const style: MbStyle = {
  version: 8,
  name: id,
  sources: {
    building_energy_certs: {
      type: 'vector',
      tiles: ['https://server.avoin.org/data/map/hel-energiatodistukset/{z}/{x}/{y}.pbf?v=3'],
      maxzoom: 14,
      // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
      // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
      // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
      bounds: [24, 59, 26, 61],
      attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
    },
  },
  layers: [
    {
      id: id + '-fill',
      source: id,
      'source-layer': 'energiatodistukset',
      type: 'fill',
      paint: {
        'fill-color': [
          'match',
          ['get', 'e_luokka'],
          'A',
          '#1F964A',
          'B',
          '#7DAD46',
          'C',
          '#CCD040',
          'D',
          '#FFEA43',
          'E',
          '#ECB234',
          'F',
          '#D2621F',
          'G',
          '#C70016',
          'white',
        ],
        'fill-opacity': fillOpacity,
      },
      BEFORE: 'FILL',
    },
    {
      id: id + '-outline',
      source: id,
      'source-layer': 'energiatodistukset',
      type: 'line',
      minzoom: 11,
      paint: {
        'line-opacity': 0.75,
      },
      BEFORE: 'OUTLINE',
    },
    {
      id: id + '-sym',
      source: id,
      'source-layer': 'energiatodistukset',
      type: 'symbol',
      minzoom: 14,
      paint: {},
      layout: {
        'symbol-placement': 'point',
        'text-font': ['Open Sans Regular'],
        'text-size': 20,
        'text-field': ['case', ['has', 'e_luokka'], ['get', 'e_luokka'], ''],
      },
      BEFORE: 'LABEL',
    },
  ],
}

const popupFunc = (f: Feature) => {
  let html = ''
  const p = f.getProperties()

  const energyUse = p.e_luku * p.lämmitetty_nettoala
  const energyPerVolume = p.i_raktilav
    ? `<br/>Energy use per m³: ${_.round(energyUse / p.i_raktilav)} kWh per year`
    : ''

  const url = `https://www.energiatodistusrekisteri.fi/public_html?energiatodistus-id=${p.todistustunnus}&command=access&t=energiatodistus&p=energiatodistukset`
  html += `
        <p>
        Certificate ID: <a href="${url}">${p.todistustunnus}</a><br/>
        Total energy consumption: ${_.round(energyUse)} kWh per year<br/>
        Energy use per m²: ${p.e_luku} kWh per year
        ${energyPerVolume}
        </p>
        `

  return html
}

const layerConf: LayerConf = { id: id, style: style, popupFunc: popupFunc }

export default layerConf
