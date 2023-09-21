import { useState, useEffect } from 'react'
import { Feature, FeatureCollection } from 'geojson'

import PlanImportActionsRow from './PlanImportActionsRow'
import PlanImportCodeRecordSelect from './PlanImportCodeRecordSelect'

const PlanImportShp = ({
  fileBuffer,
  onFinish,
}: {
  fileBuffer: ArrayBuffer
  onFinish: (json: any, columnName: string) => void
}) => {
  const [geojson, setGeojson] = useState<FeatureCollection>()
  const [column, setColumn] = useState<string>()
  const [columns, setColumns] = useState<string[]>([])

  useEffect(() => {
    const loadGeojson = async (fileBuffer: ArrayBuffer) => {
      const shp = (await import('shpjs')).default
      const json = await shp(fileBuffer)

      let allFeatures: Feature[] = []

      if (Array.isArray(json)) {
        json.forEach((collection) => {
          allFeatures = allFeatures.concat(collection.features)
        })
      } else {
        // If json is a single FeatureCollectionWithFilename
        allFeatures = json.features
      }

      const mergedFeatureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: allFeatures,
      }

      setGeojson(mergedFeatureCollection)
    }

    loadGeojson(fileBuffer)
  }, [fileBuffer])

  useEffect(() => {
    if (geojson != null) {
      const featureProperties = geojson.features[0].properties

      // TODO: If columns null, return error to page
      let columns: string[] = []
      if (featureProperties) {
        columns = Object.keys(featureProperties)
      }

      setColumns(columns)
    }
  }, [geojson])

  const handleColumnChange = (newColumn: string | undefined) => {
    setColumn(newColumn)
  }

  const handleFinish = () => {
    if (column != null) {
      onFinish(geojson, column)
    }
  }

  return (
    <>
      {columns.length > 0 && (
        <PlanImportCodeRecordSelect
          columns={columns}
          selectedColumn={column}
          onColumnChange={handleColumnChange}
        ></PlanImportCodeRecordSelect>
      )}

      <PlanImportActionsRow
        onClickAccept={handleFinish}
        isAcceptDisabled={column == null}
      ></PlanImportActionsRow>
    </>
  )
}

export default PlanImportShp
