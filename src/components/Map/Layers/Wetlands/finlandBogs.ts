import { Style as MbStyle } from 'mapbox-gl'
import Feature from 'ol/Feature'
import _ from 'lodash'

import { fillOpacity, roundToSignificantDigits } from 'Utils/mapUtils'
import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'fi_bogs'
const idGtk: string = 'gtk_peat'

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/fi-mml-suot/{z}/{x}/{y}.pbf.gz?v=5'],
        minzoom: 0,
        maxzoom: 11,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="http://mml.fi/">© National Land Survey of Finland</a>',
      },
      [idGtk]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/gtk-turvevarat-suot/{z}/{x}/{y}.pbf.gz?v=5'],
        minzoom: 0,
        maxzoom: 14,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="http://www.gtk.fi/">© Geological Survey of Finland</a>',
      },
    },
    layers: [
      {
        id: id + '-fill',
        source: id,
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': 'orange',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: idGtk + '-fill',
        source: idGtk,
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': ['case', ['==', null, ['get', 'photos_json']], 'red', 'orange'],
          // 'fill-color': fillColorFertilityClass,
          // 'fill-color': fillRegenerationFelling,
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
    ],
  }
}

const popupFunc = (f: Feature) => {
  const p = f.getProperties()

  let html = `
      Name: ${p.suon_nimi}<br/>
      Surveyed: ${p.tutkimusvuosi}<br/>
      Area: ${p.suon_pinta_ala_ha} ha<br/>
      Peat volume: ${p.suon_turvemaara_mm3} million cubic metres<br/>
      Average peat depth: ${p.turvekerroksen_keskisyvyys_m} metres<br/>
      Evaluation of how close the bog is to its natural state (class ${
        p.luonnontilaisuusluokka === -1 ? '?' : p.luonnontilaisuusluokka
      } out of 5):<br/> ${gtkTurveVaratLuonnontilaisuusluokka[p.luonnontilaisuusluokka]}<br/>
      `

  if (!p.photos_json) {
    return html
  }

  html += '<div style="overflow:scroll; max-height: 500px">'

  const photos = JSON.parse(p.photos_json)
  for (const x of photos) {
    const { kuva_id, kuvausaika, kuvaaja } = x
    const imageURL = `https://gtkdata.gtk.fi/Turvevarojen_tilinpito/Turve_valokuvat/${kuva_id}.jpg`
    html += `<p>
          <a target="_blank" href="${imageURL}">
              <img style="max-width:200px; max-height:150px;" src="${imageURL}"/>
          </a>
          <br/>
          Date: ${kuvausaika.toLowerCase() === 'tuntematon' ? 'Unknown' : kuvausaika}
          <br/>
          Photographer: ${kuvaaja}
          </p>`
  }
  html += '</div>'

  return html
}

const gtkTurveVaratLuonnontilaisuusluokka: any = {
  '-1': 'Unclassified',
  0: 'Irreversible changes',
  1: 'Water flow thoroughly changed and there are clear changes to the vegetation',
  2: 'Contains drained and non-drained parts',
  3: 'Most of the bog is non-drained',
  4: 'Immediate vicinity of the bog contains non-visible sources of disruption like ditches and roads',
  5: 'The bog is in its natural state',
}

const layerConf: LayerConf = { id: id, style: getStyle, popupFunc: popupFunc }

export default layerConf
