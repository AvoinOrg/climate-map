import React from 'react'
import {
  renderUi,
  screen,
  fireEvent,
  waitFor,
  waitForColumns,
  respondToWarning,
  settingsLabel,
  upload,
  adminLayer,
  act,
} from 'applets/luonnonmetsakartat/components/shapefileUiTestSupport'
import LuonnonmetsakartatAdminLayerFolayerSettingsPage from './LuonnonmetsakartatAdminLayerFolayerSettingsPage'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import type {
  AdminFolayerConf,
  IndexingStrategy,
} from 'applets/luonnonmetsakartat/common/types'
import { expectedColumns } from 'applets/luonnonmetsakartat/common/shapefileTestData'

type PatchPayload = AdminFolayerConf & {
  rawShapefile?: ArrayBuffer
  deleteAreasNotUpdated?: boolean
}
const mockPatch = jest.fn<
  Promise<{ id: string; status: number }>,
  [PatchPayload]
>()
jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerPatchMutation',
  () => ({
    useAdminFolayerPatchMutationOptions: () => ({ mutationFn: mockPatch }),
  })
)
jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerDeleteMutation',
  () => ({
    useAdminFolayerDeleteMutationOptions: () => ({
      mutationFn: () => {
        throw new Error('Unexpected layer deletion')
      },
    }),
  })
)
beforeEach(() =>
  mockPatch.mockResolvedValue({ id: adminLayer.id, status: 200 })
)
const setup = (strategy: IndexingStrategy = 'id', dirty = false) => {
  useAppletStore.setState({
    adminFolayerConfs: {
      [adminLayer.id]: {
        ...adminLayer,
        unsyncedChanges: dirty,
        colOptions: { ...expectedColumns, indexingStrategy: strategy },
      },
    },
  })
  return renderUi(<LuonnonmetsakartatAdminLayerFolayerSettingsPage />)
}
const save = () =>
  fireEvent.click(screen.getByRole('button', { name: settingsLabel('save') }))
const deleteMissing = () =>
  screen.getByRole('switch', {
    name: settingsLabel('delete_areas_not_updated'),
  })
it.each([
  ['id', 0, false],
  ['id', 1, true],
  ['id', 2, false],
  ['name_municipality', 0, false],
  ['name_municipality', 1, true],
] as const)(
  '%s replacement after %s toggles passes delete=%s and clears replacement on success',
  async (strategy, toggles, deleted) => {
    const { container } = setup(strategy)
    const bytes = upload(container)
    expect(
      screen.getByRole('button', { name: settingsLabel('save') })
    ).toBeDisabled()
    await waitForColumns()
    expect(deleteMissing()).not.toBeChecked()
    for (let i = 0; i < toggles; i++) fireEvent.click(deleteMissing())
    save()
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1))
    expect(mockPatch.mock.calls[0][0]).toEqual({
      ...adminLayer,
      colOptions: { ...expectedColumns, indexingStrategy: strategy },
      rawShapefile: bytes,
      deleteAreasNotUpdated: deleted,
    })
    expect(new Uint8Array(mockPatch.mock.calls[0][0].rawShapefile!)).toEqual(
      new Uint8Array(bytes)
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('switch', {
          name: settingsLabel('delete_areas_not_updated'),
        })
      ).not.toBeInTheDocument()
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    upload(container)
    await waitForColumns()
    expect(deleteMissing()).not.toBeChecked()
  }
)
it('does not mutate while warning confirmation is pending or cancelled; later confirmation patches once', async () => {
  const { container } = setup()
  const bytes = upload(container, 'mojibake-layer.zip')
  await waitForColumns()
  save()
  await screen.findByRole('dialog')
  expect(mockPatch).not.toHaveBeenCalled()
  await respondToWarning('cancel')
  expect(mockPatch).not.toHaveBeenCalled()
  expect(
    screen.getByRole('button', { name: settingsLabel('save') })
  ).toBeEnabled()
  save()
  await respondToWarning('confirm')
  await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1))
  expect(mockPatch.mock.calls[0][0]).toMatchObject({
    rawShapefile: bytes,
    deleteAreasNotUpdated: false,
    colOptions: expectedColumns,
  })
})
it.each([
  ['duplicate-id-layer.zip', 'id'],
  ['duplicate-name-municipality-layer.zip', 'name_municipality'],
  ['mojibake-layer.zip', 'name_municipality'],
] as const)('never patches hard invalid %s', async (file, strategy) => {
  const { container } = setup(strategy)
  upload(container, file)
  await waitForColumns()
  expect(
    screen.getByRole('button', { name: settingsLabel('save') })
  ).toBeDisabled()
  save()
  expect(mockPatch).not.toHaveBeenCalled()
})
it('replacing an upload clears validity during FileReader and parse failure; no stale PATCH', async () => {
  const { container } = setup()
  upload(container)
  await waitForColumns()
  upload(container, 'bad.zip', new ArrayBuffer(8))
  expect(
    screen.getByRole('button', { name: settingsLabel('save') })
  ).toBeDisabled()
  save()
  expect(mockPatch).not.toHaveBeenCalled()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'error_invalid_shapefile'
  )
  save()
  expect(mockPatch).not.toHaveBeenCalled()
})
it('does not fall back to new unvalidated bytes when an old warning is confirmed', async () => {
  const { container } = setup()
  upload(container, 'mojibake-layer.zip')
  await waitForColumns()
  save()
  await screen.findByRole('dialog')
  upload(container, 'bad.zip', new ArrayBuffer(4))
  await respondToWarning('confirm')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'error_invalid_shapefile'
  )
  expect(mockPatch).not.toHaveBeenCalled()
})
it('retains an ordinary settings save without replacement-only fields', async () => {
  setup('id', true)
  save()
  await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1))
  expect(mockPatch.mock.calls[0][0]).toEqual({
    ...adminLayer,
    unsyncedChanges: true,
  })
  expect(mockPatch.mock.calls[0][0]).not.toHaveProperty('rawShapefile')
  expect(mockPatch.mock.calls[0][0]).not.toHaveProperty('deleteAreasNotUpdated')
})
it('ignores an obsolete FileReader completion when a newer upload has finished', async () => {
  const readers: FileReader[] = []
  const realReader = window.FileReader
  const spy = jest.spyOn(window, 'FileReader').mockImplementation(() => {
    const reader = new realReader()
    jest.spyOn(reader, 'readAsArrayBuffer').mockImplementation(() => {})
    readers.push(reader)
    return reader
  })
  try {
    const { container } = setup()
    upload(container, 'old.zip', new ArrayBuffer(4))
    const bytes = upload(container)
    const finish = async (reader: FileReader, result: ArrayBuffer) => {
      Object.defineProperty(reader, 'result', { value: result })
      await act(async () =>
        reader.onloadend?.call(
          reader,
          new ProgressEvent('loadend') as ProgressEvent<FileReader>
        )
      )
    }
    await finish(readers[1], bytes)
    await waitForColumns()
    await finish(readers[0], new ArrayBuffer(4))
    save()
    await waitFor(() => expect(mockPatch).toHaveBeenCalledTimes(1))
    expect(mockPatch.mock.calls[0][0].rawShapefile).toBe(bytes)
  } finally {
    spy.mockRestore()
  }
})
