import { Container, Paper } from '@mui/material'
import React from 'react'
import { useObservable } from 'micro-observables'

import { MapContext } from '#/components/Map'
import { assert, pp } from 'src/map/utils'
import { getGeoJsonGeometryBounds } from 'src/map/utils'

import * as Analytics from 'src/map/analytics'

import { setIsSidebarOpen } from '../State/UiState'
import * as SelectedFeatureState from './ForestArvometsa/ArvometsaSelectedLayer'
import * as LayerGroupState from 'src/map/LayerGroupState'

const sourceName = 'fi-omaihka-soils'
for (const layerName of ['fi-omaihka-soil-topsoil-fill', 'fi-omaihka-soil-subsoil-fill']) {
  genericPopupHandler(layerName, (ev) => {
    const feature = ev.features[0]

    const idName = 'lohko'

    // A bit of a hack: Ensure feature.id refers to some meaningful identifier for highlighting etc.
    const id = feature.properties[idName]
    feature.id = id

    assert(id !== null && id !== undefined, `Feature has no id: ${JSON.stringify(feature.properties)}`)

    const bounds = querySourceFeatures(sourceName, 'default')
      .filter((f) => f.properties[idName] === id)
      .map((f) => f.bbox || getGeoJsonGeometryBounds((f.geometry as any).coordinates))
      .reduce(
        ([a1, b1, c1, d1], [a2, b2, c2, d2]) => [
          Math.min(a1, a2),
          Math.min(b1, b2),
          Math.max(c1, c2),
          Math.max(d1, d2),
        ],
        [999, 999, -999, -999] // fallback bounds
      )

    const prevSelectedFeatures = SelectedFeatureState.selectedFeatures.get()

    SelectedFeatureState.unsetFeatures() // only select one at a time
    SelectedFeatureState.selectFeature({ layer: layerName, feature, bounds })

    const newIds = [id]

    const newFilter = ['in', idName, ...newIds]
    setFilter(`${sourceName}-highlighted`, newFilter)
    console.debug(`${sourceName}-highlighted`, newFilter)

    // // Open the report panel immediately when a feature was selected and nothing was selected prior to it.
    if (feature && prevSelectedFeatures.length === 0) setIsSidebarOpen(true)

    Analytics.setParams({ highlightedFeatureId: id })
  })
}

const soilCodeToColor = {
  // {"pintamaalaji_koodi":195111,"pintamaalaji":"Kalliomaa (Ka) RT"}
  195111: '#adaaaa',
  // {"pintamaalaji_koodi":195210,"pintamaalaji":"Sekalajitteinen maalaji, päälajitetta ei selvitetty (SY) RT"}
  195210: '#b0a978',
  // {"pintamaalaji_koodi":195310,"pintamaalaji":"Karkearakeinen maalaji, päälajitetta ei selvitetty (KY) RT"}
  195310: '#a39952',
  // {"pintamaalaji_koodi":195410,"pintamaalaji":"Hienojakoinen maalaji, päälajitetta ei selvitetty (HY) RT"}
  195410: '#d4be1e',
  // {"pintamaalaji_koodi":195413,"pintamaalaji":"Savi (Sa) RT"}
  195413: '#9c4699',
  // {"pintamaalaji_koodi":19551822,"pintamaalaji":"Soistuma (Tvs) RT"}
  19551822: '#397d69',
  // {"pintamaalaji_koodi":19551891,"pintamaalaji":"Ohut turvekerros (Tvo) RT"}
  19551891: '#a85858',
  // {"pintamaalaji_koodi":19551892,"pintamaalaji":"Paksu turvekerros (Tvp) RT"}
  19551892: '#960c0c',
  // {"pintamaalaji_koodi":195603,"pintamaalaji":"Vesi (Ve)"}
  195603: '#4c3cfa',
}

const soilCodeToName = {
  // {"pintamaalaji_koodi":195111,"pintamaalaji":"Kalliomaa (Ka) RT"}
  195111: 'Kalliomaa (Ka) RT',
  // {"pintamaalaji_koodi":195210,"pintamaalaji":"Sekalajitteinen maalaji, päälajitetta ei selvitetty (SY) RT"}
  195210: 'Sekalajitteinen maalaji, päälajitetta ei selvitetty (SY) RT',
  // {"pintamaalaji_koodi":195310,"pintamaalaji":"Karkearakeinen maalaji, päälajitetta ei selvitetty (KY) RT"}
  195310: 'Karkearakeinen maalaji, päälajitetta ei selvitetty (KY) RT',
  // {"pintamaalaji_koodi":195410,"pintamaalaji":"Hienojakoinen maalaji, päälajitetta ei selvitetty (HY) RT"}
  195410: 'Hienojakoinen maalaji, päälajitetta ei selvitetty (HY) RT',
  // {"pintamaalaji_koodi":195413,"pintamaalaji":"Savi (Sa) RT"}
  195413: 'Savi (Sa) RT',
  // {"pintamaalaji_koodi":19551822,"pintamaalaji":"Soistuma (Tvs) RT"}
  19551822: 'Soistuma (Tvs) RT',
  // {"pintamaalaji_koodi":19551891,"pintamaalaji":"Ohut turvekerros (Tvo) RT"}
  19551891: 'Ohut turvekerros (Tvo) RT',
  // {"pintamaalaji_koodi":19551892,"pintamaalaji":"Paksu turvekerros (Tvp) RT"}
  19551892: 'Paksu turvekerros (Tvp) RT',
  // {"pintamaalaji_koodi":195603,"pintamaalaji":"Vesi (Ve)"}
  195603: 'Vesi (Ve)',
}

interface Props {
  objectid: string

  pintamaalaji_koodi: string
  pintamaalaji: string
  pohjamaalaji_koodi: string
  pohjamaalaji: string

  ely: string
  knro: string
  tiltu: string
  lohko: string
  pinta_ala: number
  ymparys: number

  tila_nro: number
  lohko_nimi: string
  area_ha: number
  maalaji: string
  multavuus: string
  kasvilaji_2019: string
  kasvilaji_2020: string
  nurmen_perustamisvuosi: string
  pelto_ika: string
  ojitustapa: string
  huomioita_ojituksesta: string

  __turvemaa: boolean
  __ext_id_orig: string
}

const renderSoilTypeFromCode = (code) => (
  <div>
    <span
      style={{
        width: 15,
        height: 15,
        backgroundColor: soilCodeToColor[code],
        display: 'inline-block',
      }}
    ></span>{' '}
    {soilCodeToName[code] || '(?)'}
  </div>
)

const ulStyle = {
  listStyle: 'none',
  paddingLeft: 12,
}

function OmaihkaUI() {
  // react to any changes but don't use this directly.
  useObservable(LayerGroupState.layerGroups)

  const topsoilVisible = LayerGroupState.isGroupEnabled('fi-omaihka-topsoil')
  const swapLayer = () =>
    LayerGroupState.enableOnlyOneGroup(topsoilVisible ? 'fi-omaihka-subsoil' : 'fi-omaihka-topsoil')

  const selectedFeatures = useObservable(SelectedFeatureState.selectedFeatures)
  const hasFeature = selectedFeatures.length > 0

  let info = null
  if (hasFeature) {
    const props = selectedFeatures[0].feature.properties as Props

    const soilFeatures = querySourceFeatures(sourceName, 'default').filter((x) => x.properties.lohko === props.lohko)

    const topsoilCodes = Array.from(new Set(soilFeatures.map((x) => x.properties.pintamaalaji_koodi)))
    const subsoilCodes = Array.from(new Set(soilFeatures.map((x) => x.properties.pohjamaalaji_koodi)))

    info = (
      <ul style={ulStyle}>
        <li>
          <strong>Tilan numero</strong>: {props.tila_nro}
        </li>
        <li>
          <strong>Lohkon numero</strong>: {props.__ext_id_orig} (peltolohkokannasta {props.lohko})
        </li>
        <li>
          <strong>Nimi</strong>: {props.lohko_nimi}
        </li>
        <li>
          <strong>Pinta-ala</strong>: {props.area_ha} ha
        </li>
        <li>
          <strong>Ympärys</strong>: {props.ymparys ? `${pp(props.ymparys, 3)} m` : ''}
        </li>
        <li>
          <strong>Kasvilaji 2019</strong>: {props.kasvilaji_2019}
        </li>
        <li>
          <strong>Kasvilaji 2020</strong>: {props.kasvilaji_2020}
        </li>
        <li>
          <strong>Ojitustapa</strong>: {props.ojitustapa}
        </li>
        <li>
          <strong>Huomioita ojituksesta</strong>: {props.huomioita_ojituksesta}
        </li>
        <li>
          <strong>Nurmen perustamisvuosi</strong>: {props.nurmen_perustamisvuosi}
        </li>
        <li>
          <strong>Pellon ikä</strong>: {props.pelto_ika ? `${props.pelto_ika} vuotta` : ''}
        </li>
        <li>
          <strong>Viljavuusanalyysin mukainen maalaji</strong>: {props.maalaji}
        </li>
        <li>
          <strong>Multavuusluokka</strong>: {props.multavuus}
        </li>
        <li>
          <strong>Pintamaalajit</strong>:{' '}
          <ul style={ulStyle}>
            {' '}
            {topsoilCodes.map((x) => (
              <li key={x}>{renderSoilTypeFromCode(x)}</li>
            ))}{' '}
          </ul>
        </li>
        <li>
          <strong>Pohjamaalajit</strong>::{' '}
          <ul style={ulStyle}>
            {' '}
            {subsoilCodes.map((x) => (
              <li key={x}>{renderSoilTypeFromCode(x)}</li>
            ))}{' '}
          </ul>
        </li>
      </ul>
    )
  }

  // i.e. which projection/scenario is in use:
  return (
    <div className="grid-parent grid-parent-report-closed">
      <Paper className="grid-col1" elevation={5}>
        <Container>
          <p>
            <a href="https://www.luke.fi/projektit/omaihka/">Omaihka -hankekartta 2020-2022</a>
          </p>
          <p>
            <strong>{topsoilVisible ? 'Pintamaalajit näkyvillä' : 'Pohjamaalajit näkyvillä'}</strong>
          </p>
          <p>
            <button onClick={swapLayer}>Näytä {topsoilVisible ? 'pohjamaalajit' : 'pintamaalajit'}</button>
          </p>
          Maalajien selitteet:
          <ul style={ulStyle}>
            {Object.keys(soilCodeToColor).map((code) => (
              <li key={code}>{renderSoilTypeFromCode(code)}</li>
            ))}
          </ul>
          {info}
        </Container>
      </Paper>
    </div>
  )
}

export default OmaihkaUI
