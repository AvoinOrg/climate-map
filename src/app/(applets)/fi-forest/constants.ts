import { ILayerOptions, ForestryMethod, LayerLevel } from '#/app/(applets)/fi-forest/types'

export const layerOptions: ILayerOptions = {
  [LayerLevel.Country]: { minzoom: 0, maxzoom: 5, serverId: 'country', layerMinzoom: 0, layerMaxzoom: 5 },
  [LayerLevel.Region]: { minzoom: 5, maxzoom: 7, serverId: 'region', layerMinzoom: 5, layerMaxzoom: 7 },
  [LayerLevel.Municipality]: { minzoom: 7, maxzoom: 12, serverId: 'municipality', layerMinzoom: 7, layerMaxzoom: 12 },
  [LayerLevel.Estate]: { minzoom: 12, maxzoom: 14, serverId: 'estate', layerMinzoom: 12, layerMaxzoom: 14 },
  [LayerLevel.Parcel]: { minzoom: 14, maxzoom: 16, serverId: 'parcel', layerMinzoom: 14, layerMaxzoom: undefined },
} as const

export const colorboxStepsNeg = ['#FFEC42', '#FDF259', '#FCF670', '#F0F596']

export const baseAttrs = `
  cbf1 cbf2 cbf3 cbf4 cbf5
  cbt1 cbt2 cbt3 cbt4 cbt5
  bio0 bio1 bio2 bio3 bio4 bio5
  maa0 maa1 maa2 maa3 maa4 maa5
  npv2 npv3 npv4
  `.trim()

export const omittedConstantAttrs = {
  f1_k1_kui_area_mult: true,
  f1_k2_kui_area_mult: true,
  f1_k3_kui_area_mult: true,
  f1_k4_kui_area_mult: true,
  f1_k5_kui_area_mult: true,
  f1_k1_tuk_area_mult: true,
  f1_k2_tuk_area_mult: true,
  f1_k3_tuk_area_mult: true,
  f1_k4_tuk_area_mult: true,
  f1_k5_tuk_area_mult: true,
}

export const harvestedWoodAttrs = [
  [1, 2, 3, 4, 5].map((x) => `k${x}_tuk`).join(' '),
  [1, 2, 3, 4, 5].map((x) => `k${x}_kui`).join(' '),
]

export const CO2_TONS_PER_PERSON = 7.0 // EU-27 in 2018

export const nC_to_CO2 = 44 / 12

// export const TRADITIONAL_FORESTRY_METHOD_KEY = 'tasaikainen'
export const TRADITIONAL_FORESTRY_METHOD = ForestryMethod.tasaikainen
export const FILL_COLOR_FORESTRY_METHOD = ForestryMethod.vapaa

export const carbonStockAttrPrefixes = ['bio', 'maa']

export const titleRenames: any = {
  'Etelä-Suomen aluehallintovirasto': 'Etelä-Suomi',
  'Itä-Suomen aluehallintovirasto': 'Itä-Suomi',
  'Länsi- ja Sisä-Suomen aluehallintovirasto': 'Länsi-Suomi',
  'Lapin aluehallintovirasto': 'Lappi',
  'Lounais-Suomen aluehallintovirasto': 'Lounais-Suomi',
  'Pohjois-Suomen aluehallintovirasto': 'Pohjois-Suomi',
}
