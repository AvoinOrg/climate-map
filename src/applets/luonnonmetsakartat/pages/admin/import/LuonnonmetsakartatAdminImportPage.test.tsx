import React from 'react'
import {
  renderUi,
  screen,
  fireEvent,
  waitFor,
  waitForColumns,
  chooseColumn,
  clearColumn,
  label,
  nameImport,
  acceptImport,
  upload,
} from 'applets/luonnonmetsakartat/components/shapefileUiTestSupport'
import LuonnonmetsakartatAdminImportPage from './LuonnonmetsakartatAdminImportPage'
import type { ColOptions } from 'applets/luonnonmetsakartat/common/types'
import { expectedColumns } from 'applets/luonnonmetsakartat/common/shapefileTestData'

type CreatePayload = {
  colOptions: ColOptions
  name: string
  colorCode: string
  isHidden: boolean
  rawShapefile: ArrayBuffer
}
const mockCreate = jest.fn<
  Promise<{ id: string; status: number }>,
  [CreatePayload]
>()
jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerPostMutation',
  () => ({
    useAdminFolayerPostMutationOptions: () => ({ mutationFn: mockCreate }),
  })
)
beforeEach(() => mockCreate.mockResolvedValue({ id: 'created', status: 201 }))
it.each([false, true])(
  'uploads through FileReader to create with original bytes, selected fields and isVisible=%s',
  async (visible) => {
    const { container } = renderUi(<LuonnonmetsakartatAdminImportPage />)
    const bytes = upload(container)
    await waitForColumns()
    nameImport()
    await chooseColumn('select_folayer_name_record', 'maakunta')
    await clearColumn('select_folayer_description_record')
    if (visible)
      fireEvent.click(screen.getByRole('switch', { name: label('is_visible') }))
    acceptImport()
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
    expect(mockCreate.mock.calls[0][0]).toEqual({
      colOptions: {
        ...expectedColumns,
        nameCol: 'maakunta',
        descriptionCol: undefined,
      },
      name: 'Imported forest',
      colorCode: '#06402B',
      isHidden: !visible,
      rawShapefile: bytes,
    })
    expect(new Uint8Array(mockCreate.mock.calls[0][0].rawShapefile)).toEqual(
      new Uint8Array(bytes)
    )
  }
)
it.each([
  ['duplicate-id-layer.zip', 'id', 'error_id_not_unique'],
  [
    'duplicate-name-municipality-layer.zip',
    'name_municipality',
    'error_name_municipality_not_unique',
  ],
] as const)(
  'does not create from %s after clicking Accept',
  async (file, strategy, error) => {
    const { container } = renderUi(<LuonnonmetsakartatAdminImportPage />)
    upload(container, file)
    await waitForColumns()
    nameImport()
    if (strategy !== 'id')
      await chooseColumn(
        'indexing_strategy_label',
        label(`indexing_strategy.${strategy}`)
      )
    acceptImport()
    expect(await screen.findByRole('alert')).toHaveTextContent(error)
    expect(mockCreate).not.toHaveBeenCalled()
  }
)
it('blocks required selection failure and drops prior success when a new file fails parsing', async () => {
  const { container } = renderUi(<LuonnonmetsakartatAdminImportPage />)
  upload(container)
  await waitForColumns()
  nameImport()
  await clearColumn('select_folayer_municipality_record')
  acceptImport()
  expect(mockCreate).not.toHaveBeenCalled()
  upload(container, 'bad.zip', new ArrayBuffer(4))
  expect(
    screen.queryByRole('button', { name: 'Accept imported forest layer' })
  ).not.toBeInTheDocument()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'error_invalid_shapefile'
  )
  acceptImport()
  expect(mockCreate).not.toHaveBeenCalled()
})
