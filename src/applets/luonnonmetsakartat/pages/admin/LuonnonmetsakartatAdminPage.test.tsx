import {
  areas,
  deferred,
  flush,
  layer,
  mockRouter,
  response,
  setupPages,
} from '../pageTestSupport'
import React from 'react'
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import LuonnonmetsakartatAdminGate from './LuonnonmetsakartatAdminGate'
import LuonnonmetsakartatAdminPage from './LuonnonmetsakartatAdminPage'
import { useMapStore } from '#/common/store/mapStore'
import { getFolayerGroupId } from '../../common/utils'

const pages = setupPages()
const page = (
  <LuonnonmetsakartatAdminGate>
    <LuonnonmetsakartatAdminPage />
  </LuonnonmetsakartatAdminGate>
)
it.each([
  { records: [] },
  {
    records: [
      layer(),
      layer({ id: 'hidden-id', name: 'Hidden forest', hidden: true }),
    ],
  },
])(
  'loads verified admin records $records with separate toggle and navigation controls',
  async ({ records }) => {
    const pending = deferred<ReturnType<typeof response>>()
    pages.http((url, config) => {
      expect(config?.headers?.Authorization).toBe('Bearer synthetic-a')
      if (url.endsWith('/validate')) return response({ is_editor: true })
      if (url.endsWith('/layers')) return pending.promise
      if (url.includes('/ows?')) return response(areas())
      throw new Error(`Unhandled ${url}`)
    })
    pages.render(page)
    const upload = await screen.findByRole('link', {
      name: 'sidebar.admin.upload',
    })
    expect(upload).toHaveAttribute(
      'href',
      '/fi/luonnonmetsakartat/admin/import'
    )
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()
    await act(async () => pending.resolve(response(records)))
    await waitFor(() =>
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    )
    if (!records.length) {
      expect(
        screen.queryByRole('link', { name: /^Open / })
      ).not.toBeInTheDocument()
      fireEvent.click(upload)
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/fi/luonnonmetsakartat/admin/import'
      )
      return
    }
    const id = getFolayerGroupId('hidden-id', true)
    const toggle = screen.getByRole('button', { name: 'Toggle Hidden forest' })
    expect(
      screen.getByRole('button', { name: 'Toggle Public forest' })
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(useMapStore.getState()._layerGroups[id]).toBeDefined()
    )
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(useMapStore.getState()._layerGroups[id].isHidden).toBe(false)
    )
    expect(mockRouter.push).not.toHaveBeenCalled()
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(useMapStore.getState()._layerGroups[id].isHidden).toBe(true)
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Open Hidden forest' }))
    })
    await flush()
    expect(mockRouter.push).toHaveBeenCalledWith(
      '/fi/luonnonmetsakartat/admin/layer/hidden-id'
    )
    expect(useMapStore.getState()._layerGroups[id].isHidden).toBe(true)
  }
)
