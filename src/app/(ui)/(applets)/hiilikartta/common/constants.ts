import { CarbonChangeColorItem } from './types'

export const SIDEBAR_WIDTH_REM = 30

export const CARBON_CHANGE_COLORS: CarbonChangeColorItem[] = [
  { min: -100, max: -50, color: '#C54032' },
  { min: -50, max: -25, color: '#F25050' },
  { min: -25, max: -10, color: '#E9B76D' },
  { min: -10, max: -1, color: '#F3F577' },
  { min: -1, max: 1, color: '#E7E8BF' },
  { min: 1, max: 10, color: '#C7DAD5' },
  { min: 10, max: 25, color: '#AAC0BC' },
  { min: 25, max: 50, color: '#87A19D' },
  { min: 50, max: 100, color: '#568175' },
]

export const CARBON_CHANGE_NO_DATA_COLOR = '#D9D9D9'

export const ZONING_CLASSES = [
  {
    name: 'Asuinalueet',
    code: 'A',
    color_hex: '#C6AA76',
    color_pantone: '466',
  },
  {
    name: 'Kerrostaloalueet',
    code: 'AK',
    color_hex: '#AD7C59',
    color_pantone: '4645',
  },
  {
    name: 'Pientaloalueet',
    code: 'AP',
    color_hex: '#C6AA76',
    color_pantone: '466',
  },
  {
    name: 'Keskustatoiminnot',
    code: 'C',
    color_hex: '#BF0D3E',
    color_pantone: '193',
  },
  {
    name: 'Palvelut',
    code: 'P',
    color_hex: '#ECA154',
    color_pantone: '157',
  },
  {
    name: 'Elinkeinot',
    code: 'K',
    color_hex: '#ECA154',
    color_pantone: '157',
  },
  {
    name: 'Liike- ja toimistorakennukset',
    code: 'KL',
    color_hex: '#ECA154',
    color_pantone: '157',
  },
  {
    name: 'Teollisuus- ja varastoalueet',
    code: 'T',
    color_hex: '#651D32',
    color_pantone: '421',
  },
  {
    name: 'Virkistys',
    code: 'V',
    color_hex: '#64A70B ',
    color_pantone: '369',
  },
  {
    name: 'Puisto, leikkipuisto',
    code: 'VP',
    color_hex: '#64A70B ',
    color_pantone: '369',
  },
  {
    name: 'Lähivirkistysalue, lähimetsä',
    code: 'VL',
    color_hex: '#64A70B ',
    color_pantone: '369',
  },
  {
    name: 'Urheilualue',
    code: 'VU',
    color_hex: '#64A70B ',
    color_pantone: '369',
  },
  {
    name: 'Retkeily- ja ulkoilualue',
    code: 'VR',
    color_hex: '#64A70B ',
    color_pantone: '369',
  },
  {
    name: 'Loma-asuminen ja matkailu',
    code: 'R',
    color_hex: '#FED141',
    color_pantone: '122',
  },
  {
    name: 'Loma-asuntojen alue',
    code: 'RA',
    color_hex: '#FED141',
    color_pantone: '122',
  },
  {
    name: 'Matkailualue',
    code: 'RM',
    color_hex: '#FED141',
    color_pantone: '122',
  },
  {
    name: 'Liikennealue',
    code: 'L',
    color_hex: '#ECC7CD',
    color_pantone: '196',
  },
  {
    name: 'Erityisalue',
    code: 'E',
    color_hex: '#F1A7DC ',
    color_pantone: '236',
  },
  {
    name: 'Yhdyskuntatekniikan alueet',
    code: 'ET',
    color_hex: '#F1A7DC ',
    color_pantone: '236',
  },
  {
    name: 'Energiahuollon alueet',
    code: 'EN',
    color_hex: '#F1A7DC ',
    color_pantone: '236',
  },
  {
    name: 'Jätteenkäsittelyalueet',
    code: 'EJ',
    color_hex: '#F1A7DC ',
    color_pantone: '236',
  },
  {
    name: 'Maa-ainestenotto- ja kaivosalueet',
    code: 'EO',
    color_hex: '#F1A7DC ',
    color_pantone: '236',
  },
  {
    name: 'Hautausmaat',
    code: 'EH',
    color_hex: '#2DCCD3 ',
    color_pantone: '319',
  },
  {
    name: 'Suojaviheralueet',
    code: 'EV',
    color_hex: '#2DCCD3        ',
    color_pantone: '319',
  },
  {
    name: 'Suojelualueet',
    code: 'S',
    color_hex: '#9CDBD9',
    color_pantone: '324',
  },
  {
    name: 'Luonnon suojelualueet',
    code: 'SL',
    color_hex: '#9CDBD9',
    color_pantone: '324',
  },
  {
    name: 'Rakennussuojelulain mukaiset suojelualueet',
    code: 'SR',
    color_hex: '#9CDBD9',
    color_pantone: '324',
  },
  {
    name: 'Maa- ja metsätalous',
    code: 'M',
    color_hex: '#D0DF00',
    color_pantone: '389',
  },
  {
    name: 'Maatalousalue',
    code: 'MT',
    color_hex: '#E3E48D',
    color_pantone: '587',
  },
  {
    name: 'Kotielintalous, puutarha, kasvihuone',
    code: 'ME',
    color_hex: '#ADA400',
    color_pantone: '398',
  },
  {
    name: 'Vesialueet',
    code: 'W',
    color_hex: '#B9D9EB',
    color_pantone: '290',
  },
]
