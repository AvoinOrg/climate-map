// A wrapper component to be used for each applet's layout.
// Right now this only ensures that correct MapContext is used
// for each applet. See MapStore for more details.

'use client'

import React, { useEffect } from 'react'
import { useMapStore } from '#/common/store'
import { MapContext } from '#/common/types/map'

const AppletWrapper = ({
  children,
  mapContext,
}: {
  children: React.ReactNode
  mapContext: MapContext
}) => {
  const setMapContext = useMapStore((state) => state.setMapContext)
  const stateMapContext = useMapStore((state) => state.mapContext)

  useEffect(() => {
    setMapContext(mapContext)
  }, [])

  return <>{stateMapContext === mapContext && children}</>
}

export default AppletWrapper
