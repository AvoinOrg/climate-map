// A wrapper component to be used for each applet's layout.
// Right now this only ensures that correct MapContext is used
// for each applet. See MapStore for more details.

'use client'

import React, { useEffect, useLayoutEffect } from 'react'
import { useMapStore, useUIStore } from '#/common/store'
import { MapContext } from '#/common/types/map'
import { useTolgee } from '@tolgee/react'

const AppletWrapper = ({
  children,
  mapContext,
  localizationNamespace,
  defaultLanguage,
  SidebarHeaderElement,
}: {
  children: React.ReactNode
  mapContext: MapContext
  localizationNamespace?: string
  defaultLanguage?: string
  SidebarHeaderElement?: React.JSX.Element
}) => {
  const tolgee = useTolgee(['update'])

  const setMapContext = useMapStore((state) => state.setMapContext)
  const stateMapContext = useMapStore((state) => state.mapContext)
  const setSidebarHeaderElement = useUIStore(
    (state) => state.setSidebarHeaderElement
  )

  useEffect(() => {
    if (tolgee.isLoaded()) {
      localizationNamespace != null && tolgee.addActiveNs(localizationNamespace)
      defaultLanguage != null && tolgee.changeLanguage(defaultLanguage)
    }
  }, [tolgee.isLoaded()])

  useLayoutEffect(() => {
    if (SidebarHeaderElement != null && setSidebarHeaderElement != null) {
      setSidebarHeaderElement(SidebarHeaderElement)
    }
  }, [setSidebarHeaderElement, SidebarHeaderElement])

  useEffect(() => {
    setMapContext(mapContext)

    return () => {
      tolgee.removeActiveNs(localizationNamespace)
    }
  }, [])

  const isTolgeeReady = () => {
    if (
      localizationNamespace != null &&
      !tolgee
        .getAllRecords()
        .some((item) => item.namespace === localizationNamespace)
    ) {
      return false
    }

    return true
  }

  return <>{stateMapContext === mapContext && isTolgeeReady() && children}</>
}

export default AppletWrapper
