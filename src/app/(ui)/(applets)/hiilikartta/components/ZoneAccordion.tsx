import React, { useCallback, useEffect, useRef, useState, memo } from 'react'
import Box from '@mui/material/Box'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import { T, useTranslate } from '@tolgee/react'

import useStore from '#/common/hooks/useStore'
import { ArrowDown } from '#/components/icons'

import { useAppletStore } from '../state/appletStore'
import { PlanDataFeature } from '../common/types'
import useSelectedFeaturesFilteredByLayer from '#/common/hooks/map/useSelectedFeaturesFilteredByLayer'
import { getPlanLayerGroupId } from '../common/utils'
import { useMapStore } from '#/common/store'
import { ZONING_CLASSES } from '../common/constants'
import { styled } from '@mui/material/styles'
import DropDownSelect from '#/components/common/DropDownSelect'

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
  const { t } = useTranslate('hiilikartta')
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
          <CustomAccordion
            key={feature.properties.id}
            feature={feature}
            index={index}
            expanded={isAccordionExpanded(feature.properties.id)}
            onChange={handleAccordionChange}
            getTitle={getTitle}
            accordionRefs={accordionRefs}
            updateFeature={updateFeature}
          />
        ))}
    </Box>
  )
}

export default ZoneAccordion

interface CustomAccordionProps {
  feature: PlanDataFeature
  index: number
  expanded: boolean
  onChange: (
    featureId: string
  ) => (event: React.SyntheticEvent, isExpanded: boolean) => void
  getTitle: (feature: PlanDataFeature) => string
  accordionRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null
  }>
  updateFeature: (id: string, feature: Partial<PlanDataFeature>) => void
}

const CustomAccordion = memo(
  ({
    feature,
    index,
    expanded,
    onChange,
    getTitle,
    accordionRefs,
    updateFeature,
  }: CustomAccordionProps) => {
    const [isValid, setIsValid] = useState(true)

    useEffect(() => {
      setIsValid(checkIsValidZoningCode(feature.properties.zoning_code))
    }, [feature.properties.zoning_code])

    const handleZoningCodeChange = (event: any) => {
      const zoningCode = event.target.value

      if (zoningCode != null) {
        updateFeature(feature.properties.id, {
          properties: { ...feature.properties, zoning_code: zoningCode },
        })
      }
    }

    return (
      <Accordion
        key={feature.properties.id}
        sx={{
          width: '100%',
          backgroundColor: 'background.paper',
          ':before': {
            opacity: 0,
          },
          '&.Mui-expanded': {
            margin: 'auto',
            backgroundColor: 'primary.lighter',
          },
          '&:before': {
            display: 'none',
          },
        }}
        TransitionProps={{ unmountOnExit: true }}
        expanded={expanded}
        onChange={onChange(feature.properties.id)}
        ref={(el) => (accordionRefs.current[feature.properties.id] = el)}
      >
        <AccordionSummary
          expandIcon={<ArrowDown />}
          aria-controls={`panel${index + 1}-content`}
          id={`panel${index + 1}-header`}
        >
          <Typography sx={{ display: 'inline' }}>
            {getTitle(feature)}
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ display: 'flex', flexDirection: 'column' }}>
          <Row>
            <T
              keyName={'sidebar.plan_settings.zones.area_information'}
              ns="hiilikartta"
            ></T>
          </Row>
          <DropDownSelect
            value={feature.properties.zoning_code}
            options={zoningCodeOptions}
            onChange={handleZoningCodeChange}
            sx={{
              backgroundColor: 'neutral.lighter',
              borderColor: 'primary.light',
              mt: 1,
            }}
          ></DropDownSelect>
        </AccordionDetails>
      </Accordion>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.expanded === nextProps.expanded &&
      prevProps.getTitle(prevProps.feature) ===
        nextProps.getTitle(nextProps.feature)
    )
  }
)

const zoningCodeOptions = ZONING_CLASSES.map((zoning) => ({
  value: zoning.code,
  label: `${zoning.name} (${zoning.code})`,
}))

const checkIsValidZoningCode = (zoningCode: string | null) => {
  if (zoningCode == null) {
    return false
  }

  for (let zoning of ZONING_CLASSES) {
    // Split the code by comma and trim spaces, then check if zoningCode is one of them
    const codes = zoning.code.split(',').map((code) => code.trim())
    if (codes.includes(zoningCode.trim())) {
      return true
    }
  }
  return false
}

const Row = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
}))
