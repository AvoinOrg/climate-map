import { GeoPackage } from '@ngageoint/geopackage'
import { useState, useEffect } from 'react'
import { SelectChangeEvent } from '@mui/material'
import { FeatureCollection } from 'geojson'

import DropDownSelect from '#/components/common/DropDownSelect'
import PlanImportActionsRow from './PlanImportActionsRow'
import PlanImportCodeRecordSelect from './PlanImportCodeRecordSelect'
import { useTranslate } from '@tolgee/react'

const PlanImportGpkg = ({
  fileBuffer,
  onFinish,
}: {
  fileBuffer: ArrayBuffer
  onFinish: (
    json: FeatureCollection,
    zoningColName: string,
    nameColName?: string
  ) => void
}) => {
  const { t } = useTranslate('hiilikartta')
  const [gpkgFile, setGpkgFile] = useState<GeoPackage>()
  const [table, setTable] = useState<string>()
  const [tables, setTables] = useState<string[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [zoningCol, setZoningCol] = useState<string | undefined>()
  const [nameCol, setNameCol] = useState<string | undefined>() // nameCol can be optional

  useEffect(() => {
    const loadGpkg = async (fileBuffer: ArrayBuffer) => {
      const { GeoPackageAPI, setSqljsWasmLocateFile } = await import(
        '@ngageoint/geopackage'
      )
      setSqljsWasmLocateFile((file) => '/dyn/' + file)

      const geopackage = await GeoPackageAPI.open(new Uint8Array(fileBuffer))
      setGpkgFile(geopackage)
    }

    loadGpkg(fileBuffer)
  }, [fileBuffer])

  useEffect(() => {
    if (table != null && gpkgFile != null) {
      const featureDao = gpkgFile.getFeatureDao(table)
      const columns = featureDao.columns

      setColumns(columns)
    }
  }, [table, gpkgFile])

  useEffect(() => {
    if (gpkgFile != null) {
      const tables = gpkgFile.getFeatureTables()
      setColumns([])

      switch (tables.length) {
        case 0: {
          //TODO: handle zero tables
          console.error('No feature tables found')
        }
        case 1: {
          const table = tables[0]
          setTables(tables)
          setTable(table)
        }
        default: {
          setTables(tables)
        }
      }
      // console.log(featureDao.columns)

      // // get the info for the table
      // const tableInfo = geopackage.getInfoForTable(featureDao)

      // const srs = geopackage.getSrs(tableInfo.srs.id)
      // const srsName = srs.organization.toUpperCase() + ':' + srs.organization_coordsys_id
    }
  }, [gpkgFile])

  const handleSelectTable = (event: SelectChangeEvent) => {
    const { value } = event.target
    setTable(value)
  }

  const handleZoningColChange = (newZoningCol: string | undefined) => {
    setZoningCol(newZoningCol)
  }

  const handleNameColChange = (newNameCol: string | undefined) => {
    setNameCol(newNameCol)
  }

  const handleExtract = () => {
    const extract = async (
      geopackage: GeoPackage,
      tableName: string
    ): Promise<FeatureCollection> => {
      const geoJson: FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }
      const iterator = geopackage.iterateGeoJSONFeatures(tableName)
      for (const feature of iterator) {
        geoJson.features.push(feature)
      }
      return Promise.resolve(geoJson)
    }

    if (zoningCol != null && table != null) {
      extract(gpkgFile!, table).then((json) => {
        // using a non-null assertion for gpkgFile as it's checked in the if condition
        onFinish(json, zoningCol, nameCol) // pass nameCol, it can be undefined
      })
    }
  }

  return (
    <>
      {tables.length > 1 && (
        <DropDownSelect
          value={table}
          options={tables.map((table) => {
            return { value: table, label: table }
          })}
          onChange={handleSelectTable}
          label="Valitse tietokantataulu"
          sx={{ mb: 5 }}
        ></DropDownSelect>
      )}
      {columns.length > 0 && (
        <>
          <PlanImportCodeRecordSelect
            columns={columns}
            selectedColumn={zoningCol}
            onColumnChange={handleZoningColChange}
            label={t('sidebar.create.select_zone_code_record')}
          />
          <PlanImportCodeRecordSelect
            columns={columns}
            selectedColumn={nameCol}
            onColumnChange={handleNameColChange}
            label={t('sidebar.create.select_zone_name_record')}
            sx={{ mt: 5 }}
          />
        </>
      )}
      <PlanImportActionsRow
        onClickAccept={handleExtract}
        isAcceptDisabled={table == null || zoningCol == null}
      ></PlanImportActionsRow>
    </>
  )
}

export default PlanImportGpkg
