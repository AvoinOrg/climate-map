import React from 'react'
import _ from 'lodash'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableContainer, TableRow } from '@mui/material'

import {
  metsaanFiTreeSpecies,
  metsaanFiDevelopmentClass,
  metsaanFiAccessibilityClassifier,
  metsaanFiFertilityClass,
  metsaanFiMainGroups,
  metsaanFiDatasources,
  metsaanFiSubgroups,
  metsaanFiSoilTypes,
} from './defs'

export const MetsaanPopup = (f: Feature) => {
  const p = f.getProperties()

  const soilTypeInfo = metsaanFiSoilTypes.filter((x: any) => x[0] === p.soiltype)[0]
  let soilEn = '',
    soilFi = ''
  if (soilTypeInfo) {
    soilEn = soilTypeInfo[1] as any
    soilFi = soilTypeInfo[2] as any
  }

  const ditching =
    p.ditch_completed_at || p.ditchingyear ? `Completed at: {p.ditch_completion_date || p.ditchingyear}` : ''

  return (
    <Table sx={{ width: '500px' }}>
      <TableBody>
        <TableRow>
          <TableCell>Main Tree species</TableCell>
          <TableCell>{metsaanFiTreeSpecies[p.maintreespecies] || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Average metsaanFiTreeSpecies age</TableCell>
          <TableCell>{p.meanage} years</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Average tree trunk diameter</TableCell>
          <TableCell>{p.meandiameter} cm</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Average tree height</TableCell>
          <TableCell>{p.meanheight} m</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Soil</TableCell>
          <TableCell>{soilEn || soilFi || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Area</TableCell>
          <TableCell>{_.round(p.area, 3)} hectares</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Accessibility</TableCell>
          <TableCell>{metsaanFiAccessibilityClassifier[p.accessibility] || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Approx. tree stem count</TableCell>
          <TableCell>{_.round(p.stemcount * p.area)}</TableCell>
        </TableRow>
        {/* <TableRow><TableCell>TODO(Probably/Not/Yes/No): Mature enough for regeneration felling?</TableCell><TableCell>{
              p.regeneration_felling_prediction
            }</TableCell></TableRow>  */}
        <TableRow>
          <TableCell>Development class</TableCell>
          <TableCell>{metsaanFiDevelopmentClass[p.developmentclass] || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Fertility classifier</TableCell>
          <TableCell>{metsaanFiFertilityClass[p.fertilityclass] || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Main group</TableCell>
          <TableCell>{metsaanFiMainGroups[p.maingroup] || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Subgroup</TableCell>
          <TableCell>{metsaanFiSubgroups[p.subgroup] || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Ditching</TableCell>
          <TableCell>{ditching}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Data source</TableCell>
          <TableCell>{metsaanFiDatasources.filter((x: any) => x.id === p.datasource)[0].description || ''}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Identifier</TableCell>
          <TableCell>StandID={p.standid}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
