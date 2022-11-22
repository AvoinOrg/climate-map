'use client'

import React, { useContext, useState } from 'react'
import axios from 'axios'
import { Button, Box } from '@mui/material'
import shp from 'shpjs'

// import { useFileUploadMutation } from 'Queries/carbon'
import { MapContext } from '#/components/Map'

const CarbonMap = () => {
  const [uploadFile, setUploadFile] = useState<string | Blob>('')
  const [res, setRes] = useState(null)
  const { addJSONLayer }: any = useContext(MapContext)

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
      //@ts-ignore
      const json = await shp(reader.result)
      addJSONLayer('userCarbonJson', '1', json, 'EPSG:3857')
    }

    setUploadFile(f)
  }

  return (
    <Box sx={{ margin: '100px', display: 'flex', flexDirection: 'column' }}>
      <Button variant="contained" component="label">
        Select shapefile
        <input hidden accept=".zip" multiple type="file" onChange={handleFileInput} />
      </Button>
      <Button onClick={handleSubmit} sx={{ margin: '10px 0 0 0' }}>
        Calculate carbon
      </Button>
      {res && <p>{JSON.stringify(res)}</p>}
    </Box>
  )
}

export default CarbonMap
