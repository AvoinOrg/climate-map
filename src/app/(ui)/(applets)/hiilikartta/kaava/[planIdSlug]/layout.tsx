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
  const disableSerializableLayerGroup = useMapStore(
    (state) => state.disableSerializableLayerGroup
  )

  const getSourceBounds = useMapStore((state) => state.getSourceBounds)
  const fitBounds = useMapStore((state) => state.fitBounds)

  useEffect(() => {
    const getAndFitBounds = async () => {
      const bounds = await getSourceBounds(planLayerGroupId)
      if (bounds) {
        fitBounds(bounds, { duration: 2000, latExtra: 0.5, lonExtra: 0.5 })
      }
    }

    const planLayerGroupId = getPlanLayerGroupId(params.planIdSlug)
    enableSerializableLayerGroup(planLayerGroupId)

    getAndFitBounds()

    return () => {
      try {
        disableSerializableLayerGroup(planLayerGroupId)
      } catch (e) {
        // if it fails, the layer is (most likely) already disabled/removed
      }
    }
  }, [])

  // useEffect(() => {
  //   setMapLibraryMode('mapbox')
  // }, [])
  return <>{children}</>
}

export default Layout
