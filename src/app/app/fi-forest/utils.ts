import _ from 'lodash'
import { Expression } from 'mapbox-gl'
import { GeoJsonProperties } from 'geojson'

import {
  baseAttrs,
  omittedConstantAttrs,
  harvestedWoodAttrs,
  CO2_TONS_PER_PERSON,
  nC_to_CO2,
  TRADITIONAL_FORESTRY_METHOD,
  FILL_COLOR_FORESTRY_METHOD,
  carbonStockAttrPrefixes,
  colorboxStepsNeg,
  layerOptions,
} from './constants'
import { ForestryMethod } from './types'
import { assert } from '#/utils/mapUtils'

export const stepsToLinear = (min: number, max: number, steps: string[]) => {
  const step = (max - min) / (steps.length - 1)
  const res: any[] = []
  let cur = min
  for (const s of steps) {
    res.push(cur)
    res.push(s)
    cur += step
  }
  return res
}

export const fiForestsAreaCO2FillColor: (expr: Expression) => Expression = (expr) => [
  'interpolate',
  ['linear'],
  expr,
  ...stepsToLinear(-5, 0, colorboxStepsNeg).concat([0.01, 'hsla(159, 100%, 50%, 1)', 15, 'hsla(159, 100%, 25%, 1)']),
]

export const fiForestsSumMethodAttrs: (
  method: number | Expression,
  attrPrefix: string,
  attrSuffix: string
) => Expression = (method, attrPrefix, attrSuffix) => {
  const expr: Expression = [
    'let',
    'p',
    ['concat', 'f', method, '_'],
    [
      '*',
      1 / 50,
      [
        '+',
        ['get', ['concat', ['var', 'p'], `${attrPrefix}1${attrSuffix}`]],
        ['get', ['concat', ['var', 'p'], `${attrPrefix}2${attrSuffix}`]],
        ['get', ['concat', ['var', 'p'], `${attrPrefix}3${attrSuffix}`]],
        ['get', ['concat', ['var', 'p'], `${attrPrefix}4${attrSuffix}`]],
        ['get', ['concat', ['var', 'p'], `${attrPrefix}5${attrSuffix}`]],
      ],
    ],
  ]
  return expr
}

export const fiForestsBestMethodCumulativeSumCbt = fiForestsSumMethodAttrs(
  FILL_COLOR_FORESTRY_METHOD,
  'cbt',
  '_area_mult_sum'
)

export const fiForestsCumulativeCO2eValueExpr = fiForestsBestMethodCumulativeSumCbt

export const arvometsaBestMethodVsOther: (
  method: number | Expression,
  attrPrefix: string,
  attrSuffix: string
) => Expression = (method, attrPrefix, attrSuffix) => [
  '-',
  fiForestsSumMethodAttrs(method, attrPrefix, attrSuffix),
  fiForestsSumMethodAttrs(TRADITIONAL_FORESTRY_METHOD, attrPrefix, attrSuffix),
]

export const updateMapDetails = ({ dataset, carbonBalanceDifferenceFlag }: any) => {
  const co2eValueExpr = fiForestsSumMethodAttrs(dataset, 'cbt', '_area_mult_sum')

  const arvometsaRelativeCO2eValueExpr = arvometsaBestMethodVsOther(dataset, 'cbt', '_area_mult_sum')

  const fillColor = carbonBalanceDifferenceFlag
    ? fiForestsAreaCO2FillColor(arvometsaRelativeCO2eValueExpr)
    : fiForestsAreaCO2FillColor(co2eValueExpr)

  // TODO: Add execWithMapLoaded function
  // execWithMapLoaded(() => {
  //   for (const type of Object.keys(layerOptions)) {
  //     setPaintProperty(`${type}-fill`, 'fill-color', fillColor)
  //   }
  //   setLayoutProperty('arvometsa-sym', 'text-field', fiForestsTextfieldExpression(co2eValueExpr))
  // })
}

export const getChartDatasets = (prefix: string, attrValues: any) => {
  switch (prefix) {
    case 'cbt':
      return [
        {
          label: 'Soil',
          backgroundColor: '#364858',
          data: attrValues.soilCB,
        },
        {
          label: 'Trees',
          backgroundColor: '#51c0c0',
          data: attrValues.treeCB,
        },
        {
          label: 'Products',
          backgroundColor: '#fa6388',
          data: attrValues.productsCB,
        },
      ]
    case 'bio':
      return [
        {
          label: 'Soil',
          backgroundColor: '#364858',
          data: attrValues.maa,
        },
        {
          label: 'Trees',
          backgroundColor: '#51c0c0',
          data: attrValues.bio,
        },
      ]
    case 'harvested-wood':
      return [
        {
          label: 'Sawlog',
          backgroundColor: '#51c0c0',
          data: attrValues.tukki,
        },
        {
          label: 'Pulpwood',
          backgroundColor: '#364858',
          data: attrValues.kuitu,
        },
      ]
    default:
      assert(false, `Invalid prefix: ${prefix}`)
  }
}

export const getUnitPerArea = (prefix: string, cumulative: boolean, perHectareFlag: boolean) => {
  const baseUnit = getUnit(prefix, cumulative)
  const unit = perHectareFlag ? `${baseUnit}/ha` : baseUnit
  return unit
}

export const getUnit = (prefix: string, cumulative: boolean) => {
  if (prefix === 'harvested-wood') {
    return 'm³'
  } else if (carbonStockAttrPrefixes.indexOf(prefix) !== -1) {
    return 'tons C'
  } else if (cumulative) {
    return 'tons CO₂eq'
  } else {
    return 'tons CO₂eq/y'
  }
}

export const getDatasetAttributes = ({ dataset, cumulativeFlag, totals }: any) => {
  const attrGroups = baseAttrs.split('\n').concat(harvestedWoodAttrs)

  const dsAttrValues = {
    cbf: [],
    cbt: [],
    bio: [],
    maa: [],
    tukki: [],
    kuitu: [],
    productsCB: [],
    soilCB: [],
    treeCB: [],
  }

  for (const attrGroup of attrGroups) {
    const prefix =
      attrGroup.indexOf('kasittely') !== -1 ? attrGroup.trim().split(/[_ ]/)[2] : attrGroup.trim().slice(0, 3)
    const attrs = attrGroup
      .trim()
      .split(/ /)
      .map((attr) => `m${dataset}_${attr}`)

    if (prefix === 'npv') continue // Cannot accumulate NPV values

    const attrV: number[] = []
    for (const attr of attrs) {
      const isCarbonStock = carbonStockAttrPrefixes.indexOf(prefix) !== -1
      const cumulative = cumulativeFlag && !isCarbonStock

      const prev = cumulative && attrV.length > 0 ? attrV[attrV.length - 1] : 0
      attrV.push(prev + totals[attr])
    }
    dsAttrValues[prefix] = attrV
  }

  // Soil carbon content is the absolute amount of carbon in the soil, so it's not cumulative or per decade.
  // Here, we make it one of those:
  if (cumulativeFlag) {
    dsAttrValues.soilCB = dsAttrValues.maa.slice(1).map((v, _) => v - dsAttrValues.maa[0])
  } else {
    dsAttrValues.soilCB = dsAttrValues.maa.slice(1).map((v, i) => v - dsAttrValues.maa[i])
  }
  // tons carbon -> tons CO₂e approx TODO: verify
  dsAttrValues.soilCB = dsAttrValues.soilCB.map((x) => x * nC_to_CO2)

  dsAttrValues.productsCB = dsAttrValues.cbt.map((cbtValue, i) => cbtValue - dsAttrValues.cbf[i])
  dsAttrValues.treeCB = dsAttrValues.cbf.map((cbfValue, i) => cbfValue - dsAttrValues.soilCB[i])

  return dsAttrValues
}

export const getTotals = (
  forestryMethod: ForestryMethod,
  perHectareFlag: boolean,
  allFeatureProps: GeoJsonProperties[]
) => {
  const totals: any = { area: 0, st_area: 0 }
  const totalBaseAttrs = (harvestedWoodAttrs.join(' ') + ' ' + baseAttrs).split(/\s+/)
  for (const dsNum of [forestryMethod, TRADITIONAL_FORESTRY_METHOD]) {
    for (const attr of totalBaseAttrs) {
      totals[`f${dsNum}_${attr}_area_mult_sum`] = 0
    }
  }
  const areaProportionalAttrs = Object.keys(totals).filter((x) => x !== 'area')

  // const reMatchAttr = /m-?\d_(.*)/

  const seenIds: any = {}

  // In principle, multiple features' data can be aggregated here.
  // In practice, we just use one at the moment.
  for (const p of allFeatureProps) {
    if (!p) {
      continue
    }
    // Degenerate cases:
    if (p.f1_cbt1_area_mult != null) {
      continue
    }
    if (!p.area) {
      continue
    } // hypothetical

    // Duplicates are possible, so we must only aggregate only once per ID:
    const id = p.localid || p.standid
    if (id in seenIds) {
      continue
    }
    seenIds[id] = true

    totals.area += p.area
    totals.st_area += p.st_area || p.area

    // TODO: check if this is still needed
    // if (ForestryMethod === BEST_METHOD_FOR_EACH) {
    //   for (const a of areaProportionalAttrs) {
    //     const attr = `m${p.best_method}_${reMatchAttr.exec(a)[1]}`
    //     if (!(attr in p) && !(attr in omittedConstantAttrs)) {
    //       console.error('Invalid attr:', attr, 'orig:', a, 'props:', p)
    //     }
    //     totals[a] += p[attr] * p.area
    //   }
    //   continue
    // }

    for (const a of areaProportionalAttrs) {
      if (a in p) {
        totals[a] += p[a] * p.area
      }
    }
  }

  if (perHectareFlag) {
    for (const a in totals) {
      if (a !== 'area') {
        totals[a] /= totals.area
      }
    }
  }

  return totals
}

export const getChartProps = ({ prefix, cumulativeFlag, perHectareFlag, attrValues }) => {
  // carbon stock is not counted cumulatively.
  const isCarbonStock = carbonStockAttrPrefixes.indexOf(prefix) !== -1
  const cumulative = cumulativeFlag && !isCarbonStock

  const unit = getUnitPerArea(prefix, cumulative, perHectareFlag)
  const stacked = true

  const datasets = getChartDatasets(prefix, attrValues)

  // I.e. the decades
  const prefixLabels = {
    cbf: ['10', '20', '30', '40', '50'],
    cbt: ['10', '20', '30', '40', '50'],
    bio: ['0', '10', '20', '30', '40', '50'],
    'harvested-wood': ['10', '20', '30', '40', '50'],
  }

  const labelCallback = function (tooltipItem: Chart.ChartTooltipItem, data: Chart.ChartData) {
    const label = data.datasets[tooltipItem.datasetIndex].label
    const v = pp(+tooltipItem.yLabel, 2)
    return `${label}: ${v} ${unit}`
  }

  const chartUpdateFunction = (chart) => {
    chart.data.datasets.forEach((ds: Chart.ChartDataSets, i: number) => {
      ds.data = datasets[i].data
    })
    chart.options.tooltips.callbacks.label = labelCallback
    chart.update()
  }

  const options = {
    animation: { duration: 0 },
    scales: {
      x: {
        stacked,
        scaleLabel: { display: true, labelString: 'years from now' },
      },
      y: {
        stacked,
        ticks: {
          maxTicksLimit: 8,
          beginAtZero: true,
          callback: (value, _index, _values) => value.toLocaleString(),
        },
      },
    },
    tooltips: {
      callbacks: { label: labelCallback },
    },
  }
  const chartOptions = {
    type: 'bar',
    data: { labels: prefixLabels[prefix], datasets },
    options,
  }

  return { chartOptions, chartUpdateFunction }
}

export const getNpvText = ({ carbonBalanceDifferenceFlag, perHectareFlag, totals, dataset }) => {
  // The comparison is too confusing IMO. Disabled for now.
  // const npvComparison = (
  //   carbonBalanceDifferenceFlag
  //     ? totals[`m${TRADITIONAL_FORESTRY_METHOD}_npv3`]
  //     : 0
  // )
  const npvComparison = 0
  const npvValue = dataset === 0 ? null : totals[`m${dataset}_npv3`] - npvComparison
  return npvValue === 0 || npvValue ? `${pp(npvValue)} €${perHectareFlag ? ' per ha' : ''}` : '-'
}

export const getChartTitleSingleLayer = (selectedFeatureLayer: string, featureProps: any[], multiple: boolean) => {
  assert(selectedFeatureLayer, 'selectedFeatureLayer must be set')
  if (selectedFeatureLayer === 'arvometsa-fill') {
    const name = featureProps.map((p) => p.standid).join(', ')
    if (multiple) return `Multiple forest parcels selected: standids = ${name}`
    return `Forest parcel (standid: ${name})`
  } else if (selectedFeatureLayer === 'arvometsa-property-fill') {
    const name = featureProps.map((p) => p.tpteksti).join(', ')
    if (multiple) return `Multiple properties selected: ${name}`
    return `Property with forest (${name})`
  } else {
    assert(_.every(featureProps.map((p) => p.name_fi)), `Expected name_fi: ${selectedFeatureLayer}`)
    const name = featureProps.map((p) => p.name_fi || p.name_sv).join(', ')
    if (multiple) return `Multiple administrative areas selected: ${name}`
    return name
  }
}

export const getChartTitle = (selectedFeatureLayers: string[], featureProps: any[]) => {
  if (featureProps.length === 0) return 'No area selected'

  assert(selectedFeatureLayers.length > 0, 'selectedFeatureLayer must be non-empty')
  const uniqueLayers = Array.from(new Set(selectedFeatureLayers))
  if (uniqueLayers.length > 1) return 'Areas selected across multiple scales: double-counting an area is possible'

  return getChartTitleSingleLayer(uniqueLayers[0], featureProps, selectedFeatureLayers.length > 1)
}

export const onChangeCheckbox = (callback: React.Dispatch<React.SetStateAction<boolean>>) => {
  return (event: any) => {
    callback((event.target as HTMLInputElement).checked)
  }
}
export const onChangeValue = (callback: React.Dispatch<React.SetStateAction<any>>) => {
  return (event: any) => {
    callback((event.target as HTMLInputElement).value)
  }
}
