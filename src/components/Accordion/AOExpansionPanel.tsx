import React from 'react'
import { ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails, createStyles, makeStyles, Theme, Checkbox, Typography } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import * as LayerGroups from '../../map/layer_groups'
import { useObservable } from "micro-observables";
import { Link } from 'react-router-dom';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontWeight: theme.typography.fontWeightRegular,
    },
    content: {
      margin: 'unset',
    }
    // MuiExpansionPanelSummary-content.Mui-expanded
    // activeCard: {
    //   backgroundColor: 'rgba(0,100,100,0.1)',
    // },
  }),
);


export const AOExpansionPanel = (props: any) => {
  const { groupName, label, content, panelProps } = props
  const layerGroups = useObservable(LayerGroups.layerGroupService.layerGroups);
  const groupEnabled = layerGroups.filter(x => x.name === groupName).length > 0
  const classes = useStyles({});

  return <ExpansionPanel {...panelProps}>
    <ExpansionPanelSummary className={classes.content} expandIcon={<ExpandMoreIcon />}>
      <FormControlLabel
        onClick={event => { event.stopPropagation() }}
        onChange={event => LayerGroups.layerGroupService.setGroupState(groupName, (event.target as HTMLInputElement).checked)}
        onFocus={event => event.stopPropagation()}
        control={<Checkbox />}
        label={label}
        checked={groupEnabled}
      />
      {/* <Typography className={classes.heading}>{label}</Typography> */}
    </ExpansionPanelSummary>

    <ExpansionPanelDetails>{content}</ExpansionPanelDetails>

  </ExpansionPanel>
}

export const AOExpansionPanelLink = ({ href, label }: any) => {
  const classes = useStyles({});

  return <ExpansionPanel expanded={false}>
    <Link to={href} className='neutral-link'>
      <ExpansionPanelSummary
        style={{ marginLeft: 31 }}
        className={classes.content} expandIcon={<ExpandMoreIcon style={{ transform: 'rotate(-90deg' }}
        />}>
        <Typography className={classes.heading}>{label}</Typography>
      </ExpansionPanelSummary>
    </Link>

  </ExpansionPanel>
}

export const LayerToggleControl = ({ groupName, label }) => {
  const layerGroups = useObservable(LayerGroups.layerGroupService.layerGroups);
  const groupEnabled = layerGroups.filter(x => x.name === groupName).length > 0

  return (
    <FormControlLabel
      onClick={event => { event.stopPropagation() }}
      onChange={event => LayerGroups.layerGroupService.setGroupState(groupName, (event.target as HTMLInputElement).checked)}
      onFocus={event => event.stopPropagation()}
      control={<Checkbox />}
      label={label}
      checked={groupEnabled}
    />
  )

}
