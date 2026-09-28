import { ComponentType, PropsWithChildren } from 'react'
import { afterEach, beforeEach, expect, jest } from '@jest/globals'
import { cleanup } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  QueryClientProviderProps,
} from '@tanstack/react-query'
import axios, { AxiosError, AxiosHeaders, AxiosResponse } from 'axios'

import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import {
  AdminFolayerConf,
  AdminVerificationStatus,
  FolayerAreaConf,
  FolayerConfState,
  FolayerFeature,
} from '../types'

export const mockUseAuthSession = jest.fn()
export const mockNotify = jest.fn()
export const mockTranslate = jest.fn((key: string) => key)

jest.mock('#/common/auth', () => ({
  useAuthSession: () => mockUseAuthSession(),
}))
jest.mock('#/common/store', () => ({
  useUIStore: (selector: (state: { notify: typeof mockNotify }) => unknown) =>
    selector({ notify: mockNotify }),
}))
jest.mock('@tolgee/react', () => ({
  useTranslate: () => ({ t: mockTranslate }),
}))

export const resetAppletStore = () => {
  useAppletStore.setState({
    folayerConfs: {},
    adminFolayerConfs: {},
    folayerAreaConfs: {},
    adminVerificationStatus: AdminVerificationStatus.NoUser,
  })
}

export const adminConf = (
  overrides: Partial<AdminFolayerConf> = {}
): AdminFolayerConf => ({
  id: 'layer-a',
  name: 'Local forest',
  colorCode: '#112233',
  createdTs: 100,
  updatedTs: 200,
  isVisible: true,
  state: FolayerConfState.Idle,
  unsyncedChanges: false,
  ...overrides,
})

export const feature = (id = 'area-a'): FolayerFeature => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates: [24, 60] },
  // The existing feature type intersects numeric and string timestamp fields.
  // Keep realistic API strings at this fixture boundary without changing it here.
  properties: {
    id,
    name: 'Old area',
    created_ts: '100',
    updated_ts: '200',
    area_ha: 2.5,
    date: '2026-09-01',
    municipality: 'Espoo',
  } as unknown as FolayerFeature['properties'],
})

export const areaConf = (id = 'layer-a'): FolayerAreaConf => ({
  id,
  state: FolayerConfState.Idle,
  data: { type: 'FeatureCollection', features: [feature(), feature('area-b')] },
})

// Hand-authored server data intentionally differs from local edits.
export const serverLayer = () => ({
  id: 'layer-a',
  name: 'Server forest',
  description: 'Server description',
  color_code: '#abcdef',
  is_hidden: true,
  created_ts: 123,
  updated_ts: 456,
  col_options: {
    indexingStrategy: 'id' as const,
    idCol: 'server_id',
    nameCol: 'server_name',
    municipalityCol: 'server_municipality',
  },
})

export const httpResponse = <T,>(data: T, status = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: String(status),
  headers: {},
  config: { headers: new AxiosHeaders() },
})

export const httpError = (status?: number) =>
  new AxiosError(
    status ? `HTTP ${status}` : 'Network Error',
    status ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
    undefined,
    undefined,
    status ? httpResponse({ detail: 'Request rejected' }, status) : undefined
  )

export const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export const readBytes = (blob: Blob): Promise<number[]> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () =>
      resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)))
    reader.readAsArrayBuffer(blob)
  })

// Local test setup only: retain real AxiosError detection, auth header helper,
// QueryClient and Zustand actions. Unexpected requests fail even if caught.
export const setupClientTests = () => {
  const clients: QueryClient[] = []
  const unexpected: string[] = []
  beforeEach(() => {
    resetAppletStore()
    mockUseAuthSession.mockReturnValue({
      data: { user: { id: 'editor-a' }, accessToken: 'opaque-token' },
    })
    mockNotify.mockClear()
    mockTranslate.mockClear()
    for (const method of [
      'get',
      'post',
      'patch',
      'delete',
      'put',
      'request',
    ] as const) {
      jest.spyOn(axios, method).mockImplementation(() => {
        unexpected.push(method)
        throw new Error(`Unexpected axios.${method}`)
      })
    }
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    cleanup()
    clients.splice(0).forEach((client) => client.clear())
    resetAppletStore()
    jest.restoreAllMocks()
    expect(unexpected.splice(0)).toEqual([])
  })
  return () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    })
    clients.push(client)
    // Same React type compatibility adapter as runtime/ShellComponents/ShellProvider.
    const StableQueryClientProvider =
      QueryClientProvider as ComponentType<QueryClientProviderProps>
    const wrapper = ({ children }: PropsWithChildren) => (
      <StableQueryClientProvider client={client}>
        {children}
      </StableQueryClientProvider>
    )
    return { client, wrapper }
  }
}
