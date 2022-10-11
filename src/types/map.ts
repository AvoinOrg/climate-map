import { Style as MbStyle } from 'mapbox-gl'
// interface mapFunctions {}

export type SourceType = 'geojson' | 'vector' | 'raster' | 'image' | 'video' | 'canvas'

export type LayerId =
  | 'building_energy_certs'
  | 'no2'
  | 'snow_cover_loss'
  | 'fi_buildings'
  | 'helsinki_buildings'
  | 'hsy_solarpotential'
  | 'fi_bogs'
  | 'cifor_peatdepth'
  | 'cifor_wetlands'

export type LayerConf = { id: LayerId; style: MbStyle; popupFunc?: any }
