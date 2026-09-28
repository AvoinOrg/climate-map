import JSZip from 'jszip'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { Blob as NodeBlob, File as NodeFile } from 'buffer'
import { ReadableStream } from 'stream/web'
import { TextDecoder, TextEncoder } from 'util'
import { MessageChannel, MessagePort } from 'worker_threads'
import type * as UndiciModule from 'undici'

import { MOCK_AUTH_USER_ID } from '#/common/auth/mock'
import { featureCols } from 'applets/carbon/common/types'
import { processCalcQueryToReportData } from 'applets/carbon/common/utils'
import { MOCK_SERVER_PLAN_ID } from 'applets/carbon/common/mockScenarios/ids'
import { handleHiilikarttaDataProxyRequest } from './dataProxy'
import { resetHiilikarttaMockApiForTests } from './mockDataProxy'

// The mock dispatcher can return undefined for an unhandled path. All cases
// here require a real HTTP response, including the live transport regressions.
const requestProxyResponse = async (
  options: Parameters<typeof handleHiilikarttaDataProxyRequest>[0]
) => {
  const response = await handleHiilikarttaDataProxyRequest(options)
  if (!response) throw new Error('Expected a Carbon proxy response')
  return response
}

const mockEnv = {
  HIILIKARTTA_MOCK_API_ENABLED: '1',
  NODE_ENV: 'test',
}

const requiredFeatureYears = ['2024', '2030', '2040', '2050']

const createUploadedPlanData = (id = 'uploaded-area-1') => ({
  type: 'FeatureCollection',
  features: [
    {
      id,
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [24.95, 60.18],
            [24.954, 60.18],
            [24.954, 60.183],
            [24.95, 60.183],
            [24.95, 60.18],
          ],
        ],
      },
      properties: {
        id,
        name: 'Uploaded mock area',
        area_ha: 1.5,
        zoning_code: 'AK',
        landuse_built: 50,
        landuse_new_open_vegetation: 20,
        landuse_new_tree_vegetation: 10,
        landuse_existing: 20,
        soil_change_new_vegetation_pct: 15,
      },
    },
  ],
})

const createZippedPlanRequest = async ({
  data = createUploadedPlanData(),
  method,
  url,
}: {
  data?: ReturnType<typeof createUploadedPlanData>
  method: 'POST' | 'PUT'
  url: string
}) => {
  const zip = new JSZip()
  zip.file('file', JSON.stringify(data))
  const zipBuffer = await zip.generateAsync({ type: 'uint8array' })
  const formData = new FormData()
  formData.append(
    'file',
    new File([new Uint8Array(zipBuffer)], 'file.zip', {
      type: 'application/zip',
    })
  )

  const request = new Request(url, {
    body: formData,
    method,
  })

  return request
}

const readJson = async <T = Record<string, any>>(response: Response) =>
  (await response.json()) as T

const expectRawCalculationDataToProcess = (data: any) => {
  const reportData = processCalcQueryToReportData(data)

  expect(reportData.metadata.featureYears).toEqual(
    expect.arrayContaining(requiredFeatureYears)
  )
  expect(reportData.metadata.timestamp).toEqual(expect.any(Number))
  expect(reportData.totals.features[0]).toBeDefined()

  for (const featureCol of featureCols) {
    for (const year of requiredFeatureYears) {
      expect(
        data.totals.features[0].properties[`${featureCol}_nochange_${year}`]
      ).toEqual(expect.any(Number))
      expect(
        data.totals.features[0].properties[`${featureCol}_planned_${year}`]
      ).toEqual(expect.any(Number))
    }
  }

  return reportData
}

describe('handleHiilikarttaDataProxyRequest', () => {
  const originalGlobals = new Map(
    [
      'ReadableStream',
      'TextDecoder',
      'TextEncoder',
      'MessageChannel',
      'MessagePort',
      'Blob',
      'File',
      'Headers',
      'Request',
      'Response',
      'FormData',
    ].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)])
  )

  afterAll(() => {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else Reflect.deleteProperty(globalThis, name)
    }
  })

  beforeAll(() => {
    globalThis.ReadableStream =
      ReadableStream as unknown as typeof globalThis.ReadableStream
    globalThis.TextDecoder =
      TextDecoder as unknown as typeof globalThis.TextDecoder
    globalThis.TextEncoder =
      TextEncoder as unknown as typeof globalThis.TextEncoder
    globalThis.MessageChannel =
      MessageChannel as unknown as typeof globalThis.MessageChannel
    globalThis.MessagePort =
      MessagePort as unknown as typeof globalThis.MessagePort
    globalThis.Blob = NodeBlob as unknown as typeof Blob
    globalThis.File = NodeFile as unknown as typeof File

    const undici = jest.requireActual<typeof UndiciModule>('undici')

    globalThis.Headers = undici.Headers as unknown as typeof Headers
    globalThis.Request = undici.Request as unknown as typeof Request
    globalThis.Response = undici.Response as unknown as typeof Response
    globalThis.FormData = undici.FormData as unknown as typeof FormData
  })

  beforeEach(() => {
    resetHiilikarttaMockApiForTests()
  })

  it('returns 500 without calling upstream when HIILIKARTTA_API_URL is missing', async () => {
    const fetchFn = jest.fn<typeof fetch>()

    const response = await requestProxyResponse({
      request: new Request('https://map.example.org/api/hiilikartta/plan'),
      deps: {
        env: {},
        fetchFn,
      },
    })

    expect(response.status).toBe(500)
    expect(await response.text()).toBe('HIILIKARTTA_API_URL is not configured')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('proxies GET requests to the matching upstream path and query', async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ id: 'calc-1' }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        })
    )

    const response = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/calculation?id=calc-1&visible_id=local-1'
      ),
      deps: {
        env: { HIILIKARTTA_API_URL: 'https://carbon.example.org/api/' },
        fetchFn,
      },
    })
    const upstream = new URL(String(fetchFn.mock.calls[0]?.[0]))

    expect(upstream.toString()).toBe(
      'https://carbon.example.org/api/calculation?id=calc-1&visible_id=local-1'
    )
    expect(fetchFn.mock.calls[0]?.[1]?.method).toBe('GET')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(await response.text()).toBe('{"id":"calc-1"}')
  })

  it('proxies request bodies and allowlisted headers', async () => {
    const fetchFn = jest.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ status: 'queued' }), { status: 201 })
    )

    const response = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=calc-1',
        {
          body: 'zip-data',
          headers: {
            Authorization: 'Bearer token-1',
            'Content-Type': 'application/zip',
            Cookie: 'do-not-forward=true',
            'X-User-Agent': 'browser-agent',
          },
          method: 'PUT',
        }
      ),
      deps: {
        env: { HIILIKARTTA_API_URL: 'https://carbon.example.org/api' },
        fetchFn,
      },
    })
    const init = fetchFn.mock.calls[0]?.[1]
    const headers = init?.headers as Headers

    expect(new URL(String(fetchFn.mock.calls[0]?.[0])).toString()).toBe(
      'https://carbon.example.org/api/plan?id=calc-1'
    )
    expect(init?.method).toBe('PUT')
    expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe('zip-data')
    expect(headers.get('authorization')).toBe('Bearer token-1')
    expect(headers.get('content-type')).toBe('application/zip')
    expect(headers.get('x-user-agent')).toBe('browser-agent')
    expect(headers.has('cookie')).toBe(false)
    expect(response.status).toBe(201)
  })

  it('maps upstream fetch failures to the no-response contract', async () => {
    const logger = { error: jest.fn() }
    const fetchFn = jest.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed')
    })

    const response = await requestProxyResponse({
      request: new Request('https://map.example.org/api/hiilikartta/plan'),
      deps: {
        env: { HIILIKARTTA_API_URL: 'https://carbon.example.org/api' },
        fetchFn,
        logger,
      },
    })

    expect(response.status).toBe(500)
    expect(await response.text()).toBe('No response from server')
    expect(logger.error).toHaveBeenCalled()
  })

  it.each([TypeError, Error])(
    'does not expose exception or request secrets for %p',
    async (ErrorType) => {
      const secret = 'synthetic-carbon-private-marker'
      const error = Object.assign(new ErrorType(secret), {
        name: secret,
        stack: secret,
        cause: new Error(secret),
        token: secret,
      })
      const logger = { error: jest.fn() }
      const fetchFn = jest.fn<typeof fetch>().mockRejectedValue(error)
      const response = await requestProxyResponse({
        request: new Request(
          `https://map.example.org/api/hiilikartta/plan?token=${secret}`,
          {
            method: 'POST',
            body: secret,
            headers: { authorization: `Bearer ${secret}` },
          }
        ),
        deps: {
          env: { HIILIKARTTA_API_URL: `https://carbon.example.org/${secret}` },
          fetchFn,
          logger,
        },
      })
      expect(response.status).toBe(500)
      expect(await response.text()).toBe(
        ErrorType === TypeError
          ? 'No response from server'
          : 'Request setup error'
      )
      expect(response.statusText).toBe('')
      expect(Object.fromEntries(response.headers.entries())).toEqual({
        'content-type': 'text/plain;charset=UTF-8',
      })
      expect(logger.error.mock.calls).toEqual([
        ['HIILIKARTTA_API_URL proxy request failed'],
      ])
    }
  )

  it('refuses mock API mode in production before proxying', async () => {
    const fetchFn = jest.fn<typeof fetch>()

    await expect(
      requestProxyResponse({
        request: new Request('https://map.example.org/api/hiilikartta/plan'),
        deps: {
          env: {
            HIILIKARTTA_MOCK_API_ENABLED: 'yes',
            HIILIKARTTA_API_URL: 'https://carbon.example.org/api',
            NODE_ENV: 'production',
          },
          fetchFn,
        },
      })
    ).rejects.toThrow(
      'Hiilikartta mock API cannot be enabled when NODE_ENV=production. Unset HIILIKARTTA_MOCK_API_ENABLED.'
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('returns deterministic saved plan stats in mock mode without upstream config', async () => {
    const fetchFn = jest.fn<typeof fetch>()

    const response = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/user/plans'
      ),
      deps: {
        env: mockEnv,
        fetchFn,
      },
    })
    const data = await readJson<{ stats: Record<string, any>[] }>(response)

    expect(response.status).toBe(200)
    expect(data.stats).toEqual([
      expect.objectContaining({
        id: 'mock-plan-seeded',
        visible_id: MOCK_SERVER_PLAN_ID,
        name: 'Mock seeded carbon plan',
        user_id: MOCK_AUTH_USER_ID,
        saved_ts: 1_735_776_000,
      }),
    ])
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('fetches seeded mock plans and returns deterministic errors for missing ids', async () => {
    const seededResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=mock-plan-seeded'
      ),
      deps: {
        env: mockEnv,
      },
    })
    const seededPlan = await readJson<Record<string, any>>(seededResponse)

    expect(seededResponse.status).toBe(200)
    expect(seededPlan).toEqual(
      expect.objectContaining({
        id: 'mock-plan-seeded',
        visible_id: MOCK_SERVER_PLAN_ID,
        user_id: MOCK_AUTH_USER_ID,
        forestry_scenario: 2,
        calculation_status: 'FINISHED',
      })
    )
    expect(seededPlan.data.type).toBe('FeatureCollection')
    expectRawCalculationDataToProcess(seededPlan.report_data)

    const missingIdResponse = await requestProxyResponse({
      request: new Request('https://map.example.org/api/hiilikartta/plan'),
      deps: {
        env: mockEnv,
      },
    })
    const unknownIdResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=unknown-plan'
      ),
      deps: {
        env: mockEnv,
      },
    })

    expect(missingIdResponse.status).toBe(400)
    expect(await readJson(missingIdResponse)).toEqual({
      error: 'Missing required plan id',
    })
    expect(unknownIdResponse.status).toBe(404)
    expect(await readJson(unknownIdResponse)).toEqual({
      error: 'Mock plan not found',
    })
  })

  it('upserts uploaded zipped GeoJSON for plan saves and clears stale reports when data changes', async () => {
    const response = await requestProxyResponse({
      request: await createZippedPlanRequest({
        method: 'PUT',
        url: 'https://map.example.org/api/hiilikartta/plan?id=mock-plan-seeded&name=Updated%20mock%20plan&visible_id=updated-visible&forestry_scenario=3',
      }),
      deps: {
        env: mockEnv,
      },
    })
    const savedPlan = await readJson<Record<string, any>>(response)

    expect(response.status).toBe(200)
    expect(savedPlan).toEqual(
      expect.objectContaining({
        status: 'saved',
        id: 'mock-plan-seeded',
        visible_id: 'updated-visible',
        name: 'Updated mock plan',
        user_id: MOCK_AUTH_USER_ID,
        created_ts: 1_735_689_600,
        saved_ts: 1_735_862_400,
        forestry_scenario: 3,
        calculation_status: 'NOT_STARTED',
      })
    )

    const fetchResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=mock-plan-seeded'
      ),
      deps: {
        env: mockEnv,
      },
    })
    const fetchedPlan = await readJson<Record<string, any>>(fetchResponse)

    expect(fetchResponse.status).toBe(200)
    expect(fetchedPlan.report_data).toBeUndefined()
    expect(fetchedPlan.data.features[0].properties.id).toBe('uploaded-area-1')
  })

  it('deletes known mock plans and returns deterministic 404 for deleted plans', async () => {
    const deleteResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=mock-plan-seeded',
        { method: 'DELETE' }
      ),
      deps: {
        env: mockEnv,
      },
    })

    expect(deleteResponse.status).toBe(200)
    expect(await readJson(deleteResponse)).toEqual({
      status: 'deleted',
      id: 'mock-plan-seeded',
    })

    const refetchResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=mock-plan-seeded'
      ),
      deps: {
        env: mockEnv,
      },
    })
    const unknownDeleteResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan?id=mock-plan-seeded',
        { method: 'DELETE' }
      ),
      deps: {
        env: mockEnv,
      },
    })

    expect(refetchResponse.status).toBe(404)
    expect(unknownDeleteResponse.status).toBe(404)
  })

  it('starts and fetches deterministic finished calculations from uploaded zipped GeoJSON', async () => {
    const postResponse = await requestProxyResponse({
      request: await createZippedPlanRequest({
        method: 'POST',
        url: 'https://map.example.org/api/hiilikartta/calculation?id=calc-plan-1&name=Calculation%20mock%20plan&visible_id=calc-visible-1&forestry_scenario=2',
      }),
      deps: {
        env: mockEnv,
      },
    })
    const postedCalculation = await readJson<Record<string, any>>(postResponse)

    expect(postResponse.status).toBe(200)
    expect(postedCalculation).toEqual(
      expect.objectContaining({
        status: 'finished',
        id: 'calc-plan-1',
        visible_id: 'calc-visible-1',
        user_id: MOCK_AUTH_USER_ID,
        saved_ts: 1_735_862_400,
        forestry_scenario: 2,
        calculation_status: 'FINISHED',
      })
    )

    const fetchResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/calculation?id=calc-plan-1'
      ),
      deps: {
        env: mockEnv,
      },
    })
    const fetchedCalculation = await readJson<{ data: Record<string, any> }>(
      fetchResponse
    )
    const reportData = expectRawCalculationDataToProcess(
      fetchedCalculation.data
    )

    expect(fetchResponse.status).toBe(200)
    expect(reportData.metadata.forestry_scenario).toBe(2)
    expect(reportData.metadata.reportName).toBe('Calculation mock plan')
  })

  it('returns deterministic external reports and error responses in mock mode', async () => {
    const reportResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan/external?id=mock-external-report'
      ),
      deps: {
        env: mockEnv,
      },
    })
    const report = await readJson<Record<string, any>>(reportResponse)

    expect(reportResponse.status).toBe(200)
    expect(report.name).toBe('Mock external carbon report')
    expectRawCalculationDataToProcess(report.report_data)

    const errorResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan/external?id=mock-external-error'
      ),
      deps: {
        env: mockEnv,
      },
    })
    const unknownResponse = await requestProxyResponse({
      request: new Request(
        'https://map.example.org/api/hiilikartta/plan/external?id=unknown-external'
      ),
      deps: {
        env: mockEnv,
      },
    })

    expect(errorResponse.status).toBe(422)
    expect(await readJson(errorResponse)).toEqual({
      error: 'Mock external report cannot be processed',
    })
    expect(unknownResponse.status).toBe(404)
    expect(await readJson(unknownResponse)).toEqual({
      error: 'Mock external report not found',
    })
  })
})
