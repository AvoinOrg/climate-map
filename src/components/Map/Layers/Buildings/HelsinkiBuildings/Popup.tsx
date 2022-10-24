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
    // const buildingdate = p.c_valmpvm
    //const resultdate = buildingdate?.toString().substr(0, 9) || '0000-0-0'

    buildingIds.push({ vtj_prt: p.vtj_prt, ratu: p.ratu })

    if (p.osoite != null) {
      tableValues['Address'] = <address>{p.osoite}</address>
    }

    if (p.postinumero != null) {
      tableValues['Zip Code'] = <address>{p.postinumero}</address>
    }

    if (p.i_kerrosala != null) {
      tableValues['Floor area (m2)'] = <address>{p.i_kerrosala}</address>
    }

    if (p.c_valmpvm != null) {
      var doccdate = p.c_valmpvm.toString().substr(0, 9)
      var [yyyy, mm, dd] = doccdate.split("-");
      var revdoccdate = dd + '-' + mm + '-' + yyyy;
      tableValues['Date of completion of construction'] = <address>{revdoccdate}</address>
    }

    if (p.c_lammtapa != null) {
      var bhsystem = p.c_lammtapa
      switch (bhsystem) {
        case '1': 
        bhsystem = 'Water central heating';
        break;

        case '2': 
        bhsystem = 'Central air heating';
        break;

        case '3': 
        bhsystem = 'Direct electrical heating';
        break;

        case '4': 
        bhsystem = 'Oven heating';
        break;

        case '5': 
        bhsystem = 'No fixed heating device';
        break;

        default: 
        bhsystem = "Unknown";

      }
      tableValues['Building Heating System'] = <address>{bhsystem}</address>
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
