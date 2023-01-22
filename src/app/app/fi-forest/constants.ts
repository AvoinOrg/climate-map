import { ILayerOptions, ForestryMethod } from '#/app/app/fi-forest/types'

export const layerOptions: ILayerOptions = {
  fi_forests_country: { minzoom: 0, maxzoom: 5, serverId: 'country' },
  fi_forests_region: { minzoom: 5, maxzoom: 7, serverId: 'region' },
  fi_forests_municipality: { minzoom: 7, maxzoom: 12, serverId: 'municipality' },
  fi_forests_estate: { minzoom: 12, maxzoom: 14, serverId: 'estate' },
  fi_forests_parcel: { minzoom: 14, maxzoom: 16, serverId: 'parcel' },
}

export const colorboxStepsNeg = ['#FFEC42', '#FDF259', '#FCF670', '#F0F596']

export const baseAttrs = `
  cbf1 cbf2 cbf3 cbf4 cbf5
  cbt1 cbt2 cbt3 cbt4 cbt5
  bio0 bio1 bio2 bio3 bio4 bio5
  maa0 maa1 maa2 maa3 maa4 maa5
  npv2 npv3 npv4
  lho0 lho1 lho2 lho3 lho4 lho5
  mus0 mus1 mus2 mus3 mus4 mus5
  puo0 puo1 puo2 puo3 puo4 puo5
  tat0 tat1 tat2 tat3 tat4 tat5
  rou0 rou1 rou2 rou3 rou4 rou5
  sha0 sha1 sha2 sha3 sha4 sha5
  mai0 mai1 mai2 mai3 mai4 mai5
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
export const TRADITIONAL_FORESTRY_METHOD = ForestryMethod['tasaikainen']
export const FILL_COLOR_FORESTRY_METHOD = ForestryMethod['vapaa']

export const carbonStockAttrPrefixes = ['bio', 'maa']
