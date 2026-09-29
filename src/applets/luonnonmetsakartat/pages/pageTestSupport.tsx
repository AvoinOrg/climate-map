import React, { type ComponentType, type ReactNode } from 'react'
import '@testing-library/jest-dom'
import { act, cleanup, render } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientProviderProps,
} from '@tanstack/react-query'
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { create } from 'zustand'
import { AuthSessionContext } from '#/common/auth/sessionContext'
import type { AuthSessionResult } from '#/common/auth/types'
import { AppThemeProvider } from '#/common/style/theme'
import { useUIStore } from '#/common/store/uiStore'
import { useMapStore } from '#/common/store/mapStore'
import { useAppletStore } from '../state/appletStore'
import { LayerOrderLevel, type LayerGroupOptions } from '#/common/types/map'
import { APP_ROUTE_KEYS } from '#/common/routing/routeMetadata'
import type { AppRouteHrefOptions } from '#/common/navigation/appRouteLinks'

jest.unmock('zustand')
jest.mock('#/common/utils/store', () => ({
  ...jest.requireActual('#/common/utils/store'),
  createIndexedDbStorage: () => () => ({
    getItem: async () => null,
    setItem: async () => undefined,
    removeItem: async () => undefined,
  }),
}))
jest.mock('maplibre-gl', () => ({ __esModule: true, default: {} }))
jest.mock('maplibre_symbol_utils', () => ({ canvasFill: jest.fn() }))
jest.mock('@tolgee/react', () => {
  const t = (key: string) => key
  return { useTranslate: () => ({ t }) }
})
jest.mock('#/components/common/TText', () => ({
  __esModule: true,
  default: ({ keyName }: { keyName: string }) => keyName,
}))
// Only sidebar chrome is replaced; real loading blocks and all page controls remain.
jest.mock('#/components/Sidebar/SidebarContentBox', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
jest.mock(
  'applets/luonnonmetsakartat/components/LuonnonmetsakartatLandingSidebar',
  () => ({
    __esModule: true,
    default: ({ children }: { children: ReactNode }) => (
      <aside>{children}</aside>
    ),
  })
)
jest.mock('#/common/store', () => ({
  useUIStore: jest.requireActual('#/common/store/uiStore').useUIStore,
  get useMapStore() {
    return jest.requireActual('#/common/store/mapStore').useMapStore
  },
}))
// The popup/gallery are separate editing surfaces; preserve their ownership in map config.
jest.mock('applets/luonnonmetsakartat/components/AreaModal', () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock('applets/luonnonmetsakartat/components/AreaModalAdmin', () => ({
  __esModule: true,
  default: () => (
    <>
      <span id="map-popup-modal-title">Area editor</span>
      <span id="map-popup-modal-description">Selected area</span>
      <button>Editor popup</button>
    </>
  ),
}))
jest.mock('#/common/navigation/navigation', () => ({
  DEFAULT_ROUTE_LOCALE: 'fi',
  useAppPathname: () => mockNavigation((state) => state.pathname),
  useAppParams: () => mockNavigation((state) => state.params),
  useAppSearchParams: () => mockSearch,
  useAppRouter: () => mockRouter,
}))
jest.mock('#/common/navigation/appRouteLinks', () => {
  const actual = jest.requireActual('#/common/navigation/appRouteLinks')
  return {
    ...actual,
    useAppRouteHrefBuilder: () => mockBuildHref,
    AppRouteLink: ({
      routeKey,
      routeParams,
      children,
      sx: _sx,
      ...props
    }: React.PropsWithChildren<AppRouteHrefOptions> & { sx?: unknown }) => {
      const href = mockBuildHref({ routeKey, routeParams })
      return (
        <a
          {...props}
          href={href}
          onClick={(event) => {
            event.preventDefault()
            mockRouter.push(href)
          }}
        >
          {children}
        </a>
      )
    },
  }
})

const mockSearch = new URLSearchParams()
export const adminPath = '/fi/luonnonmetsakartat/admin'
export const mockNavigation = create(() => ({
  pathname: adminPath,
  params: { folayerIdSlug: 'layer-a' },
}))
const navigate = (pathname: string) =>
  mockNavigation.setState({
    pathname,
    params: {
      folayerIdSlug: pathname.split('/layer/')[1]?.split('/')[0] ?? 'layer-a',
    },
  })
export const mockRouter = {
  replace: jest.fn(navigate),
  push: jest.fn(navigate),
}
const tails = {
  [APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN]: '/admin',
  [APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_IMPORT]: '/admin/import',
  [APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER]:
    '/admin/layer/$folayerIdSlug',
  [APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER_SETTINGS]:
    '/admin/layer/$folayerIdSlug/settings',
  [APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER_PICTURES]:
    '/admin/layer/$folayerIdSlug/pictures',
}
const mockBuildHref = (options: AppRouteHrefOptions) => {
  const { resolveAppRouteHref } = jest.requireActual(
    '#/common/navigation/appRouteLinks'
  )
  return resolveAppRouteHref({
    ...options,
    routeParams: { locale: 'fi', ...options.routeParams },
    entries: Object.entries(tails).map(([key, tail]) => ({
      routeId: key,
      fullPath: `/$locale/luonnonmetsakartat${tail}`,
      to: `/$locale/luonnonmetsakartat${tail}`,
      metadata: {
        key,
        appletNamespace: 'luonnonmetsakartat',
        variant: 'canonical',
      },
    })),
    router: {
      buildLocation: ({
        to,
        params,
      }: {
        to: string
        params: Record<string, string>
      }) => ({
        href: Object.entries(params).reduce(
          (href, [key, value]) =>
            href.replace(`$${key}`, encodeURIComponent(value)),
          to
        ),
      }),
    },
  })
}
const refetch = async () => undefined
export const auth = ({
  userId = 'editor-a',
  sessionId = 'session-a',
  token = 'synthetic-a',
} = {}): AuthSessionResult => ({
  data: {
    user: { id: userId, name: null, email: null, image: null },
    session: { id: sessionId, userId, expiresAt: null },
    accessToken: token,
  },
  status: 'authenticated',
  error: null,
  isLoading: false,
  isRefetching: false,
  isAccessTokenLoading: false,
  refetch,
})
export const loggedOut: AuthSessionResult = {
  ...auth(),
  data: null,
  status: 'unauthenticated',
}
export const loading: AuthSessionResult = {
  ...loggedOut,
  status: 'loading',
  isLoading: true,
}
export const response = <T,>(data: T, status = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: String(status),
  headers: {},
  config: { headers: new AxiosHeaders() },
})
export const httpError = (status: number) =>
  new AxiosError(
    `HTTP ${status}`,
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    response({}, status)
  )
export const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
export const layer = ({
  id = 'layer-a',
  name = 'Public forest',
  hidden = false,
} = {}) => ({
  id,
  name,
  is_hidden: hidden,
  color_code: '#123456',
  created_ts: 1,
  updated_ts: 2,
})
export const areas = (name = 'Public area') => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'area-a',
      geometry: { type: 'Point', coordinates: [24, 60] },
      properties: { id: 'area-a', name, municipality: 'Espoo' },
    },
  ],
})

export const setupPages = () => {
  const clients: QueryClient[] = []
  const unexpected: string[] = []
  let dispatch: (
    url: string,
    config?: AxiosRequestConfig
  ) => Promise<AxiosResponse> | AxiosResponse
  let originalFetch: typeof fetch
  let errorSpy: jest.SpyInstance
  let title: string
  const env = { ...process.env }
  beforeEach(() => {
    title = document.title
    process.env.PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED = '0'
    process.env.PUBLIC_GEOSERVER_URL = 'https://wfs.test/geoserver'
    process.env.PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE = 'forest'
    useAppletStore.setState(useAppletStore.getInitialState(), true)
    useUIStore.setState(useUIStore.getInitialState(), true)
    useMapStore.setState(useMapStore.getInitialState(), true)
    mockNavigation.setState({
      pathname: adminPath,
      params: { folayerIdSlug: 'layer-a' },
    })
    mockRouter.push.mockClear()
    mockRouter.replace.mockClear()
    dispatch = (url) => {
      unexpected.push(url)
      throw new Error(`Unexpected HTTP: ${url}`)
    }
    for (const method of [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'request',
    ] as const) {
      jest.spyOn(axios, method).mockImplementation((...args: unknown[]) => {
        const [url, config] = args
        if (method !== 'get') {
          unexpected.push(method)
          throw new Error(`Unexpected ${method}`)
        }
        return Promise.resolve()
          .then(() => dispatch(String(url), config as AxiosRequestConfig))
          .catch((error) => {
            if (!axios.isAxiosError(error)) unexpected.push(String(error))
            throw error
          })
      })
    }
    originalFetch = globalThis.fetch
    globalThis.fetch = jest.fn(() => {
      unexpected.push('fetch')
      return Promise.reject(new Error('Unexpected fetch'))
    })
    errorSpy = jest.spyOn(console, 'error')
    // Keep real map state/subscriptions and useLayerGroup; replace only WebGL operations.
    useMapStore.setState({
      addLayerGroup: jest.fn(async (id, options) => {
        const inputStyle = options?.layerConf?.style
        const style =
          typeof inputStyle === 'function' ? await inputStyle() : inputStyle
        useMapStore.setState((state) => ({
          _layerGroups: {
            ...state._layerGroups,
            [id]: {
              id,
              isHidden: !!options?.isHidden,
              orderLevel: LayerOrderLevel.LAYER,
              layers: Object.fromEntries(
                (style?.layers ?? []).map((item) => [item.id, item])
              ) as unknown as LayerGroupOptions['layers'],
              sources: (style?.sources ?? {}) as LayerGroupOptions['sources'],
              ...options,
            },
          },
        }))
      }),
      enableLayerGroup: jest.fn(async (id) => {
        useMapStore.setState((state) => ({
          _layerGroups: {
            ...state._layerGroups,
            [id]: { ...state._layerGroups[id], isHidden: false },
          },
        }))
      }),
      disableLayerGroup: jest.fn(async (id) => {
        useMapStore.setState((state) => ({
          _layerGroups: {
            ...state._layerGroups,
            [id]: { ...state._layerGroups[id], isHidden: true },
          },
        }))
      }),
      removeLayerGroup: jest.fn(async (id) => {
        useMapStore.setState((state) => {
          const groups = { ...state._layerGroups }
          delete groups[id]
          return { _layerGroups: groups }
        })
      }),
      flyTo: jest.fn(),
    })
  })
  afterEach(async () => {
    cleanup()
    await Promise.all(clients.map((client) => client.cancelQueries()))
    clients.splice(0).forEach((client) => client.clear())
    Object.values(useMapStore.getState()._dataSyncSubscriptions).forEach(
      (sources) =>
        Object.values(sources).forEach((unsubscribe) => unsubscribe())
    )
    const errors = errorSpy.mock.calls.slice()
    jest.restoreAllMocks()
    globalThis.fetch = originalFetch
    process.env = { ...env }
    useAppletStore.setState(useAppletStore.getInitialState(), true)
    useUIStore.setState(useUIStore.getInitialState(), true)
    useMapStore.setState(useMapStore.getInitialState(), true)
    document.title = title
    localStorage.clear()
    sessionStorage.clear()
    jest.useRealTimers()
    expect(unexpected.splice(0)).toEqual([])
    expect(errors).toEqual([])
  })
  return {
    http: (handler: typeof dispatch) => {
      dispatch = handler
    },
    render: (
      children: ReactNode,
      {
        initialAuth = auth(),
        client,
      }: { initialAuth?: AuthSessionResult; client?: QueryClient } = {}
    ) => {
      const queryClient =
        client ??
        new QueryClient({
          defaultOptions: {
            queries: { gcTime: Infinity },
            mutations: { gcTime: Infinity },
          },
        })
      if (!clients.includes(queryClient)) clients.push(queryClient)
      const Provider =
        QueryClientProvider as ComponentType<QueryClientProviderProps>
      const tree = (session: AuthSessionResult, content = children) => (
        <Provider client={queryClient}>
          <AuthSessionContext.Provider value={session}>
            <AppThemeProvider>{content}</AppThemeProvider>
          </AuthSessionContext.Provider>
        </Provider>
      )
      const view = render(tree(initialAuth))
      return {
        ...view,
        client: queryClient,
        session: (session: AuthSessionResult, content?: ReactNode) =>
          view.rerender(tree(session, content)),
      }
    },
  }
}
export const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
