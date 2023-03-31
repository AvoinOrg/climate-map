'use client'

import React, { useContext, useEffect, useState } from 'react'
import { Box, Button, Select, SelectChangeEvent } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'

import { FileType, PlanConf } from 'applets/hiilikartta/common/types'
import { routeTree } from 'applets/hiilikartta/common/routes'
import useStore from '#/common/hooks/useStore'

import { MapContext } from '#/components/Map'
import { generateUUID } from '#/common/utils/general'
import { getGeoJsonArea } from '#/common/utils/gis'
import NavigationBack from '../components/NavigationBack'
import GpkgInit from '../components/GpkgInit'
import { useAppStore } from 'applets/hiilikartta/state/appStore'

const Page = () => {
  const [uploadFile, setUploadFile] = useState<string | Blob>('')
  const { addJSONLayer } = useContext(MapContext)
  const planConfs = useStore(useAppStore, (state) => state.planConfs)
  const [fileType, setFileType] = useState<FileType>()
  const [fileName, setFileName] = useState<string>('')
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>()
  const router = useRouter()

  const initializePlan = (json: any, colName: string) => {
    const id = generateUUID()
    addJSONLayer(id, 'userZoningPlan', json, colName, 'EPSG:3857')

    const areaHa = getGeoJsonArea(json) / 10000
    const planConf: PlanConf = {
      json: json,
      name: fileName,
      id: id,
      areaHa: areaHa,
      fileSettings: { fileType: 'geojson' },
    }
    useStore.setState((state) => ({
      planConfs: [...planConfs, planConf],
    }))

    return id
  }

  const handleFileInput = async (e: any) => {
    const f = e.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(f)

    reader.onloadend = async () => {
      // TODO: add error handling. An error message popup if file is invalid?
      if (reader.result != null) {
        setFileName(f.name)
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
          // initializePlan(json)
        }
      }
      e.target.value = ''
    }

    setUploadFile(f)
  }

  const handleFinish = (json: any, colName: string) => {
    const id = initializePlan(json, colName)
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
