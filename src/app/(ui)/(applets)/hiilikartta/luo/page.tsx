'use client'

import React from 'react'
import { Button } from '@mui/material'
import { styled } from '@mui/material/styles'

import { getRoute } from '#/common/utils/routing'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Link as MuiLink } from '@mui/material'
import { T } from '@tolgee/react'

import { routeTree } from 'applets/hiilikartta/common/routes'
import { NewPlanConf } from '../common/types'
import { useAppletStore } from '../state/appletStore'
import { createLayerConf } from '../common/utils'
import { useMapStore } from '#/common/store'

const Page = () => {
  const router = useRouter()

  const addPlanConf = useAppletStore((state) => state.addPlanConf)
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)
  const addSerializableLayerGroup = useMapStore(
    (state) => state.addSerializableLayerGroup
  )

  const initializePlan = async () => {
    const colName = 'area_codes'
    const jsonName = 'Uusi kaava'
    const json = {
      type: 'FeatureCollection',
      name: jsonName,
      features: [],
    }

    const newPlanConf: NewPlanConf = {
      json: json,
      name: jsonName,
      areaHa: 0,
      fileSettings: { fileType: 'geojson', zoningColumn: colName },
    }

    const planConf = await addPlanConf(newPlanConf)

    try {
      const layerConf = createLayerConf(json, planConf.id, colName)
      await addSerializableLayerGroup(layerConf.id, {
        layerConf,
        persist: true,
      })
    } catch (e) {
      deletePlanConf(planConf.id)
      console.error(e)
      return null
    }

    return planConf.id
  }

  const handleNewPlanClick = async () => {
    const id = await initializePlan()
    // TODO: throw error if id is null, i.e. if file is invalid
    if (id) {
      const route = getRoute(routeTree.plans.plan, routeTree, [id])
      router.push(route)
    }
  }

  return (
    <>
      <MuiLink
        href={getRoute(routeTree.create.import, routeTree)}
        sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
        component={Link}
      >
        <BigMenuButton variant="contained" component="label">
          <T keyName={'sidebar.create.upload'} ns={'hiilikartta'}></T>
        </BigMenuButton>
      </MuiLink>

      <BigMenuButton variant="contained" onClick={handleNewPlanClick}>
        <T keyName={'sidebar.create.draw_new'} ns={'hiilikartta'}></T>
      </BigMenuButton>
    </>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 15px 0',
})

export default Page
