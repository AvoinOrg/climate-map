import { UseQueryOptions } from '@tanstack/react-query'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import axios from 'axios'
import { CalculationState, PlanConf, ReportData } from '../types'
import { processCalcQueryToReportData } from '../utils'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

export const calcQueryPoll = (
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
        const reportData = processCalcQueryToReportData(response.data.data)

        updatePlanConf(planConf.id, {
          reportData: reportData,
          calculationState: CalculationState.FINISHED,
        })

        return reportData
      } else if (response.status === 206) {
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
