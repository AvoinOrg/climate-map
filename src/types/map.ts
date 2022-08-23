import { Style as MbStyle } from 'mapbox-gl'
// interface mapFunctions {}

export type SourceType = 'geojson' | 'vector' | 'raster' | 'image' | 'video' | 'canvas'

export type LayerId = 'building_energy_certs' | 'no2' | 'snow_cover_loss'

export type LayerConf = { id: LayerId; style: MbStyle; popupFunc: any }
