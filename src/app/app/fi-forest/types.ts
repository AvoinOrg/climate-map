export interface ILayerOption {
  minzoom: number
  maxzoom?: number
  serverId: string
}

export interface ILayerOptions {
  [s: string]: ILayerOption
}

export enum ForestryMethod {
  'eihakata' = 1,
  'jatkuva' = 2,
  'tasaikainen' = 3,
  'vapaa' = 4,
}
