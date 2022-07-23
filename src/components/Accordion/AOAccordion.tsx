import { Checkbox, Accordion, AccordionDetails, AccordionSummary, Theme, Typography } from '@mui/material'

import FormControlLabel from '@mui/material/FormControlLabel'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React from 'react'
import { Link } from 'react-router-dom'
import { Style } from 'mapbox-gl'

import MapContext from 'Components/Map'

const styles = {
  heading: {
    fontWeight: "theme.typography['regular'].fontWeight",
  },
  content: {
    margin: 'unset',
  },
}

interface AOAccordionProps {
  groupName: string
  label: string
  content: any
  layerStyle: Style
  panelProps: any
}

export const AOAccordion = (props: AOAccordionProps) => {
  const { groupName, label, content, layerStyle, panelProps } = props
  const { layerGroups } = React.useContext(MapContext)
  // const groupEnabled = layerGroups.filter((x) => x.name === groupName).length > 0

  return (
    <Accordion {...panelProps}>
      <AccordionSummary sx={styles.content} expandIcon={<ExpandMoreIcon />}>
        <FormControlLabel
          onClick={(event) => {
            event.stopPropagation()
          }}
          // OL_FIX: ENABLE LATER
          // onChange={(event) => LayerGroupState.setGroupState(groupName, (event.target as HTMLInputElement).checked)}
          onFocus={(event) => event.stopPropagation()}
          control={<Checkbox />}
          label={label}
          // checked={groupEnabled}
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
      <Link to={href} className="neutral-link">
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
  layerName: string
  label: string
  layerStyle?: Style
}

// USE REDUX HERE, HHMM
export const LayerToggleControl = ({ layerName, label, layerStyle }: LayerToggleControlProps) => {
  const { activeLayers, toggleLayer } = React.useContext(MapContext)

  // React.useEffect(() => {
  //   if ([isLayerEnabled && activeLayers.includes(layerName)]) {
  //     toggleLayer(layerName, layerStyle)
  //   }
  // }, [])

  return (
    <FormControlLabel
      onClick={(event) => {
        event.stopPropagation()
      }}
      onChange={(_event) => {
        toggleLayer(layerName, layerStyle)
      }}
      onFocus={(event) => event.stopPropagation()}
      control={<Checkbox />}
      label={label}
      checked={activeLayers.includes(layerName)}
    />
  )
}

export const AOAccordionHeader = ({ href, label }: any) => {
  return (
    <Accordion expanded={false}>
      <Link to={href} className="neutral-link">
        <AccordionSummary sx={styles.content} expandIcon={<ExpandMoreIcon style={{ transform: 'rotate(90deg' }} />}>
          <Typography sx={styles.heading}>{label}</Typography>
        </AccordionSummary>
      </Link>
    </Accordion>
  )
}
