import { StringValueOf } from '#/types/general'

export enum LayerLevel {
  Parcel = 'fi_forest_parcel',
  Estate = 'fi_forest_estate',
  Municipality = 'fi_forest_municipality',
  Region = 'fi_forest_region',
  Country = 'fi_forest_country',
}

export type LayerLevelStrings = StringValueOf<LayerLevel>

export interface ILayerOption {
  minzoom: number
  maxzoom?: number
  serverId: string
}

export type ILayerOptions = {
  [key in LayerLevelStrings]: ILayerOption
}

export enum ForestryMethod {
  'eihakata' = 1,
  'jatkuva' = 2,
  'tasaikainen' = 3,
  'vapaa' = 4,
}
