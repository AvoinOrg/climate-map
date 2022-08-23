import React from 'react'
import { Container } from '@mui/material'
import { Style } from 'mapbox-gl'

import { LayerToggleControl } from '../AOAccordion'

const no2Tileset = Number.parseInt(window.location.search.substring(1), 10) || 0
const timestampHour = Math.round(+new Date() / 1e6)

const AirQualityContent = () => {
  const render = (style: Style) => {
    return (
      <Container>
        <h2>Air pollution indicator - NO₂</h2>

        <LayerToggleControl layerName="no2" label="Show on map" layerStyle={style} />

        <p>Burning of fossil fuel creates oir pollutants such as NO₂ and small particles.</p>

        <strong>Air cleanliness</strong>

        <p>
          The satellite NO₂ data is based on Sentinel 5P measurements and is updated approximately once per 24 hours for
          any given location. A healthy threshold of NO₂ is around 50 umol/m<sup>2</sup>.
        </p>
      </Container>
    )
  }

  const style: Style = {
    version: 8,
    name: 'no2',
    sources: {
      no2: {
        type: 'raster',
        tiles: [
          'https://server.avoin.org/data/map/atmoshack/mbtiles-dump/' +
            no2Tileset +
            '/{z}/{x}/{y}.png?v=5&_=' +
            timestampHour,
        ],
        maxzoom: 5,
        attribution: '<a href="https://www.esa.int/ESA">ESA</a>',
      },
    },
    layers: [
      {
        id: 'no2-raster',
        source: 'no2',
        type: 'raster',
        minzoom: 0,
        maxzoom: 10,
        paint: {
          'raster-opacity': 0.7,
        },
        BEFORE: 'FILL',
      },
    ],
  }

  return render(style)
}

export default AirQualityContent
