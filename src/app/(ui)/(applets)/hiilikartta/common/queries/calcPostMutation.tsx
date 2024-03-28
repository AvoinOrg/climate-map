import { UseMutationOptions } from '@tanstack/react-query'
import axios from 'axios'
import JSZip from 'jszip'
import { CalculationState, PlanConfState, PlanConf } from '../types'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { useUIStore } from '#/common/store'
import { useTranslate } from '@tolgee/react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

type ResponseData = {
  status: string
  id: string
}

export const calcPostMutation = (): UseMutationOptions<
  ResponseData,
  Error,
  PlanConf
> => {
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const notify = useUIStore((state) => state.notify)
  const { t } = useTranslate('hiilikartta')
  const { data: session } = useSession()

  return {
    mutationFn: async (planConf: PlanConf) => {
      const localLastEdited = planConf.localLastEdited
      updatePlanConf(planConf.id, {
        calculationState: CalculationState.INITIALIZING,
        state: PlanConfState.SAVING,
      })
      const zip = new JSZip()
      zip.file('file', JSON.stringify(planConf.data))
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const formData = new FormData()
      formData.append('file', zipBlob, 'file.zip')

      const postRes = await axios.post(`${API_URL}/calculation`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {}),
        },
        params: {
          id: planConf.serverId,
          name: planConf.name,
          visible_id: planConf.id,
        },
      })

      if (postRes.status !== 200) {
        throw new Error('Failed to start calculation.')
      }

      updatePlanConf(planConf.id, {
        calculationState: CalculationState.CALCULATING,
        cloudLastSaved: postRes.data.saved_ts * 1000,
        localLastSaved: localLastEdited,
        state: PlanConfState.IDLE,
        userId: postRes.data.user_id,
      })
      return postRes.data
    },
    onError: (error, planConf, context) => {
      notify({
        message: t('notifications.starting_calc_failed'),
        variant: 'error',
      })
      console.error(error)
      updatePlanConf(planConf.id, {
        calculationState: CalculationState.ERRORED,
        state: PlanConfState.IDLE,
        reportData: undefined,
      })
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
  }
}
