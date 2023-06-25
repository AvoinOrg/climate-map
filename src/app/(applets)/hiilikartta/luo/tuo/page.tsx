'use client'

import React, { useRef, useEffect, useState, ChangeEvent } from 'react'
import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'
import { useMapStore } from '#/common/store'
import { FileType, NewPlanConf } from 'applets/hiilikartta/common/types'
import { getGeoJsonArea } from '#/common/utils/gis'

import { routeTree } from 'applets/hiilikartta/common/routes'
import GpkgInit from '../../components/GpkgInit'
import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { createLayerConf } from '../../common/utils'

const Page = () => {
  const addAnyLayerGroup = useMapStore((state) => state.addAnyLayerGroup)
  const addPlanConf = useAppStore((state) => state.addPlanConf)
  const deletePlanConf = useAppStore((state) => state.deletePlanConf)
  const [fileType, setFileType] = useState<FileType>()
  const [fileName, setFileName] = useState<string>()
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>()
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }, [])

  const initializePlan = async (json: any, colName: string) => {
    if (!fileName) {
      return null
    }

    const areaHa = getGeoJsonArea(json) / 10000
    const newPlanConf: NewPlanConf = {
      json: json,
      name: fileName,
      areaHa: areaHa,
      fileSettings: { fileType: 'geojson', zoningColumn: colName },
    }

    const planConf = await addPlanConf(newPlanConf)

    try {
      const layerConf = createLayerConf(json, planConf.id, colName)
      await addAnyLayerGroup(layerConf.id, layerConf)
    } catch (e) {
      deletePlanConf(planConf.id)
      console.error(e)
      return null
    }

    return planConf.id
  }

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return
    }

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
  }

  const handleFinish = async (json: any, colName: string) => {
    const id = await initializePlan(json, colName)
    // TODO: throw error if id is null, i.e. if file is invalid
    if (id) {
      const route = getRoute(routeTree.plan, routeTree, [id])
      router.push(route)
    }
  }

  return (
    <>
      <UploadButton variant="outlined" component="label">
        {fileName ? fileName : 'Valitse tiedosto'}
        <input hidden accept=".zip, .gpkg" multiple type="file" onChange={handleFileInput} ref={inputRef} />
      </UploadButton>
      {fileType === 'gpkg' && arrayBuffer && <GpkgInit fileBuffer={arrayBuffer} onFinish={handleFinish}></GpkgInit>}
      {/* {res && <p>{JSON.stringify(res)}</p>} */}
    </>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 15px 0',
})

const UploadButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 15px 0',
})

export default Page
