import { StringValueOf } from './general'

export enum LayerLevel {
    Helsinki_buildings = 'fi_miscs_helsinki_buildings',
    Helsinki_apartment_buildings = 'fi_miscs_helsinki_apartment_buildings',
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