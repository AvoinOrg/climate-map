import { UseMutationOptions } from '@tanstack/react-query'
import axios from 'axios'
import { useSession } from 'next-auth/react'

import { useMapStore } from '#/common/store/mapStore'

import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { PlanConfState, PlanConf } from '../types'
import { getPlanLayerGroupId } from '../utils'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

export const planDeleteMutation = (): UseMutationOptions<
  void,
  Error,
  PlanConf
> => {
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const { data: session } = useSession()

  return {
    mutationFn: async (planConf: PlanConf) => {
      await updatePlanConf(planConf.id, {
        state: PlanConfState.DELETING,
      })

      if (session) {
        const delRes = await axios.delete(`${API_URL}/plan`, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${session?.accessToken}`,
          },
          params: { id: planConf.serverId },
        })

        if (delRes.status !== 200 && delRes.status !== 404) {
          throw new Error('Failed to delete the plan')
        }
      }

      await deletePlanConf(planConf.id)
    },
    onError: (error, planConf) => {
      console.error(error)
      updatePlanConf(planConf.id, {
        state: PlanConfState.IDLE,
      })
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
  }
}
