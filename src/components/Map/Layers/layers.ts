// Exports the layer configurations to the Map component.

import buildingEnergyCertificates from './Buildings/buildingEnergyCertificates'
import finlandBuildings from './Buildings/finlandBuildings'
import helsinkiBuildings from './Buildings/helsinkiBuildings'
import snowCoverLoss from './SnowCoverLoss/snowCoverLoss'
import airQuality from './AirQuality/airQuality'

const layerConfs = [buildingEnergyCertificates, snowCoverLoss, airQuality, finlandBuildings, helsinkiBuildings]

export default layerConfs
