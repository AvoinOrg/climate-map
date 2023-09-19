import { GeoPackage } from '@ngageoint/geopackage'
import { useState, useEffect } from 'react'
import { SelectChangeEvent } from '@mui/material'

import DropDownSelect from '#/components/common/DropDownSelect'
import PlanImportActionsRow from './PlanImportActionsRow'

const GpkgInit = ({
  fileBuffer,
  onFinish,
}: {
  fileBuffer: ArrayBuffer
  onFinish: (json: any, columnName: string) => void
}) => {
  const [gpkgFile, setGpkgFile] = useState<GeoPackage>()
  const [table, setTable] = useState<string>()
  const [column, setColumn] = useState<string>()
  const [tables, setTables] = useState<string[]>([])
  const [columns, setColumns] = useState<string[]>([])

  useEffect(() => {
    const loadGpkg = async (fileBuffer: ArrayBuffer) => {
      const { GeoPackageAPI, setSqljsWasmLocateFile } = await import('@ngageoint/geopackage')
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
      setColumn(undefined)

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

  const handleSelectColumn = (event: SelectChangeEvent) => {
    const { value } = event.target

    if (value == '' || value == null) {
      setColumn(undefined)
      return
    }

    setColumn(value)
  }

  const handleExtract = () => {
    const extract = async (geopackage: any, tableName: string): Promise<any> => {
      const geoJson: any = {
        type: 'FeatureCollection',
        features: [],
      }
      const iterator = geopackage.iterateGeoJSONFeatures(tableName)
      for (const feature of iterator) {
        geoJson.features.push(feature)
      }
      return Promise.resolve(geoJson)
    }

    if (column != null) {
      extract(gpkgFile, tables[0]).then((json) => {
        onFinish(json, column)
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
        ></DropDownSelect>
      )}
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

      {table != null && column != null && (
        <PlanImportActionsRow
          onClickNext={handleExtract}
        ></PlanImportActionsRow>
      )}
    </>
  )
}

export default GpkgInit
