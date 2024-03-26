import { FetchStatus } from '#/common/types/general'
import { UseQueryOptions } from '@tanstack/react-query'
import axios from 'axios'
import { FeatureCollection } from 'geojson'
import { area as turfArea } from '@turf/turf'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'

import { CalculationState, PlanConf, ReportData } from '../types'
import { processCalcQueryToReportData } from '../utils'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

export const planQuery = (
  serverId: string
): UseQueryOptions<PlanConf | null> => {
  const { data: session } = useSession()
  const updatePlaceholderPlanConf =
    useAppletStore.getState().updatePlaceholderPlanConf
  const deletePlaceholderPlanConf =
    useAppletStore.getState().deletePlaceholderPlanConf
  const updatePlanConf = useAppletStore.getState().updatePlanConf
  const addPlanConf = useAppletStore.getState().addPlanConf

  return {
    queryKey: ['plan', serverId],
    queryFn: async () => {
      updatePlaceholderPlanConf(serverId, { status: FetchStatus.FETCHING })
      const response = await axios.get(`${API_URL}/plan`, {
        params: { id: serverId },

        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })

      if (response.status === 200) {
        let reportData = undefined
        if (response.data.report_data != null) {
          reportData = processCalcQueryToReportData(response.data.report_data)
        }

        let calculationState: CalculationState = CalculationState.NOT_STARTED

        if (response.data.calculation_status != null) {
          switch (response.data.calculation_status) {
            case 'ERROR':
              calculationState = CalculationState.ERRORED
              break
            case 'PROCESSING':
              calculationState = CalculationState.CALCULATING
              break
            case 'FINISHED':
              calculationState = CalculationState.FINISHED
              break
          }
        }

        const planConf = {
          id: response.data.id,
          name: response.data.name,
          serverId: serverId,
          status: FetchStatus.FETCHED,
          created: response.data.created_ts * 1000,
          calculationState: response.data.calculation_status,
          cloudLastSaved: response.data.saved_ts * 1000,
          localLastSaved: response.data.saved_ts * 1000,
          localLastEdited: response.data.saved_ts * 1000,
          userId: response.data.user_id,
          data: response.data.data,
          areaHa: turfArea(response.data.data as FeatureCollection) / 10000,
          reportData: reportData,
        }

        const planConfs = useAppletStore.getState().planConfs
        if (Object.keys(planConfs).includes(serverId)) {
          if (
            planConfs[serverId].localLastEdited != null &&
            (planConfs[serverId].localLastEdited ?? 0) <=
              planConf.cloudLastSaved
          ) {
            const updatedPlanConf = await updatePlanConf(serverId, planConf)
            return updatedPlanConf
          }
        } else {
          planConf.data = response.data.data
          const newPlanConf = await addPlanConf(planConf)
          return newPlanConf
        }
        deletePlaceholderPlanConf(serverId)
      }
      return null
    },
    retry: 3,
  }
}
