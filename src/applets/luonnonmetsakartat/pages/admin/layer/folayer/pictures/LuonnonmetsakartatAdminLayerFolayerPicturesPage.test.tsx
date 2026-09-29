import React from 'react'
import {
  seedAreaPictures,
  setupAreaPictures,
} from 'applets/luonnonmetsakartat/components/areaPictureTestSupport'
import {
  adminPath,
  httpError,
  mockNavigation,
  response,
} from 'applets/luonnonmetsakartat/pages/pageTestSupport'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import PicturesPage from './LuonnonmetsakartatAdminLayerFolayerPicturesPage'
import NotificationProvider from '#/components/Notification/NotificationProvider'
import SidebarScaffold from '#/components/Sidebar/SidebarScaffold'
import { useUIStore } from '#/common/store/uiStore'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { FolayerConfState } from 'applets/luonnonmetsakartat/common/types'
import {
  createLuonnonmetsakartatMockPicturesMappedFixtureState,
  createLuonnonmetsakartatMockPicturesUnmatchedFixtureState,
  LUONNONMETSAKARTAT_MOCK_MATCHED_PICTURE_FOLDER as matched,
  LUONNONMETSAKARTAT_MOCK_UNMATCHED_PICTURE_FOLDER as unmatched,
} from 'applets/luonnonmetsakartat/common/mockScenarios/seedData'
import {
  MOCK_VISIBLE_LAYER_ID as layerId,
  MOCK_VISIBLE_AREA_WITH_PICTURES_ID as ridgeId,
  MOCK_VISIBLE_AREA_WITHOUT_PICTURES_ID as groveId,
} from 'applets/luonnonmetsakartat/common/mockScenarios/ids'

jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerPatchMutation',
  () => {
    const actual = jest.requireActual(
      'applets/luonnonmetsakartat/common/queries/adminFolayerPatchMutation'
    )
    return {
      useAdminFolayerPatchMutationOptions: () => ({
        ...actual.useAdminFolayerPatchMutationOptions(),
        retry: false,
      }),
    }
  }
)
// These complete flows exercise real Base UI portals and virtual lists.
jest.setTimeout(15000)
const pages = setupAreaPictures()
beforeEach(() => jest.useFakeTimers({ doNotFake: ['queueMicrotask'] }))
const prefix = 'sidebar.admin.folayer.settings.picture.'
const saveName = 'sidebar.admin.folayer.pictures.save'
const grove = 'Lohja,Mock Lakeside Grove'
const ridgeOption = 'Espoo, Mock Ridge Forest'
const groveOption = 'Lohja, Mock Lakeside Grove'
const saveButton = () => screen.getByRole('button', { name: saveName })
const mapping = (folder: string) =>
  screen.getByRole('combobox', { name: `${prefix}select_area: ${folder}` })
const clear = (folder: string) =>
  fireEvent.click(
    screen.getByRole('button', {
      name: `${prefix}select_area: ${folder} clear`,
    })
  )
const choose = async (folder: string, option: string) => {
  fireEvent.focus(mapping(folder))
  fireEvent.change(mapping(folder), { target: { value: '' } })
  fireEvent.keyDown(mapping(folder), { key: 'ArrowDown' })
  fireEvent.click(await screen.findByRole('option', { name: option }))
  await waitFor(() => expect(mapping(folder)).toHaveValue(option))
}
const file = ({
  path,
  type = 'image/jpeg',
}: {
  path: string
  type?: string
}) => {
  const result = new File([path], path.split('/').pop()!, {
    type,
    lastModified: 1,
  })
  Object.defineProperty(result, 'webkitRelativePath', { value: path })
  return result
}
const input = (label = `${prefix}select_folder`) => {
  // The directory input is deliberately hidden inside the real labeled upload
  // control; dispatch its native change path, not the component's ref methods.
  const control = screen.getByRole('button', { name: label })
  return (
    control.matches('input')
      ? control
      : control.querySelector('input[type="file"]')
  ) as HTMLInputElement
}
const select = (files: File[], label?: string) => {
  const directory = input(label)
  expect(directory).toHaveAttribute('multiple')
  expect(directory).toHaveAttribute('webkitdirectory')
  expect(directory).toHaveAttribute('accept', 'image/*')
  fireEvent.change(directory, { target: { files } })
  expect(directory.value).toBe('')
}
const mixedFiles = () => [
  ...createLuonnonmetsakartatMockPicturesMappedFixtureState().files!,
  createLuonnonmetsakartatMockPicturesUnmatchedFixtureState().files![0],
  file({ path: `mock-pictures/${matched}/notes.txt`, type: 'text/plain' }),
]
const totals = (areas: number, images: number) => {
  expect(
    screen.getByText(`${prefix}areas: ${areas} • ${prefix}images: ${images}`, {
      selector: 'p',
    })
  ).toBeVisible()
}
const savedLayer = () => ({
  id: layerId,
  name: 'Server layer',
  is_hidden: false,
  color_code: '#123456',
  created_ts: 1,
  updated_ts: 42,
})
const setup = ({ ready = true, noAreas = false, missing = false } = {}) => {
  seedAreaPictures()
  if (!ready || missing)
    useAppletStore.setState((state) => ({
      adminFolayerConfs: missing
        ? {}
        : {
            ...state.adminFolayerConfs,
            [layerId]: {
              ...state.adminFolayerConfs[layerId],
              state: FolayerConfState.Fetching,
            },
          },
    }))
  if (noAreas)
    useAppletStore.setState((state) => ({
      folayerAreaConfs: {
        ...state.folayerAreaConfs,
        [layerId]: {
          ...state.folayerAreaConfs[layerId],
          data: { type: 'FeatureCollection', features: [] },
        },
      },
    }))
  mockNavigation.setState({
    pathname: `${adminPath}/layer/${layerId}/pictures`,
    params: { folayerIdSlug: layerId },
  })
  useUIStore.setState({ isSidebarOpen: true })
  return pages.render(
    <NotificationProvider>
      <SidebarScaffold>
        <PicturesPage />
      </SidebarScaffold>
    </NotificationProvider>
  )
}
const save = async () =>
  act(async () => {
    fireEvent.click(saveButton())
  })
const expectReset = async (client: ReturnType<typeof setup>['client']) => {
  await waitFor(() => expect(client.isMutating()).toBe(0))
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: saveName })
    ).not.toBeInTheDocument()
  )
  expect(input()).toBeEnabled()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(useUIStore.getState()._activeSidebarLoaders.size).toBe(0)
  expect(useUIStore.getState().isSidebarLoading).toBe(false)
  expect(
    await screen.findByText('notifications.folayer_pictures_success')
  ).toBeVisible()
}
const expectPayload = ({
  files,
  ids,
  index = 0,
}: {
  files: File[]
  ids: string[]
  index?: number
}) => {
  const [url, body] = jest.mocked(axios.patch).mock.calls[index]
  expect(url).toBe(`/api/luonnonmetsakartat/layer/${layerId}`)
  const form = body as FormData
  expect(
    (form.getAll('bulk_images') as File[]).map((image) => image.name)
  ).toEqual(files.map((image) => image.name))
  expect(form.getAll('bulk_area_ids')).toEqual(ids)
  expect(Array.from(form.keys())).toEqual([
    ...files.map(() => 'bulk_images'),
    ...ids.map(() => 'bulk_area_ids'),
  ])
}

it.each([{ ready: false }, { missing: true }])(
  'keeps a not-ready layer loading without upload or Save: %j',
  (options) => {
    setup(options)
    expect(screen.getByRole('progressbar')).toBeVisible()
    expect(
      screen.queryByLabelText(`${prefix}select_folder`)
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: saveName })
    ).not.toBeInTheDocument()
    expect(axios.patch).not.toHaveBeenCalled()
  }
)

it('starts empty and cannot save image inputs when the layer has no areas', () => {
  setup({ noAreas: true })
  expect(input()).toBeEnabled()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  select(mixedFiles())
  totals(0, 0)
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  expect(axios.patch).not.toHaveBeenCalled()
})

it('maps, changes and clears folders through actual controls, including automatic-match suppression and no-options recovery', async () => {
  setup()
  expect(input()).toBeEnabled()
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  select(mixedFiles())
  expect(input('mock-pictures')).toBeEnabled()
  expect(screen.getAllByRole('combobox')).toHaveLength(3)
  expect(mapping(matched)).toHaveValue(ridgeOption)
  expect(mapping(unmatched)).toHaveValue('')
  totals(2, 3)
  expect(screen.getByText(`${prefix}unmatched_folder`)).toBeVisible()
  expect(saveButton()).toBeEnabled()
  fireEvent.change(mapping(unmatched), { target: { value: 'zzzzzz' } })
  fireEvent.keyDown(mapping(unmatched), { key: 'ArrowDown' })
  expect(await screen.findByText(`${prefix}no_options`)).toBeVisible()
  expect(screen.queryByRole('option')).not.toBeInTheDocument()
  await choose(unmatched, ridgeOption)
  totals(2, 4)
  expect(
    screen.queryByText(`${prefix}unmatched_folder`)
  ).not.toBeInTheDocument()
  await choose(unmatched, groveOption)
  totals(2, 4)
  clear(matched)
  expect(mapping(matched)).toHaveValue('')
  totals(1, 2)
  clear(grove)
  totals(1, 1)
  clear(unmatched)
  totals(0, 0)
  expect(screen.getByText(`${prefix}unmatched_folders`)).toBeVisible()
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  await choose(unmatched, ridgeOption)
  totals(1, 1)
  expect(mapping(matched)).toHaveValue('')
  expect(saveButton()).toBeEnabled()
  expect(axios.patch).not.toHaveBeenCalled()
})

it('submits the exact changed mapping with repeated area IDs, blocks pending edits and repeated saves, then resets ordinary selection', async () => {
  const { client } = setup()
  const files = mixedFiles()
  select(files)
  await choose(unmatched, ridgeOption)
  await choose(unmatched, groveOption)
  const neighbor =
    useAppletStore.getState().adminFolayerConfs['mock-hidden-layer']
  const request = pages.controlled(response(savedLayer()))
  jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
  await save()
  await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1))
  const sent = [files[0], files[1], files[2], files[3]]
  expect(client.getMutationCache().getAll()[0].state.variables).toEqual({
    id: layerId,
    bulkImages: sent,
    bulkAreaIds: [ridgeId, ridgeId, groveId, groveId],
  })
  // Exact identities complement ordered FormData names and repeated target IDs.
  const variables = client.getMutationCache().getAll()[0].state
    .variables as unknown as {
    bulkImages: File[]
  }
  sent.forEach((image, i) => expect(variables.bulkImages[i]).toBe(image))
  expectPayload({ files: sent, ids: [ridgeId, ridgeId, groveId, groveId] })
  expect(await screen.findByRole('progressbar')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await save()
  expect(axios.patch).toHaveBeenCalledTimes(1)
  expect(saveButton()).toBeDisabled()
  expect(input('mock-pictures')).toBeDisabled()
  screen
    .getAllByRole('combobox')
    .forEach((control) => expect(control).toBeDisabled())
  expect(
    screen.getByRole('button', {
      name: `${prefix}select_area: ${matched} clear`,
    })
  ).toBeDisabled()
  await act(async () => {
    request.resolve(response(savedLayer()))
    await jest.advanceTimersByTimeAsync(0)
  })
  await expectReset(client)
  expect(useAppletStore.getState().adminFolayerConfs[layerId]).toMatchObject({
    name: 'Server layer',
    updatedTs: 42,
  })
  expect(
    useAppletStore.getState().adminFolayerConfs['mock-hidden-layer']
  ).toEqual(neighbor)
  select(files)
  totals(2, 3)
  expect(saveButton()).toBeEnabled()
})

it('allows partial saves while unmatched and explicitly cleared folders stay excluded', async () => {
  const { client } = setup()
  const files = mixedFiles()
  select(files)
  clear(grove)
  totals(1, 2)
  expect(screen.getByText(`${prefix}unmatched_folders`)).toBeVisible()
  expect(saveButton()).toBeEnabled()
  jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
  await save()
  await expectReset(client)
  expectPayload({ files: [files[0], files[1]], ids: [ridgeId, ridgeId] })
})

it('retains files and manual mapping after failure and recovers with a changed mapped subset', async () => {
  const { client } = setup()
  const files = mixedFiles()
  select(files)
  await choose(unmatched, groveOption)
  const request = pages.controlled(response(savedLayer()))
  const error = httpError(503)
  jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
  await save()
  expect(await screen.findByRole('progressbar')).toBeVisible()
  await act(async () => {
    request.reject(error)
    await jest.advanceTimersByTimeAsync(0)
  })
  await waitFor(() => expect(client.isMutating()).toBe(0))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'notifications.folayer_creation_error'
  )
  expect(jest.mocked(console.error).mock.calls).toEqual([[error]])
  jest.mocked(console.error).mockClear()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(useUIStore.getState()._activeSidebarLoaders.size).toBe(0)
  expect(input('mock-pictures')).toBeEnabled()
  expect(mapping(unmatched)).toHaveValue(groveOption)
  totals(2, 4)
  expect(saveButton()).toBeEnabled()
  expect(
    screen.queryByText('notifications.folayer_pictures_success')
  ).not.toBeInTheDocument()
  clear(matched)
  totals(1, 2)
  jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
  await save()
  await expectReset(client)
  expect(axios.patch).toHaveBeenCalledTimes(2)
  expectPayload({
    files: [files[2], files[3]],
    ids: [groveId, groveId],
    index: 1,
  })
})

it('replaces the directory and resets old manual mappings so neither unmatched nor previous-directory files can submit', async () => {
  const { client } = setup()
  select(mixedFiles())
  await choose(unmatched, groveOption)
  const fresh = file({ path: `new-root/${unmatched}/fresh.jpg` })
  select([fresh], 'mock-pictures')
  expect(input('new-root')).toBeEnabled()
  expect(screen.getAllByRole('combobox')).toHaveLength(1)
  expect(mapping(unmatched)).toHaveValue('')
  totals(0, 0)
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  await choose(unmatched, ridgeOption)
  jest.mocked(axios.patch).mockResolvedValueOnce(response(savedLayer()))
  await save()
  await expectReset(client)
  expectPayload({ files: [fresh], ids: [ridgeId] })
  const variables = client.getMutationCache().getAll()[0].state
    .variables as unknown as {
    bulkImages: File[]
  }
  expect(variables.bulkImages).toHaveLength(1)
  expect(variables.bulkImages[0]).toBe(fresh)
})
