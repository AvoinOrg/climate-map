import { UseQueryOptions } from '@tanstack/react-query'
import axios from 'axios'

import { useAuthSession } from '#/common/auth'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { LUONNONMETSAKARTAT_API_URL } from '../api'
import { AdminFolayerConf, FolayerConfState } from '../types'
import { getRequiredBearerAuthHeader } from './authHeaders'

const API_URL = LUONNONMETSAKARTAT_API_URL

type AdminFolayerApiItem = {
  id: string
  name: string
  description?: string | null
  color_code?: string | null
  is_hidden?: boolean
  created_ts: number
  updated_ts: number
  col_options?: AdminFolayerConf['colOptions']
}

// For getting all folayers (if needed)
export const useAdminFolayersQueryOptions = (): UseQueryOptions<
  AdminFolayerConf[]
> => {
  const { data: session } = useAuthSession()
  const { accessToken } = session ?? {}
  const addAdminFolayerConf = useAppletStore.getState().addAdminFolayerConf
  const updateAdminFolayerConf =
    useAppletStore.getState().updateAdminFolayerConf

  return {
    queryKey: ['adminFolayers'],
    queryFn: async () => {
      const generation = useAppletStore.getState().adminAccessGeneration
      const isCurrent = () =>
        generation === useAppletStore.getState().adminAccessGeneration
      // Finish refreshes across list/detail navigation so existing records do
      // not stay Fetching when the list loses its last observer. Revocation
      // explicitly cancels/removes the query and invalidates this generation.
      const headers = getRequiredBearerAuthHeader({
        accessToken,
        requestName: 'Luonnonmetsakartat admin folayer list',
      })

      const existingFolayers = useAppletStore.getState().adminFolayerConfs

      for (const folayerId in existingFolayers) {
        const folayer = existingFolayers[folayerId]
        updateAdminFolayerConf(folayer.id, { state: FolayerConfState.Fetching })
      }

      try {
        const response = await axios.get(`${API_URL}/layers`, {
          headers,
        })

        if (!isCurrent()) return []

        if (response.status === 200) {
          const folayerConfs: AdminFolayerConf[] = (
            response.data as AdminFolayerApiItem[]
          ).map((folayer) => ({
            id: folayer.id,
            name: folayer.name,
            description: folayer.description || '',
            colorCode: folayer.color_code || '',
            isVisible: !folayer.is_hidden,
            state: FolayerConfState.Idle,
            createdTs: folayer.created_ts,
            updatedTs: folayer.updated_ts,
            unsyncedChanges: false,
            colOptions: folayer.col_options,
          }))

          for (const folayerConf of folayerConfs) {
            const existingFolayer =
              useAppletStore.getState().adminFolayerConfs[folayerConf.id]

            if (existingFolayer) {
              updateAdminFolayerConf(folayerConf.id, folayerConf)
            } else {
              addAdminFolayerConf(folayerConf)
            }
          }

          return folayerConfs
        }

        return []
      } finally {
        for (const folayer of Object.values(existingFolayers)) {
          if (
            isCurrent() &&
            useAppletStore.getState().adminFolayerConfs[folayer.id]?.state ===
              FolayerConfState.Fetching
          ) {
            updateAdminFolayerConf(folayer.id, { state: folayer.state })
          }
        }
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  }
}
