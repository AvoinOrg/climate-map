import { Style as MbStyle } from 'mapbox-gl'
import Feature from 'ol/Feature'
import _ from 'lodash'

import { fillOpacity } from 'Utils/mapUtils'
import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'fi_buildings'

interface IBuildingSchemaVRK {
  building_id: string
  region: string
  municipality: string
  street: string
  house_number: string
  postal_code: string
  building_use: number
}
interface IBuildingSchemaNLS {
  gid: number
  sijaintitarkkuus: number
  aineistolahde: number
  alkupvm: string
  kohderyhma: number
  kohdeluokka: number
  korkeustarkkuus: number
  kayttotarkoitus: number
  kerrosluku: number
  pohjankorkeus: number
  korkeusarvo: number

  st_area: number
}
interface IBuildingSchema {
  id: number
  building_id: string
  gid: number
  distance_poly?: number
  distance_centroid?: number
}

const style: MbStyle = {
  version: 8,
  name: id,
  sources: {
    [id]: {
      type: 'vector',
      tiles: ['https://server.avoin.org/data/map/fi-buildings/{z}/{x}/{y}.pbf.gz'],
      minzoom: 6,
      maxzoom: 13,
      bounds: [19, 59, 32, 71], // Finland
    },
  },
  layers: [
    {
      id: id + '-fill',
      source: id,
      'source-layer': 'default',
      type: 'fill',
      paint: {
        'fill-color': 'cyan',
        'fill-opacity': fillOpacity,
      },
      BEFORE: 'FILL',
    },
    {
      id: id + '-outline',
      source: id,
      'source-layer': 'default',
      type: 'line',
      paint: {
        'line-opacity': 0.75,
      },
      BEFORE: 'OUTLINE',
    },
  ],
}

const popupFunc = (f: Feature) => {
  if (!f) return

  let vrk = '',
    nls = ''
  const props = f.getProperties() as IBuildingSchema

  if (props.building_id) {
    const p = props as unknown as IBuildingSchemaVRK
    vrk = `
        <address>${p.street} ${p.house_number}, ${p.postal_code}</address>
        Building ID: <strong>${p.building_id}</strong>
        `
  }
  if (props.gid) {
    const p = props as unknown as IBuildingSchemaNLS
    const approxArea = 0.888 * p.st_area
    const approxVolume = 3.5 * approxArea

    const floorCountCodes: any = {
      0: 'Unspecified',
      1: '1 or 2 floors',
      2: '3 or more floors',
    }
    const floorCount = floorCountCodes[p.kerrosluku] || 'Unknown'

    nls = `
        <br/>Floor count: ${floorCount}
        ${approxArea > 1 && `<br/>Estimated floorage: ${_.round(approxArea, 2)} m<sup>2</sup> per floor`}
        ${
          approxArea > 1 && approxVolume && `<br/>Estimated volume: ${_.round(approxVolume, 2)} m<sup>3</sup> per floor`
        }
        `
  }
  const html = vrk + nls

  return html
}

const layerConf: LayerConf = { id: id, style: style, popupFunc: popupFunc }

export default layerConf
