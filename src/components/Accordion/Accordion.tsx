import React from 'react'
import clsx from 'clsx'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Accordion, AccordionSummary, Typography, AccordionDetails, makeStyles, Theme, createStyles } from '@material-ui/core';

import './AccordionStyle.css'

const drawerWidth = 340;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontSize: theme.typography.pxToRem(16),
      fontWeight: theme.typography["regular"].fontWeight,
      fontFamily: theme.typography.fontFamily[0],
    },
    drawerItem: {
      marginBottom: 8,
      width: drawerWidth - 46,
      fontFamily: theme.typography.fontFamily[1]
    },
    noAccordionPadding: {
      padding: 0
    },
  }),
);

const Dropdown = ({item, drawerItem}) => {
  const classes = useStyles({});
  return <Accordion className={clsx({
    [classes.drawerItem]: drawerItem
  })}>

    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      {item?.title && <Typography className={classes.heading}>{item.title}</Typography>}
    </AccordionSummary>

    <AccordionDetails className={clsx({
      [classes.noAccordionPadding]: true
    })}>
      <Content item={item} />
    </AccordionDetails>

  </Accordion>;
}

const Content = (props: any) => {
  const { item, checked } = props

  const ContentComponent = item.content
  return <ContentComponent
    checked={checked}
    item={item.content} />
}


export default Dropdown
