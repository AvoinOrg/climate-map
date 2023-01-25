import { Style as MbStyle, AnyLayer, RasterSource } from 'mapbox-gl'

import { LayerId, LayerConf } from '#/common/types/map'

const id: LayerId = 'zonation'

const zonationVersions = [1, 2, 3, 4, 5, 6]

const getZonationSources = () => {
  const sources: { [index: string]: RasterSource } = {}

  zonationVersions.forEach((v) => {
    const id = `zonation-v${v}`

    sources[id] = {
      type: 'raster',
      tiles: [`https://server.avoin.org/data/map/zonation/MetZa2018_VMA0${v}/{z}/{x}/{y}.png?v=7`],
      minzoom: 5,
      maxzoom: 9,
      bounds: [19, 59, 32, 71], // Finland
      // Creative Commons 4.0
      // © SYKE Datasources: Finnish Forest Centre, Metsähallitus, Natural Resources Institute Finland, Finnish Environment Institute, National Land Survey of Finland, Hansen/UMD/Google/USGS/NASA
      attribution:
        '<a href="http://metatieto.ymparisto.fi:8080/geoportal/catalog/search/resource/details.page?uuid=%7B8E4EA3B2-A542-4C39-890C-DD7DED33AAE1%7D">© SYKE Datasources</a>',
    }
  })

  return sources
}

const getZonationLayers = () => {
  const layers: AnyLayer[] = []

  zonationVersions.forEach((v) => {
    const id = `zonation-v${v}`

    layers.push({
      id: id + `-fill`,
      source: id,
      type: 'raster',
      minzoom: 0,
      // 'maxzoom': 10,
      paint: {
        'raster-opacity': 0.6,
      },
      BEFORE: 'FILL',
    })
  })

  return layers
}

const getStyle = async (): Promise<MbStyle> => {
  const style: MbStyle = {
    version: 8,
    name: id,
    sources: getZonationSources(),
    layers: getZonationLayers(),
  }

  return style
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
