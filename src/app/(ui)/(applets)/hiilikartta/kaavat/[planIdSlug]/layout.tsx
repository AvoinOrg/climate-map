'use client'
import React, { useEffect, useRef } from 'react'

import { useMapStore } from '#/common/store'

// import { useAppStore } from 'applets/hiilikartta/state/appStore'
import {
  createLayerConf,
  getPlanLayerGroupId,
} from 'applets/hiilikartta/common/utils'
import { Feature } from 'geojson'
import { getGeoJsonArea } from '#/common/utils/gis'
import { generateUUID } from '#/common/utils/general'
import {
  FeatureProperties,
  ZONING_CODE_COL,
} from 'applets/hiilikartta/common/types'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'
import useStore from '#/common/hooks/useStore'
import { useDoesLayerGroupExist } from '#/common/hooks/map/useDoesLayerGroupExist'
import { SerializableLayerGroupAddOptions } from '#/common/types/map'
import { FeatureCollection } from 'geojson'

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
  const addSerializableLayerGroup = useMapStore(
    (state) => state.addSerializableLayerGroup
  )
  const disableSerializableLayerGroup = useMapStore(
    (state) => state.disableSerializableLayerGroup
  )

  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[params.planIdSlug]
  )
  const updatePlanConf = useAppletStore((state) => state.updatePlanConf)

  const doesLayerGroupExist = useDoesLayerGroupExist(
    getPlanLayerGroupId(params.planIdSlug)
  )
  const isLoaded = useRef(false)

  // const setIsDrawEnabled = useMapStore((state) => state.setIsDrawEnabled)

  useEffect(() => {
    if (planConf && !isLoaded.current && doesLayerGroupExist != null) {
      isLoaded.current = true
      const layerGroupId = getPlanLayerGroupId(params.planIdSlug)

      const layerGroupAddOptions: SerializableLayerGroupAddOptions = {
        zoomToExtent: true,
        dataUpdateMutator: async (data: FeatureCollection) => {
          if (updatePlanConf != null) {
            updatePlanConf(params.planIdSlug, { data })
          } else {
            console.error('Unable to add dataUpdateMutator')
          }
        },
        drawOptions: {
          idField: 'id',
          polygonEnabled: true,
          editEnabled: true,
          deleteEnabled: true,
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
      }

      if (doesLayerGroupExist) {
        enableSerializableLayerGroup(layerGroupId, layerGroupAddOptions)
      } else {
        const layerConf = createLayerConf(
          planConf.data,
          planConf.id,
          ZONING_CODE_COL
        )

        addSerializableLayerGroup(layerGroupId, {
          ...layerGroupAddOptions,
          layerConf: layerConf,
        })
      }

      // return () => {
      //   try {
      //     disableSerializableLayerGroup(layerGroupId)
      //   } catch (e) {
      //     // if it fails, the layer is (most likely) already disabled/removed
      //   }
      // }
    }
  }, [planConf, isLoaded, doesLayerGroupExist])

  useEffect(() => {
    return () => {
      const layerGroupId = getPlanLayerGroupId(params.planIdSlug)

      const cleanup = async () => {
        try {
          await disableSerializableLayerGroup(layerGroupId)
        } catch (e) {
          console.error(
            "Couldn't disable layer group when unmounting plan Layout.tsx"
          )
          // if it fails, the layer is (most likely) already disabled/removed
        }
      }

      cleanup() // Invoke the async function, but don't await it here
    }
  }, [])

  // useEffect(() => {
  //   setMapLibraryMode('mapbox')
  // }, [])
  return <>{children}</>
}

export default Layout
