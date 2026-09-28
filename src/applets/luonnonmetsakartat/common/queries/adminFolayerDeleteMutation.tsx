import { UseMutationOptions } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslate } from '@tolgee/react'

import { useAuthSession } from '#/common/auth'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { AdminFolayerConf, FolayerConfState } from '../types'
import { useUIStore } from '#/common/store'
import { LUONNONMETSAKARTAT_API_URL } from '../api'
import { getRequiredBearerAuthHeader } from './authHeaders'

const API_URL = LUONNONMETSAKARTAT_API_URL

export interface AdminFolayerDeleteInput {
  folayerConf: AdminFolayerConf
  callbackFn?: () => void | Promise<void>
}

export const useAdminFolayerDeleteMutationOptions = (): UseMutationOptions<
  void,
  Error,
  AdminFolayerDeleteInput
> => {
  const deleteAdminFolayerConf = useAppletStore(
    (state) => state.deleteAdminFolayerConf
  )
  const updateAdminFolayerConf = useAppletStore(
    (state) => state.updateAdminFolayerConf
  )
  const { data: session } = useAuthSession()
  const { accessToken } = session ?? {}
  const notify = useUIStore((state) => state.notify)
  const { t } = useTranslate('luonnonmetsakartat')

  return {
    mutationFn: async ({ folayerConf }) => {
      const headers = getRequiredBearerAuthHeader({
        accessToken,
        requestName: 'Luonnonmetsakartat folayer delete',
      })

      // Update folayer state to show it's being deleted
      updateAdminFolayerConf(folayerConf.id, {
        ...folayerConf,
        state: FolayerConfState.Deleting,
      })

      try {
        const deleteRes = await axios.delete(
          `${API_URL}/layer/${folayerConf.id}`,
          { headers }
        )

        if (
          deleteRes.status !== 200 &&
          deleteRes.status !== 204 &&
          deleteRes.status !== 404
        ) {
          throw new Error('Failed to delete the folayer')
        }
      } catch (error) {
        // Axios rejects 404 by default; an already absent layer is deleted.
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return
        }
        throw error
      }
    },
    onError: (error, params) => {
      console.error(error)

      // Revert folayer state if deletion fails
      updateAdminFolayerConf(params.folayerConf.id, {
        ...params.folayerConf,
        state: FolayerConfState.Idle,
      })

      // Notify user of error
      notify({
        message: t('notifications.folayer_delete_error'),
        variant: 'error',
      })
    },
    onSuccess: async (_, params) => {
      // Notify user of successful deletion
      notify({
        message: t('notifications.folayer_delete_success', {
          name: params.folayerConf.name,
        }),
        variant: 'success',
      })

      await params.callbackFn?.()
      deleteAdminFolayerConf(params.folayerConf.id)
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
  }
}
