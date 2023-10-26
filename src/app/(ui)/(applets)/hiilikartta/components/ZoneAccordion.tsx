import React, { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import { useTranslate } from '@tolgee/react'

import useStore from '#/common/hooks/useStore'
import { ArrowDown } from '#/components/icons'

import { useAppletStore } from '../state/appletStore'
import { PlanDataFeature } from '../common/types'
import useSelectedFeaturesFilteredByLayer from '#/common/hooks/map/useSelectedFeaturesFilteredByLayer'
import { getPlanLayerGroupId } from '../common/utils'
import { useMapStore } from '#/common/store'

interface Props {
  planConfId: string
  sx?: any
}

const ZoneAccordion = ({ planConfId, sx }: Props) => {
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[planConfId]
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
  const { t } = useTranslate('hiilikartta')
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([])
  const [lastAction, setLastAction] = useState<{
    featureId: string
    isExpanded: boolean
  } | null>(null)

  useEffect(() => {
    const selectedFeatureIds = selectedFeatures.reduce((acc: string[], f) => {
      if (f.properties && f.properties.id != null) {
        acc.push(f.properties.id)
      }

      return acc
    }, [])

    setExpandedAccordions(selectedFeatureIds)
  }, [selectedFeatures])

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

  // Check if the accordion is expanded
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

  const getTitle = (feature: PlanDataFeature) => {
    let name = ''
    if (typeof feature.properties.name === 'string') {
      if (feature.properties.name === '') {
        name += t('sidebar.plan_settings.new_area')
      } else {
        name += feature.properties.name
      }
    } else {
      name += `${t('sidebar.plan_settings.area')} ${feature.properties.name}`
    }

    if (
      feature.properties.zoning_code != null &&
      feature.properties.zoning_code != ''
    ) {
      return `${name} (${feature.properties.zoning_code})`
    }

    return `${name}`
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
          <Accordion
            key={feature.properties.id}
            sx={{
              width: '100%',
              backgroundColor: 'background.paper', // Default color
              ':before': {
                opacity: 0,
              },
              '&.Mui-expanded': {
                margin: 'auto', // Override the default behavior
                backgroundColor: 'primary.light', // Color when expanded
              },
              '&:before': {
                display: 'none', // Disable the default focus visible
              },
            }}
            TransitionProps={{ unmountOnExit: true }} // Prevent margin transition
            expanded={isAccordionExpanded(feature.properties.id)}
            onChange={handleAccordionChange(feature.properties.id)}
          >
            <AccordionSummary
              expandIcon={<ArrowDown />}
              aria-controls={`panel${index + 1}-content`}
              id={`panel${index + 1}-header`}
            >
              <Typography></Typography>
              <Typography>{getTitle(feature)}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                {/* Replace with your feature description or component */}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
    </Box>
  )
}

export default ZoneAccordion
