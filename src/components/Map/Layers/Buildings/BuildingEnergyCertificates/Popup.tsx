import React from 'react'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import { pp } from '#/common/utils/general'

import { PopupProps } from '#/common/types/map'

const Popup = ({ features }: PopupProps) => {
  const p = features[0].properties
  const energyUse = p.e_luku * p.lämmitetty_nettoala
  const energyPerVolume = p.i_raktilav ? `<br/>Energy use per m³: ${pp(energyUse / p.i_raktilav)} kWh per year` : ''

  const url = `https://www.energiatodistusrekisteri.fi/public_html?energiatodistus-id=${p.todistustunnus}&command=access&t=energiatodistus&p=energiatodistukset`

  return (
    <Table size={'small'}>
      <TableBody>
        <TableRow>
          <TableCell>Certificate ID</TableCell>
          <TableCell>
            <a href={url}>{p.todistustunnus}</a>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Total energy consumption</TableCell>
          <TableCell>{pp(energyUse)} years</TableCell>
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

export default Popup
