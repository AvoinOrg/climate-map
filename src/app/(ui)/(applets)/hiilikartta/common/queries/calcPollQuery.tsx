import { UseQueryOptions } from '@tanstack/react-query'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import axios from 'axios'
import { PlanConf, ReportData } from '../types'
import { transformCalcGeojsonToNestedStructure } from '../utils'

export const calcPollQuery = (planConf: PlanConf): UseQueryOptions<ReportData> => {
  const updatePlanConf = useAppletStore.getState().updatePlanConf
  const tryAgainError: Error = new Error('Calculation not yet complete.')

  return {
    queryKey: ['calcPoll', planConf.serverId],
    queryFn: async () => {
      const response = await axios.get(
        `${'http://localhost:3000/api/hiilikartta/data'}`,
        {
          params: { id: planConf.serverId },
        }
      )

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
          isCalculating: false,
        })

        return { areas, totals, metadata }
      }

      throw tryAgainError
    },
    enabled: !!planConf.serverId,
    retry: (failureCount, error) => {
      return error === tryAgainError
    },
  }
}
