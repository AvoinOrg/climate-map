import { Style as MbStyle } from 'mapbox-gl'

import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'mangrove_forests'

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'raster',
        tiles: [
          'https://gis.unep-wcmc.org/arcgis/services/marine/GMW_001_MangroveDistribition_2010/MapServer/WMSServer?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=0&styles=default',
        ],
        tileSize: 256,
        bounds: [-175.3, -38.8, 179.9, 33.8],
        // Creative Commons Attribution 4.0 Unported (CC BY 4.0)
        // http://data.unep-wcmc.org/pdfs/45/WCMC-043-GlobalCH-IFCPS6-2017.pdf
        attribution: '<a href="https://www.eorc.jaxa.jp/ALOS/en/kyoto/mangrovewatch.htm">Global Mangrove Watch</a>',
      },
    },
    layers: [
      {
        id: id + '-raster',
        source: id,
        type: 'raster',
        paint: {},
        BEFORE: 'FILL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
