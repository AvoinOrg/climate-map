import React, { useCallback, useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'

import useStore from '#/common/hooks/useStore'
import { PlanDataFeature } from '../../../../common/types'
import { useMapStore } from '#/common/store'
import useSelectedFeaturesFilteredByLayer from '#/common/hooks/map/useSelectedFeaturesFilteredByLayer'

import { useAppletStore } from '../../../../state/appletStore'
import { getPlanLayerGroupId } from '../../../../common/utils'
import ZoneAccordionItem from './ZoneAccordionItem'

interface Props {
  planConfId: string
  sx?: any
}

const ZoneAccordion = ({ planConfId, sx }: Props) => {
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[planConfId]
  )
  const updatePlanConfDataFeature = useAppletStore(
    (state) => state.updatePlanConfDataFeature
  )
  const removeSelectedFeaturesByIds = useMapStore(
    (state) => state.removeSelectedFeaturesByIds
  )
  const addSelectedFeaturesByIds = useMapStore(
    (state) => state.addSelectedFeaturesByIds
  )

  const selectedFeatures = useSelectedFeaturesFilteredByLayer([
    getPlanLayerGroupId(planConfId) + '-fill',
  ])
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([])
  const [lastAction, setLastAction] = useState<{
    featureId: string
    isExpanded: boolean
  } | null>(null)

  const accordionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const selectedFeatureIdsRef = useRef<string[]>([])

  useEffect(() => {
    const selectedFeatureIds = selectedFeatures.reduce((acc: string[], f) => {
      if (f.properties && f.properties.id != null) {
        acc.push(f.properties.id)
      }

      return acc
    }, [])

    setExpandedAccordions(selectedFeatureIds)

    const previousSelectedFeatureIds = selectedFeatureIdsRef.current
    const newFeatureId = selectedFeatureIds.find(
      (id) => !previousSelectedFeatureIds.includes(id)
    )

    if (newFeatureId != null) {
      const accordionElement = accordionRefs.current[newFeatureId]
      if (accordionElement) {
        accordionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }

    selectedFeatureIdsRef.current = selectedFeatureIds
  }, [selectedFeatures])

  useEffect(() => {
    if (lastAction && lastAction.isExpanded && planConf) {
      const featureId = lastAction.featureId
      const accordionIndex = planConf.data.features.findIndex(
        (f) => f.properties.id === featureId
      )
      const accordionElement = accordionRefs.current[accordionIndex]
      if (accordionElement) {
        accordionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }
    }
  }, [lastAction, planConf])

  useEffect(() => {
    if (lastAction) {
      const { featureId, isExpanded } = lastAction
      setExpandedAccordions((prevExpanded) => {
        if (isExpanded) {
          return [...prevExpanded, featureId]
        } else {
          return prevExpanded.filter((id) => id !== featureId)
        }
      })

      if (isExpanded) {
        addSelectedFeaturesByIds(
          [featureId],
          'id',
          getPlanLayerGroupId(planConfId),
          undefined,
          true
        )
      } else {
        removeSelectedFeaturesByIds(
          [featureId],
          'id',
          getPlanLayerGroupId(planConfId),
          true
        )
      }
    }
  }, [lastAction, addSelectedFeaturesByIds, removeSelectedFeaturesByIds])

  const isAccordionExpanded = (featureId: string) => {
    return expandedAccordions.includes(featureId)
  }

  const handleAccordionChange = useCallback(
    (featureId: string) =>
      (event: React.SyntheticEvent, isExpanded: boolean) => {
        setLastAction({ featureId, isExpanded })
      },
    []
  )

  const updateFeature = (
    featureId: string,
    feature: Partial<PlanDataFeature>
  ) => {
    if (planConf) {
      updatePlanConfDataFeature(planConf.id, featureId, feature)
    }
  }

  return (
    <Box
      sx={(theme) => ({
        '.MuiAccordion-root': {
          borderTop: `1px solid ${theme.palette.primary.dark}`, // Add border to all items
          '&:last-child': {
            borderBottom: `1px solid ${theme.palette.primary.dark}`, // Add border for the last item
          },
        },
        ...sx,
      })}
    >
      {planConf &&
        planConf.data.features.map((feature, index) => (
          <ZoneAccordionItem
            key={feature.properties.id}
            feature={feature}
            index={index}
            expanded={isAccordionExpanded(feature.properties.id)}
            onChange={handleAccordionChange}
            accordionRefs={accordionRefs}
            updateFeature={updateFeature}
          />
        ))}
    </Box>
  )
}

export default ZoneAccordion
