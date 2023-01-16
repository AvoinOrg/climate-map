export interface ILayerOption {
  minzoom: number
  maxzoom?: number
  serverId: string
}

export interface ILayerOptions {
  [s: string]: ILayerOption
}
