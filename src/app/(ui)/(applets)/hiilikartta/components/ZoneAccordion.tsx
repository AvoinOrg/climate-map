import * as React from 'react'
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

interface Props {
  planConfId: string
}

const ZoneAccordion = (props: Props) => {
  const planConf = useStore(
    useAppletStore,
    (state) => state.planConfs[props.planConfId]
  )
  const { t } = useTranslate('hiilikartta')

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
      })}
    >
      {planConf &&
        planConf.data.features.map((feature, index) => (
          <Accordion
            key={index}
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
