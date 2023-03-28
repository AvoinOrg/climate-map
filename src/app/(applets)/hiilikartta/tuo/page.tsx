'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box, Button, Select, SelectChangeEvent } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'

import { AppStateContext } from 'applets/hiilikartta/state/AppState'
import { FileType, PlanConf } from 'applets/hiilikartta/types'
import { routeTree } from 'applets/hiilikartta/routes'

import { MapContext } from '#/components/Map'
import { generateUUID } from '#/common/utils/general'
import { getGeoJsonArea } from '#/common/utils/gis'
import axios from 'axios'
import NavigationBack from '../components/NavigationBack'
import GpkgInit from '../components/GpkgInit'

const Page = () => {
  const [uploadFile, setUploadFile] = useState<string | Blob>('')
  const [res, setRes] = useState(null)
  const { addJSONLayer, setMapLibraryMode } = useContext(MapContext)
  const { addPlanConf } = useContext(AppStateContext)
  const [fileType, setFileType] = useState<FileType>()
  const [fileName, setFileName] = useState<string>('')
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>()
  const [jsonFile, setJsonFile] = useState<File>()
  const router = useRouter()



    const id = generateUUID()
    addJSONLayer(id, 'userZoningPlan', json, 'kaytto_tark', 'EPSG:3857')

    const areaHa = getGeoJsonArea(json) / 10000
    addPlanConf({ json: json, name: fileName, id: id, areaHa: areaHa, fileSettings: { fileType: 'geojson' } })

    return id
  }

  const handleFileInput = async (e: any) => {
    const f = e.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(f)

    reader.onloadend = async () => {
      // TODO: add error handling. An error message popup if file is invalid?
      if (reader.result != null) {
        if (f.name.split('.').pop() === 'gpkg') {
          if (typeof reader.result !== 'string') {
            setFileType('gpkg')
            setArrayBuffer(reader.result)
          } else {
            console.error('reader.result is a string, not an ArrayBuffer')
          }
        } else if (f.name.split('.').pop() === 'zip') {
          const shp = (await import('shpjs')).default
          const json = await shp(reader.result)
          initializePlan(json)
        }
      }
      e.target.value = ''
    }

    setUploadFile(f)
  }

  const handleFinish = (json: any) => {
    const id = initializePlan(json)
    const route = getRoute(routeTree.base.plan, routeTree, [id])
    router.push(route)
  }

  return (
    <>
      <NavigationBack route={'/hiilikartta'} label="Omat kaavat"></NavigationBack>
      <UploadButton variant="outlined" component="label">
        Valitse tiedosto
        <input hidden accept=".zip, .gpkg" multiple type="file" onChange={handleFileInput} />
      </UploadButton>
      {fileType === 'gpkg' && arrayBuffer && <GpkgInit fileBuffer={arrayBuffer} onFinish={handleFinish}></GpkgInit>}
      {/* {res && <p>{JSON.stringify(res)}</p>} */}
    </>
  )
}

const UploadButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 15px 0',
})

export default Page
