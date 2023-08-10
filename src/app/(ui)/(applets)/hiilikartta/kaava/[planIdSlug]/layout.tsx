'use client'
import React, { useEffect } from 'react'

import { useMapStore } from '#/common/store'

// import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { getPlanLayerGroupId } from 'applets/hiilikartta/common/utils'

const Layout = ({
  params,
  children,
}: {
  params: { planIdSlug: string }
  children: React.ReactNode
}) => {
  // const planConf = useStore(useAppStore, (state) => state.planConfs)
  const enableSerializableLayerGroup = useMapStore(
    (state) => state.enableSerializableLayerGroup
  )
  const getSourceBounds = useMapStore((state) => state.getSourceBounds)
  const fitBounds = useMapStore((state) => state.fitBounds)

  useEffect(() => {
    const planLayerGroupId = getPlanLayerGroupId(params.planIdSlug)
    enableSerializableLayerGroup(planLayerGroupId)
    const bounds = getSourceBounds(planLayerGroupId)
    if (bounds) {
      fitBounds(bounds, { duration: 2000, latExtra: 0.5, lonExtra: 0.5 })
    }
  }, [])

  // useEffect(() => {
  //   setMapLibraryMode('mapbox')
  // }, [])
  return <>{children}</>
}

export default Layout
