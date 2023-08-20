// TODO: Split into multiple files?
import {
  Checkbox,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from '@mui/material'
import FormControlLabel from '@mui/material/FormControlLabel'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React from 'react'
import Link from 'next/link'

import { useMapStore } from '#/common/store'
import { LayerGroupId } from '#/common/types/map'
import { useVisibleLayerGroupIds } from '#/common/hooks/map/useVisibleLayerGroupIds'

const styles = {
  heading: {
    fontWeight: "theme.typography['regular'].fontWeight",
  },
  content: {
    margin: 'unset',
  },
}

interface AOAccordionProps {
  layerGroupId: LayerGroupId
  label: string
  content?: any
  panelProps?: any
}

export const AOAccordion = ({
  layerGroupId,
  label,
  content,
  panelProps,
}: AOAccordionProps) => {
  const visibleLayerGroupIds = useVisibleLayerGroupIds()
  const toggleLayerGroup = useMapStore((state) => state.toggleLayerGroup)
  // const groupEnabled = layerGroups.filter((x) => x.name === groupName).length > 0

  return (
    <Accordion {...panelProps}>
      <AccordionSummary sx={styles.content} expandIcon={<ExpandMoreIcon />}>
        <FormControlLabel
          onClick={(event) => {
            event.stopPropagation()
          }}
          onChange={(_event) => {
            toggleLayerGroup(layerGroupId)
          }}
          onFocus={(event) => event.stopPropagation()}
          control={<Checkbox />}
          label={label}
          checked={visibleLayerGroupIds.includes(layerGroupId)}
        />
        {/* <Typography className={classes.heading}>{label}</Typography> */}
      </AccordionSummary>

      <AccordionDetails>{content}</AccordionDetails>
    </Accordion>
  )
}

export const AOAccordionLink = ({ href, label }: any) => {
  return (
    <Accordion expanded={false}>
      <Link href={href} className="neutral-link">
        <AccordionSummary
          style={{ marginLeft: 31 }}
          sx={styles.content}
          expandIcon={<ExpandMoreIcon style={{ transform: 'rotate(-90deg' }} />}
        >
          <Typography sx={styles.heading}>{label}</Typography>
        </AccordionSummary>
      </Link>
    </Accordion>
  )
}

export const AOProfileAccordion = ({ onClick, label }: any) => {
  return (
    <Accordion onClick={onClick} expanded={false}>
      <div className="neutral-link">
        <AccordionSummary
          style={{ marginLeft: 31 }}
          sx={styles.content}
          expandIcon={<ExpandMoreIcon style={{ transform: 'rotate(-90deg' }} />}
        >
          <Typography sx={styles.heading}>{label}</Typography>
        </AccordionSummary>
      </div>
    </Accordion>
  )
}

interface LayerToggleControlProps {
  layerGroupId: LayerGroupId
  label: string
}

// TODO: toggle state to local storage?
export const LayerToggleControl = ({
  layerGroupId,
  label,
}: LayerToggleControlProps) => {
  const visibleLayerGroupIds = useVisibleLayerGroupIds()
  const toggleLayerGroup = useMapStore((state) => state.toggleLayerGroup)

  // React.useEffect(() => {
  //   if ([isLayerEnabled && visibleLayerGroupIds.includes(layerName)]) {
  //     toggleLayerGroup(layerName, layerStyle)
  //   }
  // }, [])

  return (
    <FormControlLabel
      onClick={(event) => {
        event.stopPropagation()
      }}
      onChange={(_event) => {
        toggleLayerGroup(layerGroupId)
      }}
      onFocus={(event) => event.stopPropagation()}
      control={<Checkbox />}
      label={label}
      checked={visibleLayerGroupIds.includes(layerGroupId)}
    />
  )
}

export const AOAccordionHeader = ({ href, label }: any) => {
  return (
    <Accordion expanded={false}>
      <Link href={href} className="neutral-link">
        <AccordionSummary
          sx={styles.content}
          expandIcon={<ExpandMoreIcon style={{ transform: 'rotate(90deg' }} />}
        >
          <Typography sx={styles.heading}>{label}</Typography>
        </AccordionSummary>
      </Link>
    </Accordion>
  )
}
