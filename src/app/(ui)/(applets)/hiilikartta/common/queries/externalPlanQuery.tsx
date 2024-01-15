import { FetchStatus } from '#/common/types/general'
import { UseQueryOptions } from '@tanstack/react-query'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import axios from 'axios'
import { ExternalPlanConf, ReportData } from '../types'
import { processCalcQueryToReportData } from '../utils'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

export const externalPlanQuery = (
  serverId: string
): UseQueryOptions<ExternalPlanConf> => {
  const updateExternalPlanConf =
    useAppletStore.getState().updateExternalPlanConf
  const tryAgainError: Error = new Error('Calculation not yet complete.')

  return {
    queryKey: ['externalPlan', serverId],
    queryFn: async () => {
      updateExternalPlanConf(serverId, { status: FetchStatus.FETCHING })
      const response = await axios.get(`${API_URL}/plan/external`, {
        params: { id: serverId },
      })

      if (response.status === 200) {
        const reportData = processCalcQueryToReportData(
          response.data.report_data
        )

        const planConf = {
          name: response.data.name,
          serverId: serverId,
          status: FetchStatus.FETCHED,
          reportData: reportData,
        }

        updateExternalPlanConf(serverId, planConf)

        return planConf
      } else if (response.status === 422) {
        // TODO: throw snackbar error
      } else if (response.status === 404) {
        // TODO: throw snackbar error
      }

      throw tryAgainError
    },
    retry: (failureCount, error) => {
      if (failureCount > 3) {
        updateExternalPlanConf(serverId, { status: FetchStatus.ERRORED })
        return false
      }
      return error === tryAgainError
    },
  }
}
