'use client'
import React, { useEffect } from 'react'

import { useMapStore } from '#/common/store'

// import { useAppStore } from 'applets/hiilikartta/state/appStore'
import { getPlanLayerGroupId } from 'applets/hiilikartta/common/utils'
import { Feature } from 'geojson'
import { getGeoJsonArea } from '#/common/utils/gis'
import { generateUUID } from '#/common/utils/general'
import { FeatureProperties } from 'applets/hiilikartta/common/types'

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
  // const setIsDrawEnabled = useMapStore((state) => state.setIsDrawEnabled)

  useEffect(() => {
    const getAndFitBounds = async () => {
      const bounds = await getSourceBounds(planLayerGroupId)
      if (bounds) {
        fitBounds(bounds, { duration: 2000, latExtra: 0.5, lonExtra: 0.5 })
      }
    }

    const planLayerGroupId = getPlanLayerGroupId(params.planIdSlug)
    enableSerializableLayerGroup(planLayerGroupId, {
      drawOptions: {
        idField: 'id',
        polygonEnabled: true,
        editEnabled: true,
        featureAddMutator: (feature: Feature) => {
          const properties: FeatureProperties = {
            id: generateUUID(),
            area_ha: getGeoJsonArea(feature) / 10000,
            zoning_code: null,
          }

          feature.properties = properties

          return feature
        },
        featureUpdateMutator: (feature: Feature) => {
          const properties = feature.properties as FeatureProperties
          const newProperties: FeatureProperties = {
            ...properties,
            area_ha: getGeoJsonArea(feature) / 10000,
          }

          feature.properties = newProperties

          return feature
        },
      },
    })

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
