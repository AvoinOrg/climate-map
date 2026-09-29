import { UseQueryOptions } from '@tanstack/react-query'
import axios from 'axios'

import { useAuthSession } from '#/common/auth'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { buildFolayerWfsUrl } from '../geoServer'
import { FolayerConfState, FolayerAreaConf } from '../types'
import { getFolayerCentroidSourceLayer } from '../utils'
import { getRequiredBearerAuthHeader } from './authHeaders'

export const useAdminFolayerAreaQueryOptions = (
  folayerId: string
): UseQueryOptions<FolayerAreaConf | null> => {
  const { data: session } = useAuthSession()
  const { accessToken } = session ?? {}
  const centroidSourceLayer = getFolayerCentroidSourceLayer(folayerId)
  return {
    queryKey: ['adminFolayerAreas', folayerId],
    queryFn: async () => {
      const generation = useAppletStore.getState().adminAccessGeneration
      const isCurrent = () =>
        generation === useAppletStore.getState().adminAccessGeneration
      // List rows preload these collections for detail/settings/pictures. Let
      // the read finish when its last observer unmounts during navigation.
      // Revocation cancels the query explicitly and invalidates this generation,
      // so even a late transport response cannot publish privileged data.
      const url = buildFolayerWfsUrl({ centroidSourceLayer })
      if (!url) {
        return null
      }

      const headers = getRequiredBearerAuthHeader({
        accessToken,
        requestName: 'Luonnonmetsakartat admin folayer areas',
      })

      const updateFolayerAreaConf =
        useAppletStore.getState().updateFolayerAreaConf
      const addFolayerAreaConf = useAppletStore.getState().addFolayerAreaConf
      const existingCollection =
        useAppletStore.getState().folayerAreaConfs[folayerId]

      if (existingCollection) {
        if (existingCollection.state !== FolayerConfState.Idle) {
          return null
        }
        updateFolayerAreaConf(folayerId, {
          state: FolayerConfState.Fetching,
        })
      } else {
        // Add new collection
        addFolayerAreaConf(folayerId, {
          id: folayerId,
          data: { type: 'FeatureCollection', features: [] },
          state: FolayerConfState.Fetching,
        })
      }

      try {
        const response = await axios.get(url, {
          headers,
        })

        if (!isCurrent()) return null

        if (response.status === 200) {
          const features = (response.data.features ||
            []) as FolayerAreaConf['data']['features']

          for (const feature of features) {
            feature.id = feature.properties.id || feature.id
            const properties = feature.properties as unknown as Record<
              string,
              unknown
            >
            const pics = properties.pictures
            if (typeof pics === 'string') {
              try {
                const parsed: unknown = JSON.parse(pics)
                if (Array.isArray(parsed)) {
                  properties.pictures = parsed
                }
              } catch {
                // leave as-is if not valid JSON
              }
            }
          }
          // Extract area collection data
          const areaObj: FolayerAreaConf = {
            id: folayerId, // Using the same ID as the folayer
            data: {
              type: 'FeatureCollection',
              features,
            }, // Assuming features are in the response
            state: FolayerConfState.Idle,
          }

          // Handle the area collection separately
          const existingCollection =
            useAppletStore.getState().folayerAreaConfs[folayerId]

          if (existingCollection) {
            updateFolayerAreaConf(folayerId, areaObj)
          }

          return areaObj
        }

        return null
      } finally {
        if (
          isCurrent() &&
          useAppletStore.getState().folayerAreaConfs[folayerId]?.state ===
            FolayerConfState.Fetching
        ) {
          updateFolayerAreaConf(folayerId, { state: FolayerConfState.Idle })
        }
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  }
}
