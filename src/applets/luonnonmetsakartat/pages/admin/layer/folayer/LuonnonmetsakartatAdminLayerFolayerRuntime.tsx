import React, { useEffect } from 'react'
import { Box } from '#/common/style/theme'
import TText from '#/components/common/TText'
import { useStore } from 'zustand'

import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useAdminFolayer } from 'applets/luonnonmetsakartat/common/hooks/useAdminFolayer'
import { getFolayerGroupId } from 'applets/luonnonmetsakartat/common/utils'
import { useExclusiveLayerGroups } from '#/common/hooks/map/useExclusiveLayerGroups'
import { useAppParams } from '#/common/navigation/navigation'

const FolayerRuntime = ({
  children,
  folayerId,
}: {
  children: React.ReactNode
  folayerId: string
}) => {
  const adminFolayerConf = useStore(
    useAppletStore,
    (state) => state.adminFolayerConfs[folayerId]
  )
  const [, setFolayerEnabled, hasErrored] = useAdminFolayer(folayerId)
  const folayerGroupId = getFolayerGroupId(folayerId, true)
  useExclusiveLayerGroups([folayerGroupId])

  useEffect(() => {
    setFolayerEnabled(true)
    // This keyed runtime starts once per layer, not on each query/store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    return () => {
      document.title = previousTitle
    }
  }, [])
  useEffect(() => {
    if (adminFolayerConf)
      document.title = 'Luonnonmetsakartat / Admin - ' + adminFolayerConf.name
  }, [adminFolayerConf])

  // The page owns its data-loading UI; map visibility is not data readiness.
  return (
    <>
      {hasErrored && (
        <Box role="alert">
          <TText
            ns="luonnonmetsakartat"
            keyName="sidebar.admin.folayer.error_fetching"
          />
        </Box>
      )}
      {children}
    </>
  )
}

const LuonnonmetsakartatAdminLayerFolayerRuntime = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { folayerIdSlug } = useAppParams<{ folayerIdSlug: string }>()
  return (
    <FolayerRuntime key={folayerIdSlug} folayerId={folayerIdSlug}>
      {children}
    </FolayerRuntime>
  )
}

export default LuonnonmetsakartatAdminLayerFolayerRuntime
