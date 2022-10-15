import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'

interface Props {
  features: Feature[]
}

const Popup = ({ features }: Props) => {
  let buildingIds: any = []
  const tableValues: any = {}

  features.forEach((feature) => {
    const p = feature.getProperties()

    buildingIds.push({ vtj_prt: p.vtj_prt, ratu: p.ratu })

    if (p.osoite != null) {
      tableValues['Address'] = <address>{p.osoite}</address>
    }

    if (p.postinumero != null) {
      tableValues['Zip Code'] = <address>{p.postinumero}</address>
    }

    if (p.hakija != null || p.hakija_osoite != null || p.hakija_postinumero != null) {
      tableValues['Demolition requested by'] = (
        <address>
          {p.hakija}, {p.hakija_osoite}, {p.hakija_postinumero}
        </address>
      )
    }

    if (p.lupa_voimassa_asti != null) {
      tableValues['Demolition permit valid until'] = p.lupa_voimassa_asti
    }
  })

  // remove duplicate building ids by comparing the objects
  buildingIds = _.uniqWith(buildingIds, _.isEqual)

  const buildingIdString = Object.keys(buildingIds).reduce((prev: any, index: any) => {
    const curr = buildingIds[index]
    const val = curr.vtj_prt && curr.ratu ? `${curr.vtj_prt} (${curr.ratu})` : curr.vtj_prt || curr.ratu

    if (val != null) {
      if (prev !== '') {
        prev += ', '
      }

      prev += val
    }

    return prev
  }, '')

  return (
    <Table sx={{ width: '500px' }} size={'small'}>
      <TableBody>
        <TableRow>
          <TableCell>Building ID:</TableCell>
          <TableCell>{buildingIdString}</TableCell>
        </TableRow>
        {Object.keys(tableValues).map((key: string) => {
          return (
            <TableRow key={key}>
              <TableCell>{key}</TableCell>
              <TableCell>{tableValues[key]}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default Popup
