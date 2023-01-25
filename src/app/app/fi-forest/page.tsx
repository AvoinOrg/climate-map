'use client'

import React, { useContext, useState, useEffect } from 'react'
import {
  Button,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  Paper,
  Select,
} from '@mui/material'
import Chart from 'chart.js/auto'
import { Expression } from 'mapbox-gl'
import { useObservable } from 'micro-observables'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import _ from 'lodash'
import Link from 'next/link'

// import * as Analytics from 'src/map/analytics'

// import {
//   fitBounds,
//   genericPopupHandler,
//   querySourceFeatures,
//   setFilter,
//   setLayoutProperty,
//   setPaintProperty,
// } from '../../Map/map'

import { onChangeCheckbox, getTotals } from './utils'
import { useUpdateMapDetails } from './hooks/useUpdateMapDetails'
import { ForestryMethod } from './types'
import { assert } from '#/common/utils/mapUtils'
// import { setOverlayMessage } from '../../OverlayMessages/OverlayMessages'
// import * as SelectedFeatureState from './ArvometsaSelectedLayer'
import { HeaderTable, SimpleTable } from './components/FinlandForestsTable'
import { CO2_TONS_PER_PERSON, TRADITIONAL_FORESTRY_METHOD, layerOptions } from './constants'

import { setIsSidebarOpen } from '#/components/State/UiState'
// import { setSearchPlaceholder } from '../../NavBar/NavBarSearch'
import { MapContext } from '#/components/Map'
import { finlandForests } from './layers'

// import arvometsaLogo from './assets/arvometsa_logo.png'

const LAYER_TITLE = `Finland's forests`

// for (const sourceName of Object.keys(layerOptions)) {
//   const layerName = `${sourceName}-fill`
//   // eslint-disable-next-line no-loop-func
//   genericPopupHandler(layerName, (ev) => {
//     const feature = ev.features[0]

//     // Only copy over currently selected features:
//     const idName = layerOptions[sourceName].id
//     const id = feature.properties[idName]

//     // A bit of a hack: Ensure feature.id refers to some meaningful identifier for highlighting etc.
//     feature.id = id

//     assert(id !== null && id !== undefined, `Feature has no id: ${JSON.stringify(feature.properties)}`)

//     const bounds = querySourceFeatures(sourceName, 'default')
//       .filter((f) => f.properties[idName] === id)
//       .map((f) => f.bbox || getGeoJsonGeometryBounds((f.geometry as any).coordinates))
//       .reduce(
//         ([a1, b1, c1, d1], [a2, b2, c2, d2]) => [
//           Math.min(a1, a2),
//           Math.min(b1, b2),
//           Math.max(c1, c2),
//           Math.max(d1, d2),
//         ],
//         [999, 999, -999, -999] // fallback bounds
//       )

//     const prevSelectedFeatures = SelectedFeatureState.selectedFeatures.get()
//     SelectedFeatureState.selectFeature({ layer: layerName, feature, bounds })

//     const oldIds = prevSelectedFeatures.map((x) => x.feature.id)
//     const newIds = oldIds.includes(id) ? oldIds.filter((x) => x !== id) : oldIds.concat(id)

//     const newFilter = ['in', idName, ...newIds]
//     setFilter(`${sourceName}-highlighted`, newFilter)
//     console.debug(`${sourceName}-highlighted`, newFilter)

//     // Open the report panel immediately when a feature was selected and nothing was selected prior to it.
//     if (feature && prevSelectedFeatures.length === 0) setIsSidebarOpen(true)

//     if (newIds.includes(id)) Analytics.setParams({ highlightedFeatureId: id })
//   })
// }

const FinlandForests = () => {
  const { enableLayerGroup, useFilteredSelectedFeatures } = useContext(MapContext)
  const updateMapDetails = useUpdateMapDetails()
  const [hasFeature, setHasFeature] = useState(false)
  const filteredFeatures = useFilteredSelectedFeatures(Object.keys(layerOptions).map((x) => `${x}-fill`))

  useEffect(() => {
    enableLayerGroup('fi_forests', finlandForests)
  }, [])

  useEffect(() => {
    const newHasFeature = filteredFeatures.length > 0
    setHasFeature(newHasFeature)
    console.log(filteredFeatures)
  }, [filteredFeatures])

  const [reportPanelOpen, setReportPanelOpen] = useState(true)

  const [scenario, setScenario] = useState<ForestryMethod>(ForestryMethod['jatkuva'])
  const [perHectareFlag, setPerHectareFlag] = useState(true)
  const [cumulativeFlag, setCumulativeFlag] = useState(true)
  const [carbonBalanceDifferenceFlag, setCarbonBalanceDifferenceFlag] = useState(true)

  // Analytics.setParams({
  //   reportPanelOpen,
  //   scenario,
  //   perHectareFlag,
  //   cumulativeFlag,
  //   carbonBalanceDifferenceFlag,
  // })

  // i.e. which projection/scenario is in use:
  // NB: an unknown scenarioName is also valid; dataset==-1 -> compare against the best option

  // TODO: enable selected features
  // const { layer, feature, bounds } = useObservable(SelectedFeatureState.selectedFeatures)
  // const hasFeature = selectedFeatures.length > 0

  useEffect(() => {
    // Eliminate confusing options (all zeroes)
    if (scenario === TRADITIONAL_FORESTRY_METHOD && carbonBalanceDifferenceFlag) setCarbonBalanceDifferenceFlag(false)
    updateMapDetails(scenario, carbonBalanceDifferenceFlag)
  }, [scenario, carbonBalanceDifferenceFlag])

  // TODO: enable overlay message and search placeholder
  // useEffect(() => {
  //   setOverlayMessage(!hasFeature, {
  //     layer: LAYER_ID,
  //     message: 'Zoom in and click a forest area for carbon report',
  //   })
  //   setSearchPlaceholder({
  //     layer: LAYER_ID,
  //     placeholder: 'Look up by property ID',
  //   })
  // }, [hasFeature])

  // TODO: Enable charts and values down below
  const allFeatureProps = filteredFeatures.map((x) => x.properties)
  const totals = getTotals(scenario, perHectareFlag, allFeatureProps)

  // const attrValues = getDatasetAttributes({ dataset, cumulativeFlag, totals })
  // if (carbonBalanceDifferenceFlag) {
  //   const traditional = getDatasetAttributes({
  //     dataset: ARVOMETSA_TRADITIONAL_FORESTRY_METHOD,
  //     cumulativeFlag,
  //     totals,
  //   })
  //   for (const attr in attrValues) {
  //     attrValues[attr] = attrValues[attr].map((v: number, i: number) => v - traditional[attr][i])
  //   }
  // }

  // const selectedLayersOfFeatures = selectedFeatures.map((x) => x.layer)
  // const title = getChartTitle(selectedLayersOfFeatures, allFeatureProps)
  // const npvText = getNpvText({
  //   carbonBalanceDifferenceFlag,
  //   perHectareFlag,
  //   totals,
  //   dataset,
  // })

  // const chartProps = { cumulativeFlag, perHectareFlag, attrValues }
  // const cbt = getChartProps({ ...chartProps, prefix: 'cbt' })
  // const bio = getChartProps({ ...chartProps, prefix: 'bio' })
  // const wood = getChartProps({ ...chartProps, prefix: 'harvested-wood' })

  // const getAverageCarbonBalanceFigure = (totals) => {
  //   const averageCarbonBalanceDecade =
  //     totals[`m${dataset}_cbt1`] -
  //     (carbonBalanceDifferenceFlag ? totals[`m${ARVOMETSA_TRADITIONAL_FORESTRY_METHOD}_cbt1`] : 0)
  //   // per decade -> per year
  //   return averageCarbonBalanceDecade / 10
  // }

  // const averageCarbonBalance = getAverageCarbonBalanceFigure(totals)
  // const unit = perHectareFlag ? 'tons CO₂e/ha/y' : 'tons CO₂e/y'
  // const averageCarbonBalanceText = isNaN(averageCarbonBalance)
  //   ? ''
  //   : `${averageCarbonBalance > 0 ? '+' : ''}${pp(averageCarbonBalance, 2)} ${unit}`

  // const totalsOverall = getTotals({
  //   dataset,
  //   perHectareFlag: false,
  //   allFeatureProps,
  // })
  // const averageCarbonBalanceOverall = getAverageCarbonBalanceFigure(totalsOverall)

  // const headerTitle = titleRenames[title] || title
  // const headerOnClick = () => {
  //   if (!hasFeature) setIsSidebarOpen(false)
  // }
  // const headerRows = [
  //   {
  //     name: (
  //       <div onClick={headerOnClick} style={{ cursor: hasFeature ? 'initial' : 'pointer' }}>
  //         {headerTitle}
  //         {!hasFeature && (
  //           <span>
  //             <br />
  //             <strong>click to show the map</strong>
  //           </span>
  //         )}
  //       </div>
  //     ),
  //     value: `${_.round(1e-4 * totals.st_area, 3)} ha`,
  //   },
  // ]

  // TODO: enable table
  // const tableRows = [
  //   { name: 'Forest area', value: `${_.round(totals.area, 3)} ha` },
  //   // { name: 'Main tree species', value: 'Pine' },
  //   // { name: 'Forest age', value: `${pp(123, 2)} years` },
  //   // { name: 'Biomass volume', value: `${pp(123.45, 2)} m³/ha` },
  //   { name: 'Average carbon balance*', value: averageCarbonBalanceText },
  //   { name: 'Net present value (3% discounting)', value: npvText },
  // ]

  // TODO: check what happens here?
  // const bounds = getCombinedBounds(selectedFeatures.map((x) => x.bounds))
  // const onFitLayerBounds = () => {
  //   if (bounds) {
  //     fitBounds(bounds, 0.4, 0.15)
  //   }
  // }

  const showReport = reportPanelOpen && hasFeature

  const tableTitle = (
    <Link href="/" className="neutral-link" style={{ display: 'flex' }}>
      <ExpandMoreIcon style={{ transform: 'rotate(90deg)' }} />
      {LAYER_TITLE}
    </Link>
  )

  return (
    <div className={showReport ? 'grid-parent' : 'grid-parent grid-parent-report-closed'}>
      <Paper className="grid-col1" elevation={5} style={{ width: '400px' }}>
        <Container>
          {/* TODO: enable headerTable */}
          {/* <HeaderTable title={tableTitle} rows={headerRows} onFitLayerBounds={onFitLayerBounds} /> */}
          <br />
          <Paper>
            <FormControlLabel
              style={{ padding: '4px 10px' }}
              control={<Checkbox />}
              label="Show values per hectare"
              checked={perHectareFlag}
              onChange={(event) => {
                onChangeCheckbox(setPerHectareFlag)(event)
                setReportPanelOpen(true)
              }}
            />
          </Paper>
          <br />
          {/* TODO: enable rows */}
          {/* <SimpleTable rows={tableRows} />  */}
          {/* area stats */}
          <p>* Assuming even-age forestry</p>
          <p>
            * Carbon balance means changes in soil, trees, and wood products. When the carbon balance is positive, more
            carbon is being stored than released.
          </p>
          <p hidden={!hasFeature}>
            {/* TODO: enable this */}
            {/* Equals {_.round(averageCarbonBalanceOverall / CO2_TONS_PER_PERSON, 1)} times average 👤 CO2 emissions */}
          </p>
          <h1>Forestry projections</h1>
          <Divider />
          <FormControl style={{ width: '100%' }}>
            <InputLabel htmlFor="forestry-scenario">Forestry method</InputLabel>
            <Select
              native
              inputProps={{
                name: 'forestry-scenario',
                id: 'forestry-scenario',
              }}
              value={scenario}
              // onChange={(event) => {
              //   onChangeValue(setScenario)(event)
              //   setReportPanelOpen(true)
              // }}
            >
              <option value="arvometsa_eihakata"> No cuttings </option>
              <option value="arvometsa_jatkuva"> Continuous cover forestry </option>
              <option value="arvometsa_ylaharvennus"> Thin from above – extended rotation </option>
              <option value="arvometsa_alaharvennus"> Thin from below – clearfell </option>
              <option value="arvometsa_maxhakkuu"> Removal of tree cover </option>
            </Select>
          </FormControl>
          <br />
          <br />
          <Button variant="contained" color="primary" disabled={!hasFeature} onClick={() => setReportPanelOpen(true)}>
            Open report
          </Button>
          <br />
          <br />
          <Link href="/">
            <Button variant="contained" color="secondary">
              Go back
            </Button>
          </Link>
          <p style={{ fontSize: '1.5em', textAlign: 'center' }}>
            Scientific forest model by
            <br />
            <a href="https://arvometsa.fi">
              {/* TODO: fix logo */}
              {/* <img alt="Arvometsä" src={arvometsaLogo} style={{ height: '120px' }} /> */}
            </a>
          </p>
        </Container>
      </Paper>

      <Paper className="grid-col2" elevation={2} hidden={!showReport}>
        <Container>
          <Paper>
            <FormControlLabel
              style={{ padding: '4px 10px' }}
              control={<Checkbox />}
              label="Show cumulative carbon balance"
              checked={cumulativeFlag}
              onChange={onChangeCheckbox(setCumulativeFlag)}
            />
          </Paper>
          <br />
          <Paper>
            <FormControlLabel
              style={{ padding: '4px 10px' }}
              control={<Checkbox />}
              label="Show carbon balance improvement potential compared to the prevalent forestry practice"
              checked={carbonBalanceDifferenceFlag}
              onChange={onChangeCheckbox(setCarbonBalanceDifferenceFlag)}
              disabled={scenario === TRADITIONAL_FORESTRY_METHOD}
            />
          </Paper>
          <br />
          <abbr title="Carbon dioxide equivalent">
            CO<sub>2</sub>eq
          </abbr>{' '}
          {/* TODO: Enable charts */}
          {/* carbon balance ({getUnitPerArea('cbt', cumulativeFlag, perHectareFlag)})
          <ChartComponent {...cbt} />
          <br />
          Forest carbon stock
          <br />
          <small>
            in {getUnitPerArea('bio', cumulativeFlag, perHectareFlag)}; multiply by 3.67 to get CO<sub>2</sub>eq amounts
          </small>
          <ChartComponent {...bio} />
          <br />
          Harvested wood ({getUnitPerArea('harvested-wood', cumulativeFlag, perHectareFlag)})
          <ChartComponent {...wood} /> */}
          <br />
          <Button
            variant="contained"
            color="primary"
            // TODO: enable analytics
            // onClick={() => Analytics.pageview('layers/fi-forest/methodology')}
          >
            Read about the methodology
          </Button>
          <br />
          <br />
          <Button variant="contained" color="secondary" onClick={() => setReportPanelOpen(false)}>
            Close report
          </Button>
        </Container>
      </Paper>
    </div>
  )
}

export default FinlandForests
