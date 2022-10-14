import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'

interface Props {
  features: Feature[]
}

const popup = ({ features }: Props) => {
  const p = features[0].getProperties()

  const energyUse = p.e_luku * p.lämmitetty_nettoala
  const energyPerVolume = p.i_raktilav
    ? `<br/>Energy use per m³: ${_.round(energyUse / p.i_raktilav)} kWh per year`
    : ''

  const url = `https://www.energiatodistusrekisteri.fi/public_html?energiatodistus-id=${p.todistustunnus}&command=access&t=energiatodistus&p=energiatodistukset`

  return (
    <Table sx={{ width: '500px' }} size={'small'}>
      <TableBody>
        <TableRow>
          <TableCell>Certificate ID</TableCell>
          <TableCell>
            <a href={url}>{p.todistustunnus}</a>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Total energy consumption</TableCell>
          <TableCell>{_.round(energyUse)} years</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Energy use per m²</TableCell>
          <TableCell>
            {p.e_luku} kWh per year {energyPerVolume}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

export default popup
