import { UseMutationOptions } from '@tanstack/react-query'
import axios from 'axios'
import JSZip from 'jszip'
import { CalculationState, PlanConf } from '../types'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'

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

  return {
    mutationFn: async (planConf: PlanConf) => {
      updatePlanConf(planConf.id, {
        calculationState: CalculationState.INITIALIZING,
      })
      const zip = new JSZip()
      zip.file('file', JSON.stringify(planConf.data))
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      const formData = new FormData()
      formData.append('file', zipBlob, 'file.zip')
      formData.append('zoning_col', planConf.fileSettings.zoningColumn)

      const postRes = await axios.post(
        `${API_URL}/calculation`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          params: { id: planConf.serverId },
        }
      )

      if (postRes.status !== 200) {
        throw new Error('Failed to start calculation.')
      }

      updatePlanConf(planConf.id, {
        calculationState: CalculationState.CALCULATING,
      })
      return postRes.data
    },
    onError: (error, planConf, context) => {
      console.error(error)
      updatePlanConf(planConf.id, {
        calculationState: CalculationState.ERRORED,
        reportData: undefined,
      })
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
  }
}
