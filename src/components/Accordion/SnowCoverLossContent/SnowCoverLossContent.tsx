import React, { useEffect } from 'react'
import { Container } from '@mui/material'
import { Style } from 'mapbox-gl'

import { LayerToggleControl } from '../AOAccordion'
import { fillOpacity } from 'Utils/mapUtils'

const SnowCoverLossContent = () => {
  // const { isLoaded, addMbStyle } = React.useContext(MapContext)

  // useEffect(() => {
  //   if (isLoaded) {
  //     addMbStyle(style)
  //   }
  // }, [isLoaded])

  const render = (style: Style) => {
    return (
      <Container>
        <LayerToggleControl layerName="snow_cover_loss" label="Show on map" layerStyle={style} />
        <p>
          This layer shows the global decrease in the amount of snow over time. Each area shown corresponds to an area
          that between 1980 and 1990 had at least 10 days of snow on average. This average is contrasted with the
          average snowfall between 1996 and 2016.
        </p>
        <p>
          The data comes from FT-ESDR or
          {} <a href="http://www.ntsg.umt.edu/freeze-thaw/">Freeze/Thaw Earth System Data Record</a>.
        </p>
      </Container>
    )
  }

  const style: Style = {
    version: 8,
    name: 'snow_cover_loss',
    sources: {
      snow_cover_loss: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/snow_cover_loss_2016/{z}/{x}/{y}.pbf'],
        maxzoom: 3,
      },
    },
    layers: [
      {
        id: 'snow_cover_loss-fill',
        source: 'snow_cover_loss',
        'source-layer': 'snow_cover_loss_1980_through_2016',
        type: 'fill',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            snowCoverLossDays,
            0,
            'rgb(255,255,255)',
            8,
            'rgb(128,128,128)',
            15,
            'rgb(252,113,34)', // orange
            21,
            'rgb(245,17,72)', // red
          ],
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: 'snow_cover_loss-sym',
        source: 'snow_cover_loss',
        'source-layer': 'snow_cover_loss_1980_through_2016',
        type: 'symbol',
        minzoom: 10,
        paint: {},
        layout: {
          'text-size': 20,
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-field': [
            'concat',
            // "Snow cover lost per year: ", snowCoverLossDays,
            // "\n",
            'Days with snow (1980..1990): ',
            ['get', 'avg_snow_cover_1980_1990'],
            '\n',
            'Days with snow (1996..2016): ',
            ['get', 'avg_snow_cover_1996_2016'],
          ],
        },
        BEFORE: 'LABEL',
      },
    ],
  }

  //  registerGroup('snow_cover_loss', ['snow_cover_loss-fill', 'snow_cover_loss-sym'])
  return render(style)
}

const snowCoverLossDays = ['-', ['get', 'avg_snow_cover_1980_1990'], ['get', 'avg_snow_cover_1996_2016']]

export default SnowCoverLossContent
