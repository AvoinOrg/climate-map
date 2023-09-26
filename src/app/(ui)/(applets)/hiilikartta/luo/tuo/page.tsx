'use client'

import React, { useRef, useEffect, useState, ChangeEvent } from 'react'
import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'

import { getRoute } from '#/common/utils/routing'
import { useMapStore } from '#/common/store'
import { FileType, NewPlanConf } from 'applets/hiilikartta/common/types'
import { getGeoJsonArea } from '#/common/utils/gis'

import { routeTree } from 'applets/hiilikartta/common/routes'
import PlanImportGpkg from './components/PlanImportGpkg'
import PlanImportShp from './components/PlanImportShp'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { createLayerConf } from '../../common/utils'

const Page = () => {
  const addSerializableLayerGroup = useMapStore(
    (state) => state.addSerializableLayerGroup
  )
  const addPlanConf = useAppletStore((state) => state.addPlanConf)
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)
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

  const initializePlan = async (json: FeatureCollection, colName: string) => {
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
      await addSerializableLayerGroup(layerConf.id, {
        layerConf,
        persist: true,
      })
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
        if (typeof reader.result !== 'string') {
          if (f.name.split('.').pop() === 'gpkg') {
            if (typeof reader.result !== 'string') {
              setFileType('gpkg')
              setArrayBuffer(reader.result)
            }
          } else if (f.name.split('.').pop() === 'zip') {
            setFileType('shp')
            setArrayBuffer(reader.result)
            // initializePlan(json)
          }
        } else {
          console.error('reader.result is a string, not an ArrayBuffer')
        }
      }
      e.target.value = ''
    }
  }

  const handleFinish = async (json: FeatureCollection, colName: string) => {
    const id = await initializePlan(json, colName)
    // TODO: throw error if id is null, i.e. if file is invalid
    if (id) {
      const route = getRoute(routeTree.plans.plan, routeTree, [id])
      router.push(route)
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        component="label"
        sx={(theme) => ({
          width: '100%',
          height: '60px',
          margin: '0 0 15px 0',
        })}
      >
        {fileName ? fileName : 'Valitse tiedosto'}
        <input
          hidden
          accept=".zip, .gpkg"
          multiple
          type="file"
          onChange={handleFileInput}
          ref={inputRef}
        />
      </Button>
      {fileType === 'gpkg' && arrayBuffer && (
        <PlanImportGpkg
          fileBuffer={arrayBuffer}
          onFinish={handleFinish}
        ></PlanImportGpkg>
      )}
      {fileType === 'shp' && arrayBuffer && (
        <PlanImportShp
          fileBuffer={arrayBuffer}
          onFinish={handleFinish}
        ></PlanImportShp>
      )}
    </>
  )
}

export default Page
