import React, { useContext, useState } from 'react'
import axios from 'axios'
import { Button, Box } from '@mui/material'
import shp from 'shpjs'

// import { useFileUploadMutation } from 'Queries/carbon'

const CarbonMap = () => {
  const [uploadFile, setUploadFile] = useState(null)
  const [res, setRes] = useState(null)
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
