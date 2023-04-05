import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import { uniqWith, isEqual } from 'lodash-es'

import { buildingHelBhsysClass, energyConsumption } from './constants'
import { PopupFeature } from '#/common/types/map'

// Variables
let heatings
let tecons
let teconss
let tecdate
let tecdate_st
let emisfactord
let emisfactords
const nulls = '000'
// convert to float
const convertToFloat = (a: string) => {
  // of string to float
  let floatValue = +a
  // Return float value
  return floatValue
}
// Emission factors [kgCO2/kWh]
const empdp = [0.255, 0.195, 0.104, 0.104, 0.104]
// round the tecons value
const Tecons = (tecc: number) => {
  tecons = Math.round(tecc / 1000) * 1000
  teconss = tecons.toString().slice(0, -3)
  return teconss
}
// Emission factor function [kgCO2/kWh]
const emissionFactor = (tecc: number, empdpn: number) => {
  emisfactord = Math.round((tecc * empdpn) / 1000) * 1000
  emisfactords = emisfactord.toString().slice(0, -3)
  return emisfactords
}

interface Props {
  features: PopupFeature[]
}

const Popup = ({ features }: Props) => {
  let buildingIds: any = []
  const tableValues: any = {}

  features.forEach((feature) => {
    const p = feature.properties

    buildingIds.push({ vtj_prt: p.vtj_prt, ratu: p.ratu })

    // Helsinki-Testbed Variables
    const kktark = String(p.c_kayttark)
    let docctilav = p.i_raktilav

    // check / convert undefined values
    if (typeof p.c_valmpvm === 'undefined') {
      tecdate = 0
    } else {
      tecdate_st = p.c_valmpvm.toString().substr(0, 4)
      tecdate = Number(tecdate_st)
    }
    // Building type: Apartment building
    if (kktark == '032' || kktark == '039') {
      tableValues['Building type:'] = <address>{'Apartment building'}</address>
    }
    if (p.c_valmpvm != null) {
      let doccdate = p.c_valmpvm.toString().substr(0, 4)
      tableValues['Construction year:'] = <address>{doccdate}</address>
    }
    if (p.i_raktilav != null) {
      tableValues['Heated floor area: m2'] = <address>{p.i_kokala}</address>
      let docctilav = p.i_raktilav
    }
    if (p.i_raktilav != null) {
      tableValues['Heated volume: m3'] = <address>{p.i_raktilav}</address>
      let docctilav = p.i_raktilav
    }
    // The house's heat source
    if (kktark == '032' || (kktark == '039' && p.c_poltaine != null)) {
      tableValues['Heating system'] = <address>{buildingHelBhsysClass[p.c_poltaine] || ''}</address>
    }
    // district heating
    if (kktark == '032' || (kktark == '039' && p.c_poltaine == 1 && p.c_valmpvm != null)) {
      if (tecdate <= 1975) {
        heatings = energyConsumption.consumption[0].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = energyConsumption.consumption[1].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = energyConsumption.consumption[2].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = energyConsumption.consumption[3].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = energyConsumption.consumption[4].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = energyConsumption.consumption[5].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = energyConsumption.consumption[6].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = energyConsumption.consumption[7].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate >= 2018) {
        heatings = energyConsumption.consumption[8].dis_heating
        tecons = docctilav * convertToFloat(heatings)
      } else {
        heatings = 0
        tecons = 0
      }
      tableValues['Estimated yearly heating related CO2-emissions: [tCO2/a]'] = (
        <address>{Tecons(tecons) + ' ' + nulls}</address>
      )
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/(m3,a)]'] = <address>{heatings}</address>
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/kWh]'] = (
        <address>{emissionFactor(tecons, empdp[1]) + ' ' + nulls}</address>
      )
    }
    // Oil
    if (kktark == '032' || (kktark == '039' && p.c_poltaine == 2) || (p.c_poltaine == 3 && p.c_valmpvm != null)) {
      if (tecdate <= 1975) {
        heatings = energyConsumption.consumption[0].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = energyConsumption.consumption[1].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = energyConsumption.consumption[2].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = energyConsumption.consumption[3].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = energyConsumption.consumption[4].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = energyConsumption.consumption[5].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = energyConsumption.consumption[6].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = energyConsumption.consumption[7].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate >= 2018) {
        heatings = energyConsumption.consumption[8].Oil
        tecons = docctilav * convertToFloat(heatings)
      } else {
        heatings = 0
        tecons = 0
      }
      tableValues['Estimated yearly heating related CO2-emissions: [tCO2/a]'] = (
        <address>{Tecons(tecons) + ' ' + nulls}</address>
      )
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/(m3,a)]'] = <address>{heatings}</address>
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/kWh]'] = (
        <address>{emissionFactor(tecons, empdp[0]) + ' ' + nulls}</address>
      )
    }
    // Direct_Heating
    if (kktark == '032' || (kktark == '039' && p.c_poltaine == 4 && p.c_valmpvm != null)) {
      if (tecdate <= 1975) {
        heatings = energyConsumption.consumption[0].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = energyConsumption.consumption[1].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = energyConsumption.consumption[2].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = energyConsumption.consumption[3].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = energyConsumption.consumption[4].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = energyConsumption.consumption[5].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = energyConsumption.consumption[6].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = energyConsumption.consumption[7].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate >= 2018) {
        heatings = energyConsumption.consumption[8].direct_heating
        tecons = docctilav * convertToFloat(heatings)
      } else {
        heatings = 0
        tecons = 0
      }
      tableValues['Estimated yearly heating related CO2-emissions: [tCO2/a]'] = (
        <address>{Tecons(tecons) + ' ' + nulls}</address>
      )
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/(m3,a)]'] = <address>{heatings}</address>
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/kWh]'] = (
        <address>{emissionFactor(tecons, empdp[2]) + ' ' + nulls}</address>
      )
    }
    // Air-to-water heat pumpu, Ground source heat pump
    if (kktark == '032' || (kktark == '039' && p.c_poltaine == 9 && p.c_valmpvm != null)) {
      if (tecdate <= 1975) {
        heatings = energyConsumption.consumption[0].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = energyConsumption.consumption[1].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = energyConsumption.consumption[2].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = energyConsumption.consumption[3].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = energyConsumption.consumption[4].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = energyConsumption.consumption[5].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = energyConsumption.consumption[6].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = energyConsumption.consumption[7].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else if (tecdate >= 2018) {
        heatings = energyConsumption.consumption[8].ghpump
        tecons = docctilav * convertToFloat(heatings)
      } else {
        heatings = 0
        tecons = 0
      }
      tableValues['Estimated yearly heating related CO2-emissions: [tCO2/a]'] = (
        <address>{Tecons(tecons) + ' ' + nulls}</address>
      )
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/(m3,a)]'] = <address>{heatings}</address>
      tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/kWh]'] = (
        <address>{emissionFactor(tecons, empdp[3]) + ' ' + nulls}</address>
      )
      /*tableValues['Energy consumption reduction potential by switching to GSHP: MWh/a'] = <address>{'GSHP = Ground source heat pum'}</address>
      tableValues['CO2-emission reduction potential by switching to GSHP: tCO2/a'] = <address>{''}</address>
      tableValues['Energy consumption reduction potential by switching to AWHP: MWh/a'] = <address>{'AWHP = Air-to-water heat pump'}</address>
      tableValues['CO2-emission reduction potential by switching to AWHP: tCO2/a'] = <address>{''}</address>*/
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
  buildingIds = uniqWith(buildingIds, isEqual)

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
    <Table size={'small'}>
      <TableBody>
        <TableRow>
          <TableCell>Building ID:</TableCell>
          <TableCell>{buildingIdString.slice(0, 10)}</TableCell>
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
