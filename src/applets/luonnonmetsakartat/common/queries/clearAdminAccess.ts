import type { QueryClient } from '@tanstack/react-query'
import { useMapStore } from '#/common/store/mapStore'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { AdminVerificationStatus } from '../types'

const adminQueryNames = new Set([
  'adminVerificationQuery',
  'adminFolayers',
  'adminFolayer',
  'adminFolayerAreas',
])
const isAdminSource = (source: string) =>
  /_luonnonmetsakartat(?:_centroid)?_admin$/.test(source)

// Revocation is applet-scoped. Public metadata and unrelated queries/map groups survive.
export const clearAdminAccess = (client: QueryClient) => {
  const state = useAppletStore.getState()
  const areaIds = new Set(Object.keys(state.adminFolayerConfs))
  client
    .getQueryCache()
    .findAll({ queryKey: ['adminFolayerAreas'] })
    .forEach((query) => {
      areaIds.add(String(query.queryKey[1]))
    })
  useAppletStore.setState((current) => ({
    adminAccessGeneration: current.adminAccessGeneration + 1,
    adminVerificationStatus: AdminVerificationStatus.NoUser,
    adminFolayerConfs: {},
    folayerAreaConfs: Object.fromEntries(
      Object.entries(current.folayerAreaConfs).filter(
        ([id]) => !areaIds.has(id)
      )
    ),
  }))
  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      adminQueryNames.has(String(query.queryKey[0])),
  }
  void client.cancelQueries(filters)
  client.removeQueries(filters)
  const map = useMapStore.getState()
  map.removeSelectedFeatures({
    features: map.selectedFeatures.filter((feature) =>
      isAdminSource(feature.source)
    ),
    ignoreAdditionalFeatures: true,
    ignorePopups: true,
  })
  // Popups live outside the sidebar gate, and can outlive their selected features.
  useMapStore.setState((current) => ({
    activePopupData: current.activePopupData.filter(
      (popup) =>
        !popup.features.some((feature) => isAdminSource(feature.source))
    ),
  }))
  Object.keys(map._layerGroups)
    .filter(isAdminSource)
    .forEach((id) => {
      void map.removeLayerGroup(id)
    })
}
