import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  LayerGroupStatus,
  useLayerGroup,
} from '#/common/hooks/map/useLayerGroup'

import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useAdminFolayerQueryOptions } from '../queries/adminFolayerQuery'
import { useAdminFolayerAreaQueryOptions } from '../queries/adminFolayerAreaQuery'
import { getFolayerGroupId, createFolayerConf } from '../utils'
import { AdminFolayerConf } from 'applets/luonnonmetsakartat/common/types'

export const useAdminFolayer = (
  folayerId: string,
  options: { preload?: boolean } = {}
): [LayerGroupStatus, (shouldBeEnabled: boolean) => void, boolean] => {
  const { preload = false } = options
  const adminFolayerConf = useAppletStore(
    (state) => state.adminFolayerConfs[folayerId]
  )
  const folayerAreaConf = useAppletStore(
    (state) => state.folayerAreaConfs[folayerId]
  )

  const { refetch: folayerRefetch, isError: isFolayerError } = useQuery({
    ...useAdminFolayerQueryOptions(folayerId),
    enabled: false,
  })

  const { refetch: areasRefetch, isError: isAreasError } = useQuery({
    ...useAdminFolayerAreaQueryOptions(folayerId),
    enabled: false,
  })

  const initActions = useCallback(async () => {
    const promises = []
    if (!adminFolayerConf) {
      promises.push(folayerRefetch())
    }
    if (!folayerAreaConf) {
      promises.push(areasRefetch())
    }
    await Promise.all(promises)
  }, [adminFolayerConf, folayerAreaConf, folayerRefetch, areasRefetch])

  const getLayerConf = useCallback(async () => {
    let conf: AdminFolayerConf | null | undefined =
      useAppletStore.getState().adminFolayerConfs[folayerId]
    if (!conf) {
      const { data } = await folayerRefetch()
      conf = data
    }
    if (!conf) {
      throw new Error(`Could not load folayer config for ${folayerId}`)
    }
    return createFolayerConf({
      folayerId: conf.id,
      folayerName: conf.name,
      colorCode: conf.colorCode,
      isAdmin: true,
    })
  }, [folayerId, folayerRefetch])

  const layerGroupId = getFolayerGroupId(folayerId, true)

  // Bump this when server-updated timestamp changes
  const confVersion = `${adminFolayerConf?.updatedTs ?? ''}-admin`

  const [status, setEnabled] = useLayerGroup(layerGroupId, getLayerConf, {
    preload,
    initActions,
    confVersion,
  })

  const hasErrored = isFolayerError || isAreasError

  return [status, setEnabled, hasErrored]
}
