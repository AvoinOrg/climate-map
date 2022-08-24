// Exports the layer configurations to the Map component.

import buildingEnergyCertificates from './Buildings/builidingEnergyCertificates'
import snowCoverLoss from './SnowCoverLoss/snowCoverLoss'
import airQuality from './AirQuality/airQuality'

const layerConfs = [buildingEnergyCertificates, snowCoverLoss, airQuality]

export default layerConfs
