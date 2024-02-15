'use client'

import React, { useRef, useEffect, useState, ChangeEvent } from 'react'
import { Button } from '@mui/material'
import { useRouter } from 'next/navigation'
import { buffer } from '@turf/turf'
import booleanValid from '@turf/boolean-valid'
import { flattenDeep } from 'lodash-es'

import { getRoute } from '#/common/utils/routing'
import {
  FeatureProperties,
  FileType,
  NewPlanConf,
  ZONING_CODE_COL,
} from 'applets/hiilikartta/common/types'
import { getGeoJsonArea } from '#/common/utils/gis'

import { routeTree } from 'applets/hiilikartta/common/routes'
import PlanImportGpkg from './_components/PlanImportGpkg'
import PlanImportShp from './_components/PlanImportShp'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { Feature, FeatureCollection } from 'geojson'
import { generateUUID } from '#/common/utils/general'
import { ZONING_CLASSES } from 'applets/hiilikartta/common/constants'

const Page = () => {
  const addPlanConf = useAppletStore((state) => state.addPlanConf)
  const [fileType, setFileType] = useState<FileType>()
  const [fileName, setFileName] = useState<string>()
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer>()
  const isInitializing = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.click()
    }
  }, [])

  const formatGeojson: any = (
    json: FeatureCollection,
    zoningColName: string,
    nameColName?: string
  ): FeatureCollection => {
    const features = json.features
      .map((feature: Feature, index) => {
        if (
          !feature.geometry ||
          // @ts-ignore
          !feature.geometry.coordinates ||
          !['MultiPolygon', 'Polygon'].includes(feature.geometry.type)
        ) {
          return null // Remove features without geometry
        }

        if (
          // @ts-ignore
          feature.geometry.coordinates &&
          // @ts-ignore
          (feature.geometry.coordinates.length === 0 ||
            // @ts-ignore
            flattenDeep(feature.geometry.coordinates).length === 0)
        ) {
          return null
        }

        if (!booleanValid(feature)) {
          try {
            // Attempt to fix invalid geometry by applying a buffer
            const fixedGeometry = buffer(feature, 0).geometry
            if (booleanValid(fixedGeometry)) {
              // If the fixed geometry is valid, update the feature's geometry
              feature.geometry = fixedGeometry
            } else {
              // If the geometry is still invalid, discard the feature
              return null
            }
          } catch (error) {
            console.error('Error fixing geometry:', error)
            return null // Discard features with geometry that cannot be fixed
          }
        }

        // Get the value of the property using colName and remove other properties
        let zoningCode = feature.properties?.[zoningColName]

        if (!zoningCode) {
          zoningCode = null
        } else if (typeof zoningCode !== 'string') {
          zoningCode = String(zoningCode)
        }

        let name: string | number = index + 1
        if (nameColName != null) {
          const nameColVal = feature.properties?.[nameColName]
          if (
            (nameColVal != null && typeof nameColVal === 'string') ||
            typeof nameColVal === 'number'
          ) {
            name = feature.properties?.[nameColName]
          }
        }

        // If the desired property is not found, don't modify the feature

        const featureAreaHa = getGeoJsonArea(feature) / 10000

        const properties: FeatureProperties = {
          id: generateUUID(),
          name: name,
          zoning_code: zoningCode,
          area_ha: featureAreaHa,
          old_id: feature.id != null ? feature.id : undefined,
        }

        if (zoningCode != null) {
          const trimmedZoningCode = zoningCode
            .toUpperCase()
            .trim()
            .split(' ')[0]
            .split('-')[0]
            .split('.')[0]

          const zoningClass = ZONING_CLASSES.find((zoningClass) => {
            let code = zoningClass.code
            if (code.includes(',')) {
              return zoningClass.code.split(',').includes(trimmedZoningCode)
            } else {
              return code.toUpperCase() === trimmedZoningCode
            }
          })

          if (zoningClass) {
            properties.zoning_code = zoningClass.code
            properties.old_zoning_code = zoningCode
          }
        }

        // Return the new feature with only zoning_code and area in hectares in its properties
        return {
          ...feature,
          properties: properties,
        }
      })
      .filter((feature) => feature !== null)

    return {
      type: 'FeatureCollection',
      features: features as Feature[],
    }
  }

  const initializePlan = async (
    json: FeatureCollection,
    zoningColName: string,
    nameColName?: string
  ) => {
    if (!fileName) {
      return null
    }

    const formatedJson = formatGeojson(json, zoningColName, nameColName)

    const areaHa = getGeoJsonArea(formatedJson) / 10000
    const newPlanConf: NewPlanConf = {
      data: formatedJson,
      name: fileName,
      areaHa: areaHa,
      fileSettings: { fileType: 'geojson', zoningColumn: ZONING_CODE_COL },
    }

    const planConf = await addPlanConf(newPlanConf)

    // try {
    //   const layerConf = createLayerConf(
    //     formatedJson,
    //     planConf.id,
    //     ZONING_CODE_COL
    //   )

    //   // Testing if the file works, then removing the layers.
    //   await addSerializableLayerGroup(layerConf.id, {
    //     layerConf,
    //     persist: false,
    //     isHidden: true,
    //   })
    //   await removeSerializableLayerGroup(layerConf.id)
    // } catch (e) {
    //   deletePlanConf(planConf.id)
    //   console.error(e)
    //   // TODO: show error to user, invalid file
    //   return null
    // }

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

  const handleFinish = async (
    json: FeatureCollection,
    zoningColName: string,
    nameColName?: string
  ) => {
    if (isInitializing.current) {
      return
    }
    isInitializing.current = true
    try {
      const id = await initializePlan(json, zoningColName, nameColName)
      if (id) {
        const route = getRoute(routeTree.plans.plan, routeTree, {
          routeParams: {
            planId: id,
          },
        })
        router.push(route)
      }
    } catch (e) {
      console.error(e)
    }
    // TODO: throw error if id is null, i.e. if file is invalid

    isInitializing.current = false
  }

  return (
    <>
      <Button
        variant="outlined"
        component="label"
        sx={(theme) => ({
          width: '100%',
          height: '60px',
          mb: 6,
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
