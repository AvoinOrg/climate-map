import React from 'react'
import {
  renderUi,
  screen,
  fireEvent,
  waitFor,
  waitForColumns,
  label,
  chooseColumn,
  clearColumn,
  nameImport,
  acceptImport,
  respondToWarning,
} from './shapefileUiTestSupport'
import FolayerImportShp from './FolayerImportShp'
import {
  fixtureBytes,
  expectedColumns,
} from 'applets/luonnonmetsakartat/common/shapefileTestData'

const setup = async (file = 'valid-layer.zip') => {
  const finish = jest.fn()
  const view = renderUi(
    <FolayerImportShp
      fileBuffers={[fixtureBytes(file)]}
      onFinish={finish}
      isInitializing={false}
    />
  )
  await waitForColumns()
  nameImport()
  return { ...view, finish }
}
it('detects six columns and submits metadata and manual/optional selections', async () => {
  const { finish } = await setup()
  expect(
    screen.getByRole('combobox', { name: label('select_folayer_area_record') })
  ).toHaveTextContent('pinta_ala')
  await chooseColumn('select_folayer_name_record', 'kuvaus')
  await clearColumn('select_folayer_description_record')
  await clearColumn('select_folayer_area_record')
  await clearColumn('select_folayer_region_record')
  fireEvent.click(screen.getByRole('switch', { name: label('is_visible') }))
  acceptImport()
  expect(finish).toHaveBeenCalledTimes(1)
  expect(finish).toHaveBeenCalledWith({
    ...expectedColumns,
    nameCol: 'kuvaus',
    descriptionCol: undefined,
    areaCol: undefined,
    regionCol: undefined,
    name: 'Imported forest',
    colorCode: '#06402B',
    isVisible: true,
  })
})
it.each([
  'select_folayer_name_record',
  'select_folayer_municipality_record',
  'select_folayer_id_record',
])('cleared %s disables accept', async (field) => {
  const { finish } = await setup()
  await clearColumn(field)
  expect(
    screen.getByRole('button', { name: 'Accept imported forest layer' })
  ).toBeDisabled()
  acceptImport()
  expect(finish).not.toHaveBeenCalled()
})
it.each([
  ['duplicate-id-layer.zip', 'id', 'error_id_not_unique', 'lm-duplicate-1'],
  [
    'duplicate-name-municipality-layer.zip',
    'name_municipality',
    'error_name_municipality_not_unique',
    'Shared Forest - Espoo',
  ],
] as const)(
  'blocks %s visibly, accepts it under the other strategy',
  async (file, strategy, error, duplicate) => {
    const { finish } = await setup(file)
    if (strategy !== 'id')
      await chooseColumn(
        'indexing_strategy_label',
        label(`indexing_strategy.${strategy}`)
      )
    acceptImport()
    expect(screen.getByRole('alert')).toHaveTextContent(label(error))
    expect(screen.getByRole('alert')).toHaveTextContent(duplicate)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(finish).not.toHaveBeenCalled()
    await chooseColumn(
      'indexing_strategy_label',
      label(
        `indexing_strategy.${strategy === 'id' ? 'name_municipality' : 'id'}`
      )
    )
    acceptImport()
    expect(finish).toHaveBeenCalledTimes(1)
  }
)
it('pair mode requires no ID and blocks damaged identity text', async () => {
  const { finish } = await setup('mojibake-layer.zip')
  await chooseColumn(
    'indexing_strategy_label',
    label('indexing_strategy.name_municipality')
  )
  await clearColumn('select_folayer_id_record_optional')
  acceptImport()
  expect(screen.getByRole('alert')).toHaveTextContent('MÃ¤ntymäki')
  expect(finish).not.toHaveBeenCalled()
})
it('ID warnings await a real dialog, cancel without finishing, then confirm once', async () => {
  const { finish } = await setup('mojibake-layer.zip')
  acceptImport()
  expect(finish).not.toHaveBeenCalled()
  await respondToWarning('cancel')
  expect(finish).not.toHaveBeenCalled()
  acceptImport()
  await respondToWarning('confirm')
  expect(finish).toHaveBeenCalledTimes(1)
})
it('disables pending/initializing input, reports parse failure and recovers with a real ZIP', async () => {
  const finish = jest.fn()
  const view = renderUi(
    <FolayerImportShp
      fileBuffers={[]}
      onFinish={finish}
      isInitializing={false}
    />
  )
  expect(
    screen.getByRole('button', { name: 'Accept imported forest layer' })
  ).toBeDisabled()
  view.rerender(
    <FolayerImportShp
      fileBuffers={[new ArrayBuffer(4)]}
      onFinish={finish}
      isInitializing={false}
    />
  )
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'error_invalid_shapefile'
  )
  acceptImport()
  expect(finish).not.toHaveBeenCalled()
  const buffers = [fixtureBytes()]
  view.rerender(
    <FolayerImportShp fileBuffers={buffers} onFinish={finish} isInitializing />
  )
  await waitForColumns()
  nameImport()
  expect(
    screen.getByRole('button', { name: 'Accept imported forest layer' })
  ).toBeDisabled()
  view.rerender(
    <FolayerImportShp
      fileBuffers={buffers}
      onFinish={finish}
      isInitializing={false}
    />
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Accept imported forest layer' })
    ).toBeEnabled()
  )
  acceptImport()
  expect(finish).toHaveBeenCalledTimes(1)
})
