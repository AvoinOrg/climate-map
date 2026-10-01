export const API_ORIGIN: string
export const TILE_ORIGIN: string
export type FixtureResponse = {
  status: number
  headers: Record<string, string>
  body: Buffer
}
export type FixtureRule = {
  match: (url: URL) => boolean
  gate?: Promise<void>
  ignoreAbort?: boolean
  network?: boolean
  response?: FixtureResponse
  transform?: (payload: unknown) => unknown
}
export const createFixtureGate: () => {
  promise: Promise<void>
  release: () => void
}
export const createEnergyAreaFixture: (options?: {
  delivery?: 'native' | 'xyz' | 'tms'
}) => {
  requests: string[]
  matches: (url: URL) => boolean
  respond: (
    url: string,
    options?: { signal?: AbortSignal; method?: string }
  ) => Promise<FixtureResponse>
  fetch: typeof fetch
  setActiveRelease: (releaseId: string | null) => void
  setDelivery: (value: 'native' | 'xyz' | 'tms') => void
  enqueue: (rule: FixtureRule) => void
}
