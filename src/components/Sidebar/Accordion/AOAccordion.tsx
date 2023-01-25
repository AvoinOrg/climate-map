import { Checkbox, Accordion, AccordionDetails, AccordionSummary, Theme, Typography } from '@mui/material'
import FormControlLabel from '@mui/material/FormControlLabel'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React from 'react'
import Link from 'next/link'

import { MapContext } from '#/components/Map'
import { LayerId } from '#/common/types/map'

const styles = {
  heading: {
    fontWeight: "theme.typography['regular'].fontWeight",
  },
  content: {
    margin: 'unset',
  },
}

interface AOAccordionProps {
  layerId: LayerId
  label: string
  content?: any
  panelProps?: any
}

export const AOAccordion = ({ layerId, label, content, panelProps }: AOAccordionProps) => {
  const { activeLayerGroupIds, toggleLayerGroup } = React.useContext(MapContext)
  // const groupEnabled = layerGroups.filter((x) => x.name === groupName).length > 0

  return (
    <Accordion {...panelProps}>
      <AccordionSummary sx={styles.content} expandIcon={<ExpandMoreIcon />}>
        <FormControlLabel
          onClick={(event) => {
            event.stopPropagation()
          }}
          onChange={(_event) => {
            toggleLayerGroup(layerId)
          }}
          onFocus={(event) => event.stopPropagation()}
          control={<Checkbox />}
          label={label}
          checked={activeLayerGroupIds.includes(layerId)}
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
  layerId: LayerId
  label: string
}

// USE REDUX HERE, HHMM
export const LayerToggleControl = ({ layerId, label }: LayerToggleControlProps) => {
  const { activeLayerGroupIds, toggleLayerGroup } = React.useContext(MapContext)

  // React.useEffect(() => {
  //   if ([isLayerEnabled && activeLayerGroupIds.includes(layerName)]) {
  //     toggleLayerGroup(layerName, layerStyle)
  //   }
  // }, [])

  return (
    <FormControlLabel
      onClick={(event) => {
        event.stopPropagation()
      }}
      onChange={(_event) => {
        toggleLayerGroup(layerId)
      }}
      onFocus={(event) => event.stopPropagation()}
      control={<Checkbox />}
      label={label}
      checked={activeLayerGroupIds.includes(layerId)}
    />
  )
}

export const AOAccordionHeader = ({ href, label }: any) => {
  return (
    <Accordion expanded={false}>
      <Link href={href} className="neutral-link">
        <AccordionSummary sx={styles.content} expandIcon={<ExpandMoreIcon style={{ transform: 'rotate(90deg' }} />}>
          <Typography sx={styles.heading}>{label}</Typography>
        </AccordionSummary>
      </Link>
    </Accordion>
  )
}
