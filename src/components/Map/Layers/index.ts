// Exports the layer configurations to the Map component.

import buildingEnergyCertificates from './Buildings/BuildingEnergyCertificates'
// import finlandBuildings from './Buildings/finlandBuildings'
import hsySolarpotential from './Buildings/HsySolarPotential'
import helsinkiBuildings from './Buildings/HelsinkiBuildings'
import snowCoverLoss from './SnowCoverLoss'
import airQuality from './AirQuality'
import finlandBogs from './Wetlands/FinlandBogs'
import ciforPeatlands from './Wetlands/CiforPeatlands'
import ciforWetlands from './Wetlands/CiforWetlands'
import metsaanEteBasic from './Biodiversity/MetsaanEteBasic'
import metsaanEteImportant from './Biodiversity/MetsaanEteImportant'
import zonation from './Biodiversity/Zonation'
import natura2000 from './Biodiversity/Natura2000'
import hansen from './Forests/Hansen'
import finlandMatureForests from './Forests/FinlandMatureForests'
import mangroveForests from './Forests/MangroveForests'

export const layerConfs = [
  buildingEnergyCertificates,
  snowCoverLoss,
  airQuality,
  hsySolarpotential,
  helsinkiBuildings,
  finlandBogs,
  ciforPeatlands,
  ciforWetlands,
  metsaanEteBasic,
  metsaanEteImportant,
  zonation,
  natura2000,
  hansen,
  finlandMatureForests,
  mangroveForests,
]
