import { useState, useEffect } from 'react'
import { Box, IconButton, SelectChangeEvent } from '@mui/material'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import { Feature, FeatureCollection } from 'geojson'

import DropDownSelect from '#/components/common/DropDownSelect'

const ShpInit = ({
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

  const handleSelectColumn = (event: SelectChangeEvent) => {
    const { value } = event.target

    if (value == '' || value == null) {
      setColumn(undefined)
      return
    }

    setColumn(value)
  }

  const handleFinish = () => {
    if (column != null) {
      onFinish(geojson, column)
    }
  }

  return (
    <>
      {columns.length > 0 && (
        <DropDownSelect
          sx={() => ({ margin: '20px 0 0 0' })}
          value={column}
          options={columns.map((table) => {
            return { value: table, label: table }
          })}
          onChange={handleSelectColumn}
          label="Valitse sarake, joka sisältää aluevarauskoodit"
        ></DropDownSelect>
      )}

      {column != null && (
        <Box
          sx={(theme) => ({
            minHeight: '25px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            margin: '40px 0 60px 0',
          })}
        >
          <IconButton onClick={handleFinish}>
            <ArrowForwardIosIcon
              sx={(theme) => ({ float: 'right', cursor: 'pointer' })}
            ></ArrowForwardIosIcon>
          </IconButton>
        </Box>
      )}
    </>
  )
}

export default ShpInit
