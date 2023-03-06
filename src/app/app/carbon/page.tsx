'use client'

import React, { useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { Button, Box } from '@mui/material'

// import { useFileUploadMutation } from 'Queries/carbon'
import { MapContext } from '#/components/Map'

const CarbonMap = () => {
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
    <Box sx={{ margin: '100px', display: 'flex', flexDirection: 'column' }}>
      <Button variant="contained" component="label">
        Select shapefile
        <input hidden accept=".zip, .gpkg" multiple type="file" onChange={handleFileInput} />
      </Button>
      <Button onClick={handleSubmit} sx={{ margin: '10px 0 0 0' }}>
        Calculate carbon
      </Button>
      {res && <p>{JSON.stringify(res)}</p>}
    </Box>
  )
}

export default CarbonMap
