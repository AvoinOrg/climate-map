'use client'
import React, { useContext, useEffect } from 'react'

import useStore from '#/common/hooks/useStore'
import { MapContext } from '#/components/Map'

import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { getPlanLayerId } from 'applets/hiilikartta/common/utils'

const Layout = ({ params, children }: { params: { planIdSlug: string }; children: React.ReactNode }) => {
  // const planConf = useStore(useAppStore, (state) => state.planConfs)
  const { enableAnyLayerGroup, getSourceBounds, fitBounds } = useContext(MapContext)

  useEffect(() => {
    const planLayerId = getPlanLayerId(params.planIdSlug)
    enableAnyLayerGroup(planLayerId)
    const bounds = getSourceBounds(planLayerId)
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
