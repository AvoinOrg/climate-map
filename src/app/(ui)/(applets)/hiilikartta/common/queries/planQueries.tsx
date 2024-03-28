import { FetchStatus } from '#/common/types/general'
import {
  QueryKey,
  useQueries,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import axios from 'axios'
import { FeatureCollection } from 'geojson'
import { area as turfArea } from '@turf/turf'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'

import {
  CalculationState,
  PlaceholderPlanConf,
  PlanConf,
  PlanConfState,
  ReportData,
} from '../types'
import { processCalcQueryToReportData } from '../utils'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

export const planQueries = (
  placeholderPlanConfs: PlaceholderPlanConf[] | undefined
): any => {
  placeholderPlanConfs = placeholderPlanConfs || []

  const { data: session } = useSession()
  const updatePlaceholderPlanConf =
    useAppletStore.getState().updatePlaceholderPlanConf
  const deletePlaceholderPlanConf =
    useAppletStore.getState().deletePlaceholderPlanConf
  const updatePlanConf = useAppletStore.getState().updatePlanConf
  const addPlanConf = useAppletStore.getState().addPlanConf

  return {
    queries: placeholderPlanConfs.map((placeholderPlanConf) => ({
      queryKey: ['plan', placeholderPlanConf.id],
      queryFn: async () => {
        updatePlaceholderPlanConf(placeholderPlanConf.id, {
          ...placeholderPlanConf,
          status: FetchStatus.FETCHING,
        })

        const response = await axios.get(`${API_URL}/plan`, {
          params: { id: placeholderPlanConf.serverId },

          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${session?.accessToken}`,
          },
        })

        if (response.status === 200) {
          try {
            let reportData: ReportData | undefined = undefined
            if (response.data.report_data != null) {
              reportData = processCalcQueryToReportData(
                response.data.report_data
              )
            }

            let calculationState: CalculationState =
              CalculationState.NOT_STARTED

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

            const planConf: PlanConf = {
              id: response.data.visible_id,
              name: response.data.name,
              serverId: response.data.id,
              created: response.data.created_ts * 1000,
              state: PlanConfState.IDLE,
              calculationState: calculationState,
              cloudLastSaved: response.data.saved_ts * 1000,
              localLastSaved: response.data.saved_ts * 1000,
              localLastEdited: response.data.saved_ts * 1000,
              userId: response.data.user_id,
              data: response.data.data,
              areaHa: turfArea(response.data.data as FeatureCollection) / 10000,
              reportData: reportData,
            }

            const planConfs = useAppletStore.getState().planConfs

            await deletePlaceholderPlanConf(placeholderPlanConf.id)
            if (Object.keys(planConfs).includes(planConf.id)) {
              if (
                planConfs[planConf.id].localLastEdited != null &&
                (planConfs[planConf.id].localLastEdited ?? 0) <
                  (planConf.cloudLastSaved ?? 0)
              ) {
                const updatedPlanConf = await updatePlanConf(
                  planConf.id,
                  planConf
                )
                return updatedPlanConf
              } else {
                updatePlanConf(planConf.id, { state: PlanConfState.IDLE })
              }
            } else {
              const newPlanConf = await addPlanConf(planConf)
              return newPlanConf
            }
          } catch (e) {
            console.error(e)
            updatePlaceholderPlanConf(placeholderPlanConf.id, {
              status: FetchStatus.ERRORED,
            })
          }
        }
        return null
      },
      retry: 3,
      enabled: false,
    })),
  }

  // return {
  //   queries: serverIds.map((serverId) => ({
  //     queryKey: ['plan', serverId],
  //     queryFn: async (context: any) => {
  //       // Add the context argument with type 'unknown'
  //       const options = planQuery(serverId)
  //       if (options.queryFn) {
  //         return options.queryFn(context) // Pass the context argument
  //       }
  //       return null
  //     },
  //   })),
}
