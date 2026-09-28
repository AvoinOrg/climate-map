import { UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { useAuthSession } from '#/common/auth'
import { AdminFolayerConf, FolayerConfState } from '../types'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useUIStore } from '#/common/store'
import { useTranslate } from '@tolgee/react'
import { LUONNONMETSAKARTAT_API_URL } from '../api'
import { getRequiredBearerAuthHeader } from './authHeaders'

const API_URL = LUONNONMETSAKARTAT_API_URL

interface MutationData extends AdminFolayerConf {
  rawShapefile?: ArrayBuffer
  deleteAreasNotUpdated?: boolean
  bulkImages?: File[]
  bulkAreaIds?: string[]
}

type ResponseData = {
  status: number
  id: string
}

export const useAdminFolayerPatchMutationOptions = (): UseMutationOptions<
  ResponseData,
  Error,
  MutationData
> => {
  const queryClient = useQueryClient()
  const addAdminFolayerConf = useAppletStore(
    (state) => state.addAdminFolayerConf
  )
  const notify = useUIStore((state) => state.notify)
  const { t } = useTranslate('luonnonmetsakartat')
  const { data: session } = useAuthSession()
  const { accessToken } = session ?? {}

  return {
    mutationFn: async (mutationData: MutationData) => {
      if (
        (mutationData.bulkImages?.length ?? 0) !==
        (mutationData.bulkAreaIds?.length ?? 0)
      ) {
        throw new Error('Bulk images and area IDs must be aligned')
      }

      const formData = new FormData()

      if (mutationData.rawShapefile) {
        const blob = new Blob([mutationData.rawShapefile], {
          type: 'application/zip',
        })
        formData.append('zip_file', blob, 'shapefile.zip')
      }

      // Whether to delete areas not present in the uploaded update
      if (typeof mutationData.deleteAreasNotUpdated !== 'undefined') {
        formData.append(
          'delete_areas_not_updated',
          String(!!mutationData.deleteAreasNotUpdated)
        )
      }

      if (mutationData.isVisible != null) {
        const isHidden = !mutationData.isVisible
        formData.append('is_hidden', isHidden.toString())
      }

      if (mutationData.name) {
        formData.append('name', mutationData.name)
      }

      if (mutationData.colorCode && mutationData.colorCode !== '') {
        formData.append('color_code', mutationData.colorCode)
      }

      if (mutationData.colOptions) {
        formData.append(
          'indexing_strategy',
          mutationData.colOptions.indexingStrategy
        )
        formData.append('name_col', mutationData.colOptions.nameCol)
        formData.append(
          'municipality_col',
          mutationData.colOptions.municipalityCol
        )
        if (mutationData.colOptions.regionCol) {
          formData.append('region_col', mutationData.colOptions.regionCol)
        }
        if (mutationData.colOptions.descriptionCol) {
          formData.append(
            'description_col',
            mutationData.colOptions.descriptionCol
          )
        }
        if (mutationData.colOptions.areaCol) {
          formData.append('area_col', mutationData.colOptions.areaCol)
        }
        if (mutationData.colOptions.idCol) {
          formData.append('id_col', mutationData.colOptions.idCol)
        }
      }

      // Append bulk images and their corresponding area IDs (aligned by index)
      if (
        mutationData.bulkImages &&
        mutationData.bulkAreaIds &&
        mutationData.bulkImages.length > 0 &&
        mutationData.bulkImages.length === mutationData.bulkAreaIds.length
      ) {
        mutationData.bulkImages.forEach((file) => {
          formData.append('bulk_images', file, file.name)
        })
        mutationData.bulkAreaIds.forEach((id) => {
          formData.append('bulk_area_ids', id)
        })
      }

      const postRes = await axios.patch(
        `${API_URL}/layer/${mutationData.id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...getRequiredBearerAuthHeader({
              accessToken,
              requestName: 'Luonnonmetsakartat folayer update',
            }),
          },
        }
      )

      if (postRes.status !== 200 && postRes.status !== 201) {
        throw new Error('Failed to save the folayer')
      }

      // updatePlanConf(planConf.id, {
      //   cloudLastSaved: postRes.data.saved_ts * 1000,
      //   localLastSaved: postRes.data.saved_ts * 1000,
      //   state: PlanConfState.IDLE,
      //   userId: postRes.data.user_id,
      // })

      const adminFolayerConf: AdminFolayerConf = {
        id: postRes.data.id,
        name: postRes.data.name,
        isVisible: !postRes.data.is_hidden,
        state: FolayerConfState.Idle,
        createdTs: postRes.data.created_ts,
        updatedTs: postRes.data.updated_ts,
        unsyncedChanges: false,
        colorCode: postRes.data.color_code,
        colOptions: postRes.data.col_options,
      }

      await addAdminFolayerConf(adminFolayerConf)

      return { status: postRes.status, id: postRes.data.id }
    },
    onSuccess: async (_data, variables) => {
      // Notify user of successful update (settings, shapefile, or pictures)
      if (variables.bulkImages?.length && variables.bulkImages.length > 0) {
        notify({
          message: t('notifications.folayer_pictures_success', {
            name: variables.name || variables.id,
          }),
          variant: 'success',
        })
      } else {
        notify({
          message: t('notifications.folayer_update_success', {
            name: variables.name || variables.id,
          }),
          variant: 'success',
        })
      }

      // If a new shapefile or bulk images were provided, areas may have changed — refetch areas
      if (
        variables.rawShapefile ||
        (variables.bulkImages?.length && variables.bulkImages?.length > 0)
      ) {
        await queryClient.invalidateQueries({
          queryKey: ['adminFolayerAreas', variables.id],
          exact: true,
        })
        await queryClient.refetchQueries({
          queryKey: ['adminFolayerAreas', variables.id],
          type: 'active',
        })

        // Optionally refetch normal folayer areas if present in store
        const state = useAppletStore.getState()
        const hasNormalAreas = !!state.folayerAreaConfs?.[variables.id]
        const hasNormalConf = !!state.folayerConfs?.[variables.id]

        if (hasNormalAreas || hasNormalConf) {
          await queryClient.invalidateQueries({
            queryKey: ['folayerAreas', variables.id],
            exact: true,
          })
          await queryClient.refetchQueries({
            queryKey: ['folayerAreas', variables.id],
            type: 'active',
          })
        }
      }

      // Refresh the list of layers
      await queryClient.invalidateQueries({ queryKey: ['folayers'] })
      await queryClient.refetchQueries({
        queryKey: ['folayers'],
        type: 'active',
      })
    },
    onError: (error) => {
      console.error(error)
      notify({
        message: `${t('notifications.folayer_creation_error')}`,
        variant: 'error',
        persist: true,
      })
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 3000),
  }
}
