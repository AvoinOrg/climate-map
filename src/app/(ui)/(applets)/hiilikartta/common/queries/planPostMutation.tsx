import { UseMutationOptions } from '@tanstack/react-query'
import axios from 'axios'
import JSZip from 'jszip'
import { PlanConf, PlanConfState } from '../types'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_HIILIKARTTA_API_URL

type ResponseData = {
  status: string
  id: string
}

export const planPostMutation = (): UseMutationOptions<
  ResponseData,
  Error,
  PlanConf
> => {
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)
  const { data: session } = useSession()

  return {
    mutationFn: async (planConf: PlanConf) => {
      updatePlanConf(planConf.id, { state: PlanConfState.SAVING })
      const localLastEdited = planConf.localLastEdited
      const zip = new JSZip()
      zip.file('file', JSON.stringify(planConf.data))
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const formData = new FormData()
      formData.append('file', zipBlob, 'file.zip')

      const postRes = await axios.put(`${API_URL}/plan`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        params: {
          id: planConf.serverId,
          name: planConf.name,
          visible_id: planConf.id,
        },
      })

      if (postRes.status !== 200 && postRes.status !== 201) {
        throw new Error('Failed to save the plan')
      }

      updatePlanConf(planConf.id, {
        cloudLastSaved: postRes.data.saved_ts * 1000,
        localLastSaved: postRes.data.saved_ts * 1000,
        state: PlanConfState.IDLE,
        userId: postRes.data.user_id,
      })

      return postRes.data
    },
    onError: (error, planConf) => {
      console.error(error)
      updatePlanConf(planConf.id, { state: PlanConfState.IDLE })
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
  }
}
