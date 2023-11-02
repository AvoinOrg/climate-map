import { UseQueryOptions } from '@tanstack/react-query'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import axios from 'axios'
import { CalculationState, PlanConf, ReportData } from '../types'
import { transformCalcGeojsonToNestedStructure } from '../utils'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

export const calcPollQuery = (
  planConf: PlanConf
): UseQueryOptions<ReportData> => {
  const updatePlanConf = useAppletStore.getState().updatePlanConf
  const tryAgainError: Error = new Error('Calculation not yet complete.')

  return {
    queryKey: ['calcPoll', planConf.serverId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/calculation`, {
        params: { id: planConf.serverId },
      })

      if (response.status === 200) {
        const areas = transformCalcGeojsonToNestedStructure(
          response.data.data.areas
        )
        const totals = transformCalcGeojsonToNestedStructure(
          response.data.data.totals
        )
        const metadata = {
          timestamp: Number(response.data.data.metadata.calculated_ts),
        }

        updatePlanConf(planConf.id, {
          reportData: { areas: areas, totals: totals, metadata: metadata },
          calculationState: CalculationState.FINISHED,
        })

        return { areas, totals, metadata }
      } else if (response.status === 422) {
        updatePlanConf(planConf.id, {
          calculationState: CalculationState.ERRORED,
        })
      }

      throw tryAgainError
    },
    enabled: !!planConf.serverId,
    retry: (failureCount, error) => {
      return error === tryAgainError
    },
  }
}
