import React, { useEffect } from 'react'
import { Box } from '#/common/style/theme'
import TText from '#/components/common/TText'
import { useStore } from 'zustand'

import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useAdminFolayer } from 'applets/luonnonmetsakartat/common/hooks/useAdminFolayer'
import { getFolayerGroupId } from 'applets/luonnonmetsakartat/common/utils'
import { useExclusiveLayerGroups } from '#/common/hooks/map/useExclusiveLayerGroups'
import { useAppParams, useAppPathname } from '#/common/navigation/navigation'
import { useAppRouteHrefBuilder } from '#/common/navigation/appRouteLinks'
import { APP_ROUTE_KEYS } from '#/common/routing/routeMetadata'

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
  const pathname = useAppPathname()
  const buildAppRouteHref = useAppRouteHrefBuilder()
  if (!folayerIdSlug) return null

  const layerPath = buildAppRouteHref({
    routeKey: APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER,
    routeParams: { folayerIdSlug },
  }).replace(/\/$/, '')

  // Navigation publishes its destination before replacing the old outlet.
  // The admin gate can remount that outlet when it adds the landing sidebar.
  // Do not restart the outgoing layer's queries/map after deletion or departure.
  if (pathname !== layerPath && !pathname.startsWith(`${layerPath}/`)) {
    return null
  }

  return (
    <FolayerRuntime key={folayerIdSlug} folayerId={folayerIdSlug}>
      {children}
    </FolayerRuntime>
  )
}

export default LuonnonmetsakartatAdminLayerFolayerRuntime
