import { createContext, useContext } from 'react'
import type {
  AreaApiProblem,
  AreaDetail,
  AreaDetailRequest,
} from 'applets/energy/common/types/areas'
import type {
  CommittedAreaGeneration,
  AreaRuntimeStatus,
} from 'applets/energy/common/areas/mapRuntime'

type AreaRuntimeContextValue = {
  generation?: CommittedAreaGeneration
  status: AreaRuntimeStatus
  problem?: AreaApiProblem['kind']
  refreshFailed: boolean
  tileFailed: boolean
  request?: AreaDetailRequest
  detail?: AreaDetail
  detailProblem?: AreaApiProblem['kind']
  detailLoading: boolean
  refresh: () => void
  retryTiles: () => void
  retryDetail: () => void
  close: () => void
}
export const AreaRuntimeContext = createContext<AreaRuntimeContextValue>({
  status: 'unavailable',
  problem: 'not-configured',
  refreshFailed: false,
  tileFailed: false,
  detailLoading: false,
  refresh: () => {},
  retryTiles: () => {},
  retryDetail: () => {},
  close: () => {},
})
export const useEnergyAreaRuntime = () => useContext(AreaRuntimeContext)
