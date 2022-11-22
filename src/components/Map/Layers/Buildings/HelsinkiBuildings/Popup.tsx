import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'

// convert to float
export function convert_to_float(a) {
  // of string to float
  var floatValue = +(a);   
  // Return float value
  return floatValue;
}

var consuptiontext = '{ "consuption" : [' +
 '{"year":"1975", "Oil":"70.917", "dis_heating":"66.272", "direct_heating":"62.625", "awhpump":"45.955", "ghpump":"35.928"},' +  
 '{"year":"1976", "Oil":"64.053", "dis_heating": "59.901", "direct_heating":"56.309", "awhpump":"41.838", "ghpump":"32.857"},' +   
 '{"year":"1978", "Oil":"55.573", "dis_heating":"52.022", "direct_heating":"48.554", "awhpump":"36.507", "ghpump":"28.958"},' +
 '{"year":"1985", "Oil":"53.097", "dis_heating":"49.738", "direct_heating":"46.352", "awhpump":"35.047", "ghpump":"27.861"},' +  
 '{"year":"2003", "Oil":"48.289", "dis_heating":"45.339", "direct_heating":"43.156", "awhpump":"32.839", "ghpump":"26.574"},' +  
 '{"year":"2008", "Oil":"47.917", "dis_heating":"44.999", "direct_heating":"42.832", "awhpump":"32.612", "ghpump":"26.411"},' +  
 '{"year":"2010", "Oil":"40.39", "dis_heating":"38.03", "direct_heating":"36.216", "awhpump":"28.204", "ghpump":"23.408"},' +  
 '{"year":"2012", "Oil":"37.074", "dis_heating":"34.92", "direct_heating":"33.122", "awhpump":"26.018", "ghpump":"21.708"},' +  
 '{"year":"2018", "Oil":"34.911", "dis_heating":"32.903", "direct_heating":"31.101", "awhpump":"24.632", "ghpump":"20.722"} ]}'
;
 
// convert data into JSON object
var eobj = JSON.parse(consuptiontext.toString())

interface Props {
  features: Feature[]
}

const Popup = ({ features }: Props) => {
  let buildingIds: any = []
  const tableValues: any = {}  

  features.forEach((feature) => {
    const p = feature.getProperties()    

    buildingIds.push({ vtj_prt: p.vtj_prt, ratu: p.ratu })

    // Helsinki-Testbed Variables
    const kktark = String(p.c_kayttark)          
    var docctilav = p.i_raktilav     
    
    // check / convert undefined values
    if (typeof p.c_valmpvm === "undefined") {
      var tecdate = 0
    } else {      
      var tecdate_st = p.c_valmpvm.toString().substr(0, 4) 
      var tecdate = Number(tecdate_st) 
    } 
    // Building type: Apartment building
    if (kktark == "032" || kktark == "039") {
      tableValues['Building type:'] = <address>{'Apartment building'}</address>
    }
    if (p.c_valmpvm != null) {
      var doccdate = p.c_valmpvm.toString().substr(0, 4)         
      tableValues['Construction year:'] = <address>{doccdate}</address>
    }
    if (p.i_raktilav != null) {
      tableValues['Heated floor area: m2'] = <address>{p.i_kokala}</address>
      var docctilav = p.i_raktilav
    } 
    if (p.i_raktilav != null) {
      tableValues['Heated volume: m3'] = <address>{p.i_raktilav}</address>
      var docctilav = p.i_raktilav
    }
    // The house's heat source
    if (kktark == "032" || kktark == "039" && p.c_poltaine != null) {
      var bhsys = p.c_poltaine
      switch (bhsys) {
        case '1': 
        bhsys = 'District heating';
        break;
        case '2': 
        bhsys = 'Light fuel oil';
        break;
        case '3': 
        bhsys = 'Heavy fuel oil';
        break;
        case '4': 
        bhsys = 'Direct electric heating';
        break;       
        case '9': 
        bhsys = 'Air-to-water heat pumpu, Ground source heat pump etc';
        break;
        default: 
        bhsys = "Other";
      }
      tableValues['Heating system'] = <address>{bhsys}</address>
    }
    // district heating 
    if (kktark == "032" || kktark == "039" && p.c_poltaine == 1 && p.c_valmpvm !=null) { 
      // District heating Emission factors 0.195
      emisfactorp = 0.195
      var heatings
      var tecons              
      if (tecdate <= 1975) {
        heatings = eobj.consuption[0].dis_heating
        tecons = docctilav * convert_to_float(heatings)            
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = eobj.consuption[1].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = eobj.consuption[2].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = eobj.consuption[3].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = eobj.consuption[4].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = eobj.consuption[5].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = eobj.consuption[6].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = eobj.consuption[7].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate >= 2018) {
        heatings = eobj.consuption[8].dis_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else {
        heatings = 0
        tecons = 0
      }       
    }    
     // Oil
    if (kktark == "032" || kktark == "039" && p.c_poltaine == 2 || p.c_poltaine == 3 && p.c_valmpvm !=null) {
      // Oil Emission factors 0.195
      var emisfactorp = 0.255          
      if (tecdate <= 1975) {
        heatings = eobj.consuption[0].Oil
        tecons = docctilav * convert_to_float(heatings)            
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = eobj.consuption[1].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = eobj.consuption[2].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = eobj.consuption[3].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = eobj.consuption[4].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = eobj.consuption[5].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = eobj.consuption[6].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = eobj.consuption[7].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate >= 2018) {
        heatings = eobj.consuption[8].Oil
        tecons = docctilav * convert_to_float(heatings) 
      } else {
        heatings = 0
        tecons = 0;
      }       
    }
    // Direct_Heating
    if (kktark == "032" || kktark == "039" && p.c_poltaine == 4 && p.c_valmpvm !=null) {         
      // Direct_Heating factors 0.104
      var emisfactorp = 0.104          
      if (tecdate <= 1975) {
        heatings = eobj.consuption[0].direct_heating
        tecons = docctilav * convert_to_float(heatings)            
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = eobj.consuption[1].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = eobj.consuption[2].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = eobj.consuption[3].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = eobj.consuption[4].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = eobj.consuption[5].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = eobj.consuption[6].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = eobj.consuption[7].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate >= 2018) {
        heatings = eobj.consuption[8].direct_heating
        tecons = docctilav * convert_to_float(heatings) 
      } else {
        heatings = 0
        tecons = 0;
      }      
    }
    // Air-to-water heat pumpu, Ground source heat pump
    if (kktark == "032" || kktark == "039" && p.c_poltaine == 9 && p.c_valmpvm !=null) {         
      // Air-to-water heat pumpu, Ground source heat pump 0.104
      var emisfactorp = 0.104          
      if (tecdate <= 1975) {
        heatings = eobj.consuption[0].ghpump
        tecons = docctilav * convert_to_float(heatings)            
      } else if (tecdate <= 1977 || tecdate >= 1976) {
        heatings = eobj.consuption[1].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 1984 || tecdate >= 1978) {
        heatings = eobj.consuption[2].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2002 || tecdate >= 1985) {
        heatings = eobj.consuption[3].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2007 || tecdate >= 2003) {
        heatings = eobj.consuption[4].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2009 || tecdate >= 2008) {
        heatings = eobj.consuption[5].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2011 || tecdate >= 2010) {
        heatings = eobj.consuption[6].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate <= 2017 || tecdate >= 2012) {
        heatings = eobj.consuption[7].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else if (tecdate >= 2018) {
        heatings = eobj.consuption[8].ghpump
        tecons = docctilav * convert_to_float(heatings) 
      } else {
        heatings = 0
        tecons = 0;
      }     
    }
    
    var emisfactordh = heatings * emisfactorp
    emisfactordh = Math.round(emisfactordh*10) / 10
    tecons = Math.round(tecons/1000)*1000                 
    tableValues['Estimated yearly heating related CO2-emissions: [tCO2/a]'] = <address>{tecons}</address>
    tableValues['Estimated yearly heating related CO2-emissions: [kgCO2/(m3,a)]'] = <address>{heatings}</address>       
    tableValues['Emission factor [kgCO2/kWh]'] = <address>{emisfactordh}</address> 

    
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
