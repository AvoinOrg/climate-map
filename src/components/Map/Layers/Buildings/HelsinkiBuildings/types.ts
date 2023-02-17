import { StringValueOf } from './general'

export enum LayerLevel {
    helsinki_buildings = 'helsinki_buildinds',
    helsinki_apartment_buildings = 'helsinki_apartment_buildings',
  }

  export type LayerLevelStrings = StringValueOf<LayerLevel>

  export interface ILayerOption {    
    serverId: string    
    minzoom: number
    maxzoom?: number
    layerMinzoom?: number | null
    layerMaxzoom?: number | null
  }
  
  export type ILayerOptions = {
    [key in LayerLevelStrings]: ILayerOption
  }