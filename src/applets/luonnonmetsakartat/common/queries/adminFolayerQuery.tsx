import { UseQueryOptions } from '@tanstack/react-query'
import axios from 'axios'

import { useAuthSession } from '#/common/auth'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { LUONNONMETSAKARTAT_API_URL } from '../api'
import { AdminFolayerConf, FolayerConfState } from '../types'
import { getRequiredBearerAuthHeader } from './authHeaders'

const API_URL = LUONNONMETSAKARTAT_API_URL

export const useAdminFolayerQueryOptions = (
  folayerId: string
): UseQueryOptions<AdminFolayerConf | null> => {
  const { data: session } = useAuthSession()
  const { accessToken } = session ?? {}
  const updateAdminFolayerConf =
    useAppletStore.getState().updateAdminFolayerConf
  const addAdminFolayerConf = useAppletStore.getState().addAdminFolayerConf

  return {
    queryKey: ['adminFolayer', folayerId],
    queryFn: async ({ signal }) => {
      const generation = useAppletStore.getState().adminAccessGeneration
      const isCurrent = () =>
        !signal.aborted &&
        generation === useAppletStore.getState().adminAccessGeneration
      const headers = getRequiredBearerAuthHeader({
        accessToken,
        requestName: 'Luonnonmetsakartat admin folayer detail',
      })

      const existingFolayerConf =
        useAppletStore.getState().adminFolayerConfs[folayerId]

      if (existingFolayerConf) {
        if (existingFolayerConf.state !== FolayerConfState.Idle) {
          return null
        }
        updateAdminFolayerConf(folayerId, { state: FolayerConfState.Fetching })
      }
      // Get folayer data from API
      try {
        const response = await axios.get(`${API_URL}/layer/${folayerId}`, {
          headers,
          signal,
        })

        if (!isCurrent()) return null

        if (response.status === 200) {
          // Map API response to AdminFolayerConf
          const folayerConf: AdminFolayerConf = {
            id: response.data.id,
            name: response.data.name,
            description: response.data.description || '',
            colorCode: response.data.color_code || '',
            isVisible: !response.data.is_hidden, // Note the inversion of is_hidden to isVisible
            state: FolayerConfState.Idle,
            createdTs: response.data.created_ts,
            updatedTs: response.data.updated_ts,
            unsyncedChanges: false,
            colOptions: response.data.col_options,
          }

          const existingFolayer =
            useAppletStore.getState().adminFolayerConfs[folayerConf.id]

          if (existingFolayer) {
            // Update existing folayer
            updateAdminFolayerConf(folayerConf.id, folayerConf)
          } else {
            addAdminFolayerConf(folayerConf)
          }

          return folayerConf
        }

        return null
      } finally {
        if (
          isCurrent() &&
          useAppletStore.getState().adminFolayerConfs[folayerId]?.state ===
            FolayerConfState.Fetching
        ) {
          updateAdminFolayerConf(folayerId, { state: FolayerConfState.Idle })
        }
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  }
}
