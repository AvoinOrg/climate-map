import { createContext, useContext } from 'react'
import type {
  AreaApiProblem,
  AreaDetail,
  AreaDetailRequest,
  AreaLevel,
} from 'applets/energy/common/types/areas'
import type { AreaGeographyMode } from 'applets/energy/common/areas/mapModes'
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
  canGoBack: boolean
  back: () => void
  navigateRelated: (target: { level: AreaLevel; areaCode: string }) => void
  showWholePostalArea: () => void
  showBuildings: () => void
  selectMode: (mode: AreaGeographyMode) => void
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
  canGoBack: false,
  back: () => {},
  navigateRelated: () => {},
  showWholePostalArea: () => {},
  showBuildings: () => {},
  selectMode: () => {},
})
export const useEnergyAreaRuntime = () => useContext(AreaRuntimeContext)
