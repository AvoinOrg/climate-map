'use client'

import React, { useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { Button, Box } from '@mui/material'
import { styled } from '@mui/material/styles'

// import { useFileUploadMutation } from 'Queries/carbon'
import { MapContext } from '#/components/Map'

const MainMenu = () => {
  const [uploadFile, setUploadFile] = useState<string | Blob>('')
  const [res, setRes] = useState(null)
  const { addJSONLayer, setMapLibraryMode } = useContext(MapContext)

  useEffect(() => {
    setMapLibraryMode('mapbox')
  }, [])

  const handleSubmit = async () => {
    const formData = new FormData()
    formData.append('file', uploadFile)

    // const response = await useFileUploadMutation("http://localhost:8000/calculate", uploadFile)

    const response = await axios.post('http://localhost:8000/calculate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    setRes(response.data)
  }

  const handleFileInput = async (e: any) => {
    const f = e.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(f)

    reader.onloadend = async () => {
      if (reader.result != null) {
        if (f.name.split('.').pop() === 'gpkg') {
          if (typeof reader.result !== 'string') {
            const { GeoPackageAPI, setSqljsWasmLocateFile } = await import('@ngageoint/geopackage')
            setSqljsWasmLocateFile((file) => '/dyn/' + file)

            const geopackage = await GeoPackageAPI.open(new Uint8Array(reader.result))
            const featureTables = geopackage.getFeatureTables()
            const featureDao = geopackage.getFeatureDao(featureTables[0])
            // console.log(featureDao.columns)

            // // get the info for the table
            // const tableInfo = geopackage.getInfoForTable(featureDao)

            // const srs = geopackage.getSrs(tableInfo.srs.id)
            // const srsName = srs.organization.toUpperCase() + ':' + srs.organization_coordsys_id

            const extract = async (geopackage: any, tableName: string): Promise<any> => {
              const geoJson: any = {
                type: 'FeatureCollection',
                features: [],
              }
              const iterator = geopackage.iterateGeoJSONFeatures(tableName)
              for (const feature of iterator) {
                geoJson.features.push(feature)
              }
              return Promise.resolve(geoJson)
            }

            const json = await extract(geopackage, featureTables[0])
            console.log(json)
            addJSONLayer('userCarbonJson', '1', json, 'kaytto_tark', 'EPSG:3857')
          } else {
            console.error('reader.result is a string, not an ArrayBuffer')
          }
        } else {
          const shp = (await import('shpjs')).default
          const json = await shp(reader.result)
          addJSONLayer('userCarbonJson', '1', json, 'kt', 'EPSG:3857')
        }
      }
    }

    setUploadFile(f)
  }

  return (
    <Box sx={{ padding: '150px 30px 100px 30px', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
      <BigMenuButton variant="contained" component="label">
        Tuo kaava
        <input hidden accept=".zip, .gpkg" multiple type="file" onChange={handleFileInput} />
      </BigMenuButton>
      {/* <BigMenuButton variant="contained">
        Uusi kaava
        <input hidden accept=".zip, .gpkg" multiple type="file" onChange={handleFileInput} />
      </BigMenuButton> */}
      {/* <BigMenuButton variant="outlined" onClick={handleSubmit}>
        Laske hiilivarasto
      </BigMenuButton> */}
      {res && <p>{JSON.stringify(res)}</p>}
    </Box>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '300px',
  height: '50px',
  margin: '0 0 15px 0',
})

export default MainMenu