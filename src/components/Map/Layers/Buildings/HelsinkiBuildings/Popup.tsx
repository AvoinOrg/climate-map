import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'
// import energy_c from './json/energy_c.json'
// console.log(energy_c[0][0])

export const energyJson = {  
  "0_1975": {"Oil": 70.917, "dis_heating": 66.272, "direct_heating":62.625, "awhpump":45.955, "ghpump":35.928},  
  "1976_77": {"Oil": 64.053, "dis_heating": 59.901, "direct_heating": 56.309, "awhpump": 41.838, "ghpump": 32.857},   
  "1978_84": {"Oil":55.573, "dis_heating":52.022, "direct_heating":48.554, "awhpump":36.507, "ghpump":28.958},
  "1985_02": {"Oil":53.097, "dis_heating":49.738, "direct_heating":46.352, "awhpump":35.047, "ghpump":27.861},  
  "2003_07": {"Oil":48.289, "dis_heating":45.339, "direct_heating":43.156, "awhpump":32.839, "ghpump":26.574},  
  "2008_09": {"Oil":47.917, "dis_heating":44.999, "direct_heating":42.832, "awhpump":32.612, "ghpump":26.411},  
  "2010_11": {"Oil":40.39, "dis_heating":38.03, "direct_heating":36.216, "awhpump":28.204, "ghpump":23.408},  
  "2012_17": {"Oil":37.074, "dis_heating":34.92, "direct_heating":33.122, "awhpump":26.018, "ghpump":21.708},  
  "2018_0": {"Oil":34.911, "dis_heating":32.903, "direct_heating":31.101, "awhpump":24.632, "ghpump":20.722}
};

console.log(energyJson["0_1975"]["Oil"])

fetch('./json/energy_c.json')
    .then((response) => response.json())
    .then((json) => console.log(json));

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
    // if (p.c_kayttotark == 32 && p.c_kayttotark == 39 && p.c_poltaine == 1 && p.c_valmpvm !=null) {
    if (p.c_kayttark == '032' && p.c_kayttotark == '039' && p.c_poltaine == 1 && p.c_valmpvm !=null) {  
      var tecdate = p.c_valmpvm.toString().substr(0, 4) 
      var docctilav = p.i_raktilav 
      var tecons = 0
      switch (tecdate) {
        case tecdate <= 1975 && tecdate > 0: 
        tecons = docctilav * energyJson["0_1975"]["dis_heating"]
        break;

        case tecdate <= 1977 && tecdate >= 1976:  
        tecons = docctilav * energyJson["1976_77"]["dis_heating"]
        break;

        case tecdate <= 1984 && tecdate >= 1978:  
        tecons = docctilav * energyJson["1978_84"]["dis_heating"]
        break;

        case tecdate <= 2002 && tecdate >= 1985: 
        tecons = docctilav * energyJson["1985_02"]["dis_heating"]
        break;

        case tecdate <= 2007 && tecdate >= 2003:  
        tecons = docctilav * energyJson["2003_07"]["dis_heating"]
        break;

        case tecdate <= 2009 && tecdate >= 2008:  
        tecons = docctilav * energyJson["2008_09"]["dis_heating"]
        break;

        case tecdate <= 2011 && tecdate >= 2010:  
        tecons = docctilav * energyJson["2010_11"]["dis_heating"]
        break;

        case tecdate <= 2017 && tecdate >= 2012:  
        tecons = docctilav * energyJson["2012_17"]["dis_heating"]
        break;

        case tecdate >= 2018:  
        tecons = docctilav * energyJson["2018_0"]["dis_heating"]
        break;

        default: 
        tecons = 0

      }
      tableValues['Estimated Annual Energy Consumption [kWh/m3,a]'] = <address>{tecons.toFixed(2)}</address>
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
