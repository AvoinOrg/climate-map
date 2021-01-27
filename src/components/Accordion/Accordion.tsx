import React from 'react'
import clsx from 'clsx'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, makeStyles, Theme, createStyles } from '@material-ui/core';

import './AccordionStyle.css'

const drawerWidth = 340;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontSize: theme.typography.pxToRem(16),
      fontWeight: theme.typography.fontWeightRegular,
      fontFamily: theme.typography.fontFamily[0],
    },
    drawerItem: {
      marginBottom: 8,
      width: drawerWidth - 46,
      fontFamily: theme.typography.fontFamily[1]
    },
    noExpansionPanelPadding: {
      padding: 0
    },
  }),
);

const Dropdown = ({item, drawerItem}) => {
  const classes = useStyles({});
  return <ExpansionPanel className={clsx({
    [classes.drawerItem]: drawerItem
  })}>

    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
      {item?.title && <Typography className={classes.heading}>{item.title}</Typography>}
    </ExpansionPanelSummary>

    <ExpansionPanelDetails className={clsx({
      [classes.noExpansionPanelPadding]: true
    })}>
      <Content item={item} />
    </ExpansionPanelDetails>

  </ExpansionPanel>;
}

const Content = (props: any) => {
  const { item, checked } = props

  const ContentComponent = item.content
  return <ContentComponent
    checked={checked}
    item={item.content} />
}


export default Dropdown
