import { StringValueOf } from '#/common/types/general'
import { ILayerOption } from '#/common/types/map'

export enum LayerLevel {
  Helsinki_buildings = 'fi_misc_helsinki_buildings',
}
export type LayerLevelStrings = StringValueOf<LayerLevel>

export type ILayerOptions = {
  [key in LayerLevelStrings]: ILayerOption
}
