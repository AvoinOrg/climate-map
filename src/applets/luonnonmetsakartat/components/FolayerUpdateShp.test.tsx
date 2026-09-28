import React, { createRef } from 'react'
import {
  renderUi,
  screen,
  act,
  waitFor,
  waitForColumns,
  label,
  chooseColumn,
  clearColumn,
  respondToWarning,
  adminLayer,
} from './shapefileUiTestSupport'
import FolayerUpdateShp, { type FolayerUpdateShpRef } from './FolayerUpdateShp'
import {
  fixtureBytes,
  fixtureDir,
  expectedColumns,
} from 'applets/luonnonmetsakartat/common/shapefileTestData'
import type { ColOptions } from 'applets/luonnonmetsakartat/common/types'
const AdmZip = jest.requireActual('adm-zip')
import { toArrayBuffer } from 'applets/luonnonmetsakartat/common/shapefileTestData'

const setup = async (
  file = 'valid-layer.zip',
  colOptions: ColOptions = expectedColumns
) => {
  const ref = createRef<FolayerUpdateShpRef>()
  const validity = jest.fn()
  const bytes = fixtureBytes(file)
  const view = renderUi(
    <FolayerUpdateShp
      ref={ref}
      fileBuffers={[bytes]}
      adminFolayerConf={{ ...adminLayer, colOptions }}
      onValidationChange={validity}
    />
  )
  await waitForColumns()
  const values = () => {
    const callback = jest.fn()
    act(() => ref.current!.getValues(callback))
    return callback
  }
  return { ...view, ref, validity, bytes, values }
}
it.each(['id', 'name_municipality'] as const)(
  'locks %s strategy, detects columns, and hands off exact bytes',
  async (indexingStrategy) => {
    const { bytes, values, validity } = await setup('valid-layer.zip', {
      ...expectedColumns,
      indexingStrategy,
    })
    expect(
      screen.getByRole('combobox', { name: label('indexing_strategy_label') })
    ).toBeDisabled()
    expect(validity).toHaveBeenLastCalledWith(true)
    expect(values()).toHaveBeenCalledWith({
      colOptions: { ...expectedColumns, indexingStrategy },
      rawShapefile: bytes,
    })
    expect(values().mock.calls[0][0].rawShapefile).toBe(bytes)
  }
)
it('preserves valid stored fields, repairs missing saved columns and submits manual optional clearing', async () => {
  const { values } = await setup('valid-layer.zip', {
    ...expectedColumns,
    nameCol: 'kuvaus',
    municipalityCol: 'old',
    descriptionCol: 'gone',
  })
  expect(
    screen.getByRole('combobox', { name: label('select_folayer_name_record') })
  ).toHaveTextContent('kuvaus')
  expect(
    screen.getByRole('combobox', {
      name: label('select_folayer_municipality_record'),
    })
  ).toHaveTextContent('kunta')
  await chooseColumn('select_folayer_name_record', 'nimi')
  await clearColumn('select_folayer_description_record')
  await clearColumn('select_folayer_area_record')
  expect(values().mock.calls[0][0].colOptions).toEqual({
    ...expectedColumns,
    descriptionCol: undefined,
    areaCol: undefined,
  })
})
it.each([
  'select_folayer_name_record',
  'select_folayer_municipality_record',
  'select_folayer_id_record',
])(
  'guards the ref as well as parent validity after clearing %s',
  async (field) => {
    const { values, validity } = await setup()
    await clearColumn(field)
    expect(validity).toHaveBeenLastCalledWith(false)
    expect(values()).toHaveBeenCalledWith(null)
  }
)
it.each([
  ['duplicate-id-layer.zip', 'id', 'error_id_not_unique'],
  [
    'duplicate-name-municipality-layer.zip',
    'name_municipality',
    'error_name_municipality_not_unique',
  ],
  [
    'mojibake-layer.zip',
    'name_municipality',
    'error_invalid_chars_or_encoding',
  ],
] as const)(
  'rejects %s in %s through the imperative callback',
  async (file, indexingStrategy, error) => {
    const { validity, values } = await setup(file, {
      ...expectedColumns,
      indexingStrategy,
    })
    expect(validity).toHaveBeenLastCalledWith(false)
    expect(values()).toHaveBeenCalledWith(null)
    expect(screen.getByRole('alert')).toHaveTextContent(error)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }
)
it('keeps an ID warning valid but does not release values until confirmed; cancel returns null', async () => {
  const { validity, values, bytes } = await setup('mojibake-layer.zip')
  expect(validity).toHaveBeenLastCalledWith(true)
  const cancelled = values()
  expect(cancelled).not.toHaveBeenCalled()
  await respondToWarning('cancel')
  expect(cancelled).toHaveBeenCalledWith(null)
  const accepted = values()
  await respondToWarning('confirm')
  expect(accepted).toHaveBeenCalledTimes(1)
  expect(accepted).toHaveBeenCalledWith({
    colOptions: expectedColumns,
    rawShapefile: bytes,
  })
})
it('requires name/municipality in ID mode even when the saved fields are absent from a real archive', async () => {
  const zip = new AdmZip(`${fixtureDir}/valid-layer.zip`)
  zip.deleteFile('valid-layer.dbf')
  const ref = createRef<FolayerUpdateShpRef>()
  const validity = jest.fn()
  renderUi(
    <FolayerUpdateShp
      ref={ref}
      fileBuffers={[toArrayBuffer(zip.toBuffer())]}
      adminFolayerConf={adminLayer}
      onValidationChange={validity}
    />
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'error_missing_columns'
  )
  const callback = jest.fn()
  act(() => ref.current!.getValues(callback))
  expect(callback).toHaveBeenCalledWith(null)
  expect(validity).toHaveBeenLastCalledWith(false)
})
it('failed and empty input never releases bytes and valid recovery re-enables parent validity', async () => {
  const ref = createRef<FolayerUpdateShpRef>()
  const validity = jest.fn()
  const view = renderUi(
    <FolayerUpdateShp
      ref={ref}
      fileBuffers={[]}
      adminFolayerConf={adminLayer}
      onValidationChange={validity}
    />
  )
  const callback = jest.fn()
  act(() => ref.current!.getValues(callback))
  expect(callback).toHaveBeenCalledWith(null)
  view.rerender(
    <FolayerUpdateShp
      ref={ref}
      fileBuffers={[new ArrayBuffer(5)]}
      adminFolayerConf={adminLayer}
      onValidationChange={validity}
    />
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'error_invalid_shapefile'
  )
  act(() => ref.current!.getValues(callback))
  expect(callback).toHaveBeenLastCalledWith(null)
  view.rerender(
    <FolayerUpdateShp
      ref={ref}
      fileBuffers={[fixtureBytes()]}
      adminFolayerConf={adminLayer}
      onValidationChange={validity}
    />
  )
  await waitFor(() => expect(validity).toHaveBeenLastCalledWith(true))
})
