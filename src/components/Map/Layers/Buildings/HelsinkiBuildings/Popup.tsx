import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'
import { cloneDeep } from 'lodash'
import './HBenergy.css'
import consuption from "./json/energy_c.json"

const EnergyData = () => cloneDeep(consuption);
// const loadData = [...jsonData];

console.log(EnergyData)

fetch('./json/energy_c.json')
  .then((res) => res.json())
  .then((data) => {
    console.log('data:', data);
  })

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

    if (p.i_raktilav != null) {
      tableValues['Volume of the building (m3)'] = <address>{p.i_raktilav}</address>
      var docctilav = p.i_raktilav
    }

    if (p.c_valmpvm != null) {
      var doccdate = p.c_valmpvm.toString().substr(0, 4)         
      tableValues['Year of construction'] = <address>{doccdate}</address>
    }  
    if (p.c_kayttark != null) {             
      tableValues['Used code'] = <address>{p.c_kayttark}</address>
    } 
    if (p.c_poltaine != null) {               
      tableValues['Fuel'] = <address>{p.c_poltaine}</address>
    }     
    // district heating
    const kktark = String(p.c_kayttark)
    if (kktark == "032" || kktark == "039" && p.c_poltaine == 1 && p.c_valmpvm !=null) {    
      var tecdate = p.c_valmpvm.toString().substr(0, 4) 
      // console.log(JSON.stringify(p.c_kayttark))
      var docctilav = p.i_raktilav 
      console.log(docctilav)
      var tecons = 0
      switch (tecdate) {
        case tecdate <= 1975 && tecdate > 0: 
        tecons = docctilav * consuption["0_1975"]["dis_heating"]
        console.log(consuption["0_1975"]["dis_heating"])
        break;

        case tecdate <= 1977 && tecdate >= 1976:  
        tecons = docctilav * consuption["1976_77"]["dis_heating"]
        break;

        case tecdate <= 1984 && tecdate >= 1978:  
        tecons = docctilav * consuption["1978_84"]["dis_heating"]
        break;

        case tecdate <= 2002 && tecdate >= 1985: 
        tecons = docctilav * consuption["1985_02"]["dis_heating"]
        break;

        case tecdate <= 2007 && tecdate >= 2003:  
        tecons = docctilav * consuption["2003_07"]["dis_heating"]
        break;

        case tecdate <= 2009 && tecdate >= 2008:  
        tecons = docctilav * consuption["2008_09"]["dis_heating"]
        break;

        case tecdate <= 2011 && tecdate >= 2010:  
        tecons = docctilav * consuption["2010_11"]["dis_heating"]
        break;

        case tecdate <= 2017 && tecdate >= 2012:  
        tecons = docctilav * consuption["2012_17"]["dis_heating"]
        break;

        case tecdate >= 2018:  
        tecons = docctilav * consuption["2018_0"]["dis_heating"]
        break;

        default: 
        tecons = 0

      }


      tableValues['Estimated Annual Energy Consumption [kWh/m3,a]'] = <address id="color_energy">{tecons.toFixed(2)}</address>
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
