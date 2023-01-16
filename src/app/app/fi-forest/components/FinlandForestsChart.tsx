import React, { useEffect, useRef, useState } from 'react'

export const ArvometsaChart = (props: any) => {
  // i.e. which projection/scenario is in use:
  const { scenarioName, cumulativeFlag, perHectareFlag, carbonBalanceDifferenceFlag } = props
  // NB: an unknown scenarioName is also valid; dataset==-1 -> compare against the best option
  const dataset = arvometsaDatasetClasses.indexOf(scenarioName)

  const selectedFeatures = useObservable(SelectedFeatureState.selectedFeatures)
  // -> layer, feature

  useEffect(() => {
    updateMapDetails({ dataset, carbonBalanceDifferenceFlag })
  }, [dataset, carbonBalanceDifferenceFlag])

  if (selectedFeatures.length === 0) return null

  const allFeatureProps = selectedFeatures.map((x) => x.feature.properties)
  const totals = getTotals({ dataset, perHectareFlag, allFeatureProps })

  const attrValues = getDatasetAttributes({ dataset, cumulativeFlag, totals })
  if (carbonBalanceDifferenceFlag) {
    const traditional = getDatasetAttributes({
      dataset: ARVOMETSA_TRADITIONAL_FORESTRY_METHOD,
      cumulativeFlag,
      totals,
    })
    for (const attr in attrValues) {
      attrValues[attr] = attrValues[attr].map((v: number, i: number) => v - traditional[attr][i])
    }
  }

  const selectedLayersOfFeatures = selectedFeatures.map((x) => x.layer)
  const title = getChartTitle(selectedLayersOfFeatures, allFeatureProps)
  const npvText = getNpvText({
    carbonBalanceDifferenceFlag,
    perHectareFlag,
    totals,
    dataset,
  })

  const chartProps = { cumulativeFlag, perHectareFlag, attrValues }
  const cbt = getChartProps({ ...chartProps, prefix: 'cbt' })
  const bio = getChartProps({ ...chartProps, prefix: 'bio' })
  const wood = getChartProps({ ...chartProps, prefix: 'harvested-wood' })

  return (
    <div>
      <h1 id="arvometsa-title">{title}</h1>
      <ChartComponent {...cbt} />
      <ChartComponent {...bio} />
      <ChartComponent {...wood} />
      <h1 id="arvometsa-npv">{npvText}</h1>
      <h1 id="arvometsa-area-forest">{pp(totals.area, 3)} hectares</h1>
      <h1 id="arvometsa-area-total">{pp(1e-4 * totals.st_area, 3)} hectares</h1>
    </div>
  )
}


