'use client'
import React, { useContext, useEffect } from 'react'

import useStore from '#/common/hooks/useStore'
import { MapContext } from '#/components/Map'

import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { getPlanLayerId } from 'applets/hiilikartta/common/utils'

const Layout = ({ params, children }: { params: { planIdSlug: string }; children: React.ReactNode }) => {
  const planConf = useStore(useAppStore, (state) => state.planConfs)
  const { enableAnyLayerGroup } = useContext(MapContext)

  useEffect(() => {
    enableAnyLayerGroup(getPlanLayerId(params.planIdSlug))
  }, [])

  // useEffect(() => {
  //   setMapLibraryMode('mapbox')
  // }, [])
  return <>{children}</>
}

export default Layout
