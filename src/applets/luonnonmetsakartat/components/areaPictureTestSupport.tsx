import {
  deferred,
  setupPages,
} from 'applets/luonnonmetsakartat/pages/pageTestSupport'
import { act, waitFor } from '@testing-library/react'
import type { QueryClient } from '@tanstack/react-query'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import {
  createLuonnonmetsakartatMockAdminFolayerConfs,
  createLuonnonmetsakartatMockFolayerAreaConfs,
} from 'applets/luonnonmetsakartat/common/mockScenarios/seedData'

// Extend the existing page harness only with owned mutation settlement and the
// browser measurement API needed by the real modal/gallery/combobox renderers.
export const setupAreaPictures = () => {
  let client: QueryClient | undefined
  const pending: Array<() => void> = []
  let originalMap: ReturnType<typeof useMapInstanceStore.getState>
  let originalObserver: typeof ResizeObserver
  afterEach(async () => {
    await act(async () => pending.splice(0).forEach((finish) => finish()))
    await waitFor(() => expect(client?.isMutating() ?? 0).toBe(0))
    client = undefined
  })
  const pages = setupPages()
  beforeEach(() => {
    originalMap = useMapInstanceStore.getState()
    useMapInstanceStore.setState({ _map: null })
    originalObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    // jsdom has no layout; preserve the actual gallery and virtualized rows.
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360)
  })
  afterEach(() => {
    useMapInstanceStore.setState(originalMap, true)
    globalThis.ResizeObserver = originalObserver
  })
  return {
    ...pages,
    render: (...args: Parameters<typeof pages.render>) => {
      const view = pages.render(...args)
      client = view.client
      return view
    },
    controlled: <T,>(fallback: T) => {
      const request = deferred<T>()
      pending.push(() => request.resolve(fallback))
      return request
    },
  }
}

export const seedAreaPictures = () => {
  const layers = createLuonnonmetsakartatMockAdminFolayerConfs()
  const collections = createLuonnonmetsakartatMockFolayerAreaConfs()
  useAppletStore.setState({
    adminFolayerConfs: Object.fromEntries(
      layers.map((layer) => [layer.id, layer])
    ),
    folayerAreaConfs: Object.fromEntries(
      collections.map((area) => [area.id, area])
    ),
  })
}
