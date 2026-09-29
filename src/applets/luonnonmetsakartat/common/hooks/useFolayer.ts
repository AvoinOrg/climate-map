import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  LayerGroupStatus,
  useLayerGroup,
} from '#/common/hooks/map/useLayerGroup'

import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { folayerAreaQuery } from '../queries/folayerAreaQuery'
import { getFolayerGroupId, createFolayerConf } from '../utils'
import { FolayerConf } from 'applets/luonnonmetsakartat/common/types'

export const useFolayer = (
  folayerId: string,
  options: { preload?: boolean } = {}
): [LayerGroupStatus, (shouldBeEnabled: boolean) => void, boolean] => {
  const { preload = false } = options
  const folayerConf = useAppletStore((state) => state.folayerConfs[folayerId])
  const folayerAreaConf = useAppletStore(
    (state) => state.folayerAreaConfs[folayerId]
  )

  const { refetch: areasRefetch, isError } = useQuery({
    ...folayerAreaQuery(folayerId),
    enabled: false,
  })

  const initActions = useCallback(async () => {
    const promises = []
    if (!folayerAreaConf) {
      promises.push(areasRefetch())
    }
    await Promise.all(promises)
  }, [folayerAreaConf, areasRefetch])

  const getLayerConf = useCallback(async () => {
    const conf: FolayerConf | null | undefined = folayerConf
    return createFolayerConf({
      folayerId: conf.id,
      folayerName: conf.name,
      colorCode: conf.colorCode,
      isAdmin: false,
    })
  }, [folayerConf])

  const layerGroupId = getFolayerGroupId(folayerId, false)

  // Bump when color or updated timestamp changes
  const confVersion = `${folayerConf?.updatedTs ?? ''}-public`

  const [status, setEnabled] = useLayerGroup(layerGroupId, getLayerConf, {
    preload,
    initActions,
    confVersion,
  })
  return [status, setEnabled, isError]
}
