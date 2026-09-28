import React, { createRef } from 'react'
import {
  renderUi,
  screen,
  act,
  waitForColumns,
  nameImport,
  acceptImport,
  respondToWarning,
  adminLayer,
} from './shapefileUiTestSupport'
import FolayerImportShp from './FolayerImportShp'
import FolayerUpdateShp, { type FolayerUpdateShpRef } from './FolayerUpdateShp'
import * as parsing from 'applets/luonnonmetsakartat/common/folayerShapefile'
import { collection } from 'applets/luonnonmetsakartat/common/shapefileTestData'
import type { FeatureCollection } from 'geojson'

const deferred = () => {
  let resolve!: (value: FeatureCollection) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<FeatureCollection>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const valid = collection([{ id: 'a', nimi: 'A', kunta: 'B' }])
afterEach(() => jest.restoreAllMocks())

describe.each(['import', 'replacement'] as const)('%s parse races', (mode) => {
  it.each(['success', 'failure'] as const)(
    'ignores a late old %s and never hands off while the new parse is pending',
    async (outcome) => {
      const old = deferred()
      const next = deferred()
      jest
        .spyOn(parsing, 'parseFolayerShapefile')
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(next.promise)
      const ref = createRef<FolayerUpdateShpRef>()
      const finish = jest.fn()
      const make = (buffer: ArrayBuffer) =>
        mode === 'import' ? (
          <FolayerImportShp
            fileBuffers={[buffer]}
            onFinish={finish}
            isInitializing={false}
          />
        ) : (
          <FolayerUpdateShp
            ref={ref}
            fileBuffers={[buffer]}
            adminFolayerConf={adminLayer}
          />
        )
      const view = renderUi(make(new ArrayBuffer(1)))
      const latest = new ArrayBuffer(2)
      view.rerender(make(latest))
      if (mode === 'import')
        expect(
          screen.getByRole('button', { name: 'Accept imported forest layer' })
        ).toBeDisabled()
      else {
        act(() => ref.current!.getValues(finish))
        expect(finish).toHaveBeenLastCalledWith(null)
        finish.mockClear()
      }
      await act(async () => {
        next.resolve(valid)
      })
      await waitForColumns()
      await act(async () => {
        if (outcome === 'success') old.resolve(collection([{ other: 'old' }]))
        else old.reject(new Error('obsolete failure'))
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      if (mode === 'import') {
        nameImport()
        acceptImport()
      } else act(() => ref.current!.getValues(finish))
      expect(finish).toHaveBeenCalledTimes(1)
      if (mode === 'replacement')
        expect(finish.mock.calls[0][0].rawShapefile).toBe(latest)
    }
  )
  it('clears a prior successful parse immediately on new input and ignores confirmation from it', async () => {
    const next = deferred()
    jest
      .spyOn(parsing, 'parseFolayerShapefile')
      .mockResolvedValueOnce(
        collection([{ id: 'a', nimi: 'bad_', kunta: 'B' }])
      )
      .mockReturnValueOnce(next.promise)
    const ref = createRef<FolayerUpdateShpRef>()
    const finish = jest.fn()
    const make = (buffer: ArrayBuffer) =>
      mode === 'import' ? (
        <FolayerImportShp
          fileBuffers={[buffer]}
          onFinish={finish}
          isInitializing={false}
        />
      ) : (
        <FolayerUpdateShp
          ref={ref}
          fileBuffers={[buffer]}
          adminFolayerConf={adminLayer}
        />
      )
    const view = renderUi(make(new ArrayBuffer(1)))
    await waitForColumns()
    if (mode === 'import') {
      nameImport()
      acceptImport()
    } else act(() => ref.current!.getValues(finish))
    await screen.findByRole('dialog')
    view.rerender(make(new ArrayBuffer(2)))
    await respondToWarning('confirm')
    if (mode === 'import') {
      expect(finish).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Accept imported forest layer' })
      ).toBeDisabled()
    } else expect(finish).toHaveBeenCalledWith(null)
    await act(async () => next.reject(new Error('new failure')))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'error_invalid_shapefile'
    )
  })
  it('ignores parser completion after unmount', async () => {
    const pending = deferred()
    jest
      .spyOn(parsing, 'parseFolayerShapefile')
      .mockReturnValueOnce(pending.promise)
    const finish = jest.fn()
    const view = renderUi(
      mode === 'import' ? (
        <FolayerImportShp
          fileBuffers={[new ArrayBuffer(1)]}
          onFinish={finish}
          isInitializing={false}
        />
      ) : (
        <FolayerUpdateShp
          fileBuffers={[new ArrayBuffer(1)]}
          adminFolayerConf={adminLayer}
          onValidationChange={finish}
        />
      )
    )
    view.unmount()
    finish.mockClear()
    await act(async () => pending.resolve(valid))
    expect(finish).not.toHaveBeenCalled()
  })
})
