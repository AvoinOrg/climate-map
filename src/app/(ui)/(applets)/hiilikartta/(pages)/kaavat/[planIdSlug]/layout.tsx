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
  GlobalState,
  PlanConfState,
  PlanData,
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

  const updateSourceData = useMapStore((state) => state.updateSourceData)

  const globalState = useStore(useAppletStore, (state) => state.globalState)
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
    const init = async () => {
      if (planConf && !isLoaded.current && doesLayerGroupExist != null) {
        const layerGroupId = getPlanLayerGroupId(params.planIdSlug)
        const layerGroupAddOptions: SerializableLayerGroupAddOptions = {
          zoomToExtent: true,
          dataUpdateMutator: async (data: FeatureCollection) => {
            if (updatePlanConf != null) {
              updatePlanConf(params.planIdSlug, { data: data as PlanData })
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
                name: '',
                area_ha: getGeoJsonArea(feature) / 10000,
                zoning_code: '',
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
          await enableSerializableLayerGroup(layerGroupId, layerGroupAddOptions)
        } else {
          const layerConf = createLayerConf(
            planConf.data,
            planConf.id,
            ZONING_CODE_COL
          )

          await addSerializableLayerGroup(layerGroupId, {
            ...layerGroupAddOptions,
            layerConf: layerConf,
          })
        }

        isLoaded.current = true
      }
    }

    if (
      planConf &&
      !planConf.isHidden &&
      ![PlanConfState.FETCHING, PlanConfState.DELETING].includes(
        planConf.state || PlanConfState.IDLE
      ) &&
      !isLoaded.current &&
      globalState !== GlobalState.INITIALIZING &&
      doesLayerGroupExist != null
    ) {
      init()
      // return () => {
      //   try {
      //     disableSerializableLayerGroup(layerGroupId)
      //   } catch (e) {
      //     // if it fails, the layer is (most likely) already disabled/removed
      //   }
      // }
    } else if (!planConf && doesLayerGroupExist) {
      disableSerializableLayerGroup(
        getPlanLayerGroupId(params.planIdSlug)
      ).catch(() => {})
    } else if (planConf && planConf.isHidden && doesLayerGroupExist) {
      disableSerializableLayerGroup(
        getPlanLayerGroupId(params.planIdSlug)
      ).catch(() => {})
    } else if (
      planConf &&
      planConf.state != null &&
      planConf.state === PlanConfState.FETCHING
    ) {
      disableSerializableLayerGroup(
        getPlanLayerGroupId(params.planIdSlug)
      ).catch(() => {})
      isLoaded.current = false
    }
  }, [planConf, isLoaded, doesLayerGroupExist, globalState])

  useEffect(() => {
    if (planConf?.data != null && isLoaded.current) {
      const layerGroupId = getPlanLayerGroupId(planConf?.id)
      updateSourceData(layerGroupId, planConf?.data)
    }
  }, [planConf?.data, isLoaded.current])

  useEffect(() => {
    return () => {
      const layerGroupId = getPlanLayerGroupId(params.planIdSlug)

      const cleanup = async () => {
        try {
          await disableSerializableLayerGroup(layerGroupId)
        } catch (e) {
          // if it fails, the layer is (most likely) already disabled/removed
          // console.error(
          //   "Couldn't disable layer group when unmounting plan Layout.tsx"
          // )
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
