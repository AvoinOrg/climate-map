import React from 'react'
import { setupAreaPictures, seedAreaPictures } from './areaPictureTestSupport'
import {
  httpError,
  response,
} from 'applets/luonnonmetsakartat/pages/pageTestSupport'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import NotificationProvider from '#/components/Notification/NotificationProvider'
import { useUIStore } from '#/common/store/uiStore'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useAdminFolayerAreaQueryOptions } from 'applets/luonnonmetsakartat/common/queries/adminFolayerAreaQuery'
import { MOCK_VISIBLE_LAYER_ID as layerId } from 'applets/luonnonmetsakartat/common/mockScenarios/ids'
import type { FolayerFeature } from 'applets/luonnonmetsakartat/common/types'

jest.mock(
  'applets/luonnonmetsakartat/common/queries/adminFolayerAreaPatchMutation',
  () => {
    const actual = jest.requireActual(
      'applets/luonnonmetsakartat/common/queries/adminFolayerAreaPatchMutation'
    )
    return {
      useAdminFolayerAreaPatchMutationOptions: () => ({
        ...actual.useAdminFolayerAreaPatchMutationOptions(),
        retry: false,
      }),
    }
  }
)
// pageTestSupport intentionally stubs the popup for access tests. This suite
// must render the real editor, real map wrapper and real ESM gallery.
const AreaModalAdmin =
  jest.requireActual<typeof import('./AreaModalAdmin')>(
    './AreaModalAdmin'
  ).default
const pages = setupAreaPictures()
const saveName = 'sidebar.admin.folayer.settings.save'
const input = (field: string) =>
  screen.getByRole('textbox', { name: `sidebar.admin.area.${field}.header` })
const selected = () =>
  useAppletStore.getState().folayerAreaConfs[layerId].data.features[0]
const savedPictures = [
  '/storage/object/first.jpg',
  '/storage/object/second.jpg',
]
const serverFeature = (name = 'Server confirmed name'): FolayerFeature => ({
  ...selected(),
  properties: {
    ...selected().properties,
    name,
    updated_ts: '2026-09-29T12:00:00Z' as never,
    pictures: JSON.stringify(savedPictures),
  },
})
const QueryRefresh = () => {
  useQuery(useAdminFolayerAreaQueryOptions(layerId))
  return null
}
const setup = (refresh = false) => {
  seedAreaPictures()
  const feature = selected()
  // Real GET-normalized store shape, unlike the serialized PATCH response.
  feature.properties.pictures = savedPictures as unknown as string
  const dims = { width: 960, height: 640, centerX: 480, centerY: 320 }
  useUIStore.setState({
    mapDims: { min: dims, visible: dims },
    popupModalViewMode: 'constrained',
  })
  const onClose = jest.fn()
  const view = pages.render(
    <NotificationProvider>
      {refresh && <QueryRefresh />}
      <AreaModalAdmin
        folayerId={layerId}
        features={
          [
            {
              ...feature,
              properties: { ...feature.properties, name: 'Stale popup name' },
            },
          ] as React.ComponentProps<typeof AreaModalAdmin>['features']
        }
        onClose={onClose}
      />
    </NotificationProvider>
  )
  return { ...view, onClose, feature }
}
const gallerySources = () =>
  Array.from(
    screen
      .queryByRole('group', { name: 'Photo album' })
      ?.querySelectorAll('img') ?? []
  ).map((img) => img.getAttribute('src')?.split('?')[0])
const save = async () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: saveName }))
  })

it('edits store-selected metadata, blocks repeated saves and edits while pending, and renders the server-confirmed area with its gallery intact', async () => {
  const { client, onClose, feature } = setup()
  const neighbors = JSON.parse(
    JSON.stringify(useAppletStore.getState().folayerAreaConfs)
  )
  expect(input('name')).toHaveValue(feature.properties.name)
  expect(input('description')).toHaveValue(feature.properties.description)
  expect(input('municipality')).toHaveValue(feature.properties.municipality)
  expect(input('region')).toHaveValue(feature.properties.region)
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  expect(gallerySources()).toEqual([
    '/storage/render/image/first.jpg',
    '/storage/render/image/second.jpg',
  ])
  fireEvent.change(input('name'), { target: { value: 'Edited draft' } })
  const result = serverFeature()
  const request = pages.controlled(response(result))
  jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
  await save()
  await waitFor(() => expect(axios.patch).toHaveBeenCalledTimes(1))
  expect(client.getMutationCache().getAll()[0].state.variables).toEqual({
    layerId,
    featureId: feature.id,
    properties: {
      name: 'Edited draft',
      description: feature.properties.description,
      municipality: feature.properties.municipality,
      region: feature.properties.region,
    },
  })
  expect(axios.patch).toHaveBeenCalledWith(
    `/api/luonnonmetsakartat/layer/${layerId}/area/${feature.id}`,
    expect.any(FormData),
    expect.any(Object)
  )
  expect(await screen.findByRole('progressbar')).toBeVisible()
  expect(selected()).toEqual(feature)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  await save()
  expect(axios.patch).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: saveName })).toBeDisabled()
  screen
    .getAllByRole('textbox')
    .forEach((field) => expect(field).toBeDisabled())
  await act(async () => request.resolve(response(result)))
  await waitFor(() => expect(client.isMutating()).toBe(0))
  expect(input('name')).toHaveValue('Server confirmed name')
  expect(selected().properties.name).toBe('Server confirmed name')
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'notifications.folayer_area_update_success'
  )
  expect(gallerySources()).toEqual([
    '/storage/render/image/first.jpg',
    '/storage/render/image/second.jpg',
  ])
  expect(
    useAppletStore.getState().folayerAreaConfs[layerId].data.features[1]
  ).toEqual(neighbors[layerId].data.features[1])
  expect(
    useAppletStore.getState().folayerAreaConfs['mock-hidden-layer']
  ).toEqual(neighbors['mock-hidden-layer'])
  fireEvent.click(
    screen.getByRole('button', { name: 'Close admin area modal' })
  )
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('retains the dirty area draft and committed store after failure, then retries through Save', async () => {
  const { client, feature } = setup()
  fireEvent.change(input('description'), {
    target: { value: 'Retained description draft' },
  })
  const request = pages.controlled(response(serverFeature()))
  const error = httpError(503)
  jest.mocked(axios.patch).mockReturnValueOnce(request.promise)
  await save()
  expect(await screen.findByRole('progressbar')).toBeVisible()
  await act(async () => request.reject(error))
  await waitFor(() => expect(client.isMutating()).toBe(0))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'notifications.folayer_area_update_error'
  )
  expect(jest.mocked(console.error).mock.calls).toEqual([
    ['Error updating folayer area:', error],
  ])
  jest.mocked(console.error).mockClear()
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(input('description')).toHaveValue('Retained description draft')
  expect(input('description')).toBeEnabled()
  expect(selected()).toEqual(feature)
  expect(screen.getByRole('button', { name: saveName })).toBeEnabled()
  expect(
    screen.queryByText('notifications.folayer_area_update_success')
  ).not.toBeInTheDocument()
  const result = serverFeature()
  result.properties.description = 'Retained description draft'
  jest.mocked(axios.patch).mockResolvedValueOnce(response(result))
  await save()
  await waitFor(() => expect(client.isMutating()).toBe(0))
  expect(axios.patch).toHaveBeenCalledTimes(2)
  expect(
    (jest.mocked(axios.patch).mock.calls[1][1] as FormData).get('description')
  ).toBe('Retained description draft')
  expect(input('description')).toHaveValue('Retained description draft')
  expect(
    screen.queryByRole('button', { name: saveName })
  ).not.toBeInTheDocument()
  expect(
    await screen.findByText('notifications.folayer_area_update_success')
  ).toBeVisible()
})

it('reflects externally removed saved pictures after real area-query refreshes, without a saved-picture delete editor', async () => {
  let pictures = savedPictures
  pages.http(() =>
    response({
      type: 'FeatureCollection',
      features: [
        {
          ...selected(),
          properties: {
            ...selected().properties,
            pictures: JSON.stringify(pictures),
          },
        },
      ],
    })
  )
  const { client } = setup(true)
  await waitFor(() => expect(client.isFetching()).toBe(0))
  expect(gallerySources()).toEqual([
    '/storage/render/image/first.jpg',
    '/storage/render/image/second.jpg',
  ])
  expect(screen.getByText('sidebar.admin.area.pictures.header')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: /delete|remove/i })
  ).not.toBeInTheDocument()
  pictures = [savedPictures[1]]
  await act(async () => {
    await client.refetchQueries({ queryKey: ['adminFolayerAreas', layerId] })
  })
  expect(gallerySources()).toEqual(['/storage/render/image/second.jpg'])
  pictures = []
  await act(async () => {
    await client.refetchQueries({ queryKey: ['adminFolayerAreas', layerId] })
  })
  expect(gallerySources()).toEqual([])
  expect(
    screen.queryByText('sidebar.admin.area.pictures.header')
  ).not.toBeInTheDocument()
  expect(axios.get).toHaveBeenCalledTimes(3)
  expect(axios.patch).not.toHaveBeenCalled()
})
