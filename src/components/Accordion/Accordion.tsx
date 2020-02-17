import React from 'react'
import clsx from 'clsx'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, makeStyles, Theme, createStyles } from '@material-ui/core';

import ForestContent from './ForestContent'
import BuildingsContent from './BuildingsContent'
import BioversityContent from './BioversityContent'
import WetlandsContent from './WetlandsContent'
import SnowCoverContent from './SnowCoverContent'

import './AccordionStyle.css'

const drawerWidth = 340;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontSize: theme.typography.pxToRem(15),
      fontWeight: theme.typography.fontWeightRegular,
    },
    drawerItem: {
      marginBottom: 20,
      width: drawerWidth - 46
    },
    noExpansionPanelPadding: {
      padding: 0
    }
  }),
);

interface DropdownProps {
  item: any;
  drawerItem: boolean;
}

const Dropdown = (props: DropdownProps) => {
  const { item, drawerItem } = props;
  const classes = useStyles({});
  return <ExpansionPanel className={clsx({
    [classes.drawerItem]: drawerItem
  })}>

    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
      {item?.title && <Typography className={classes.heading}>{item.title}</Typography>}
    </ExpansionPanelSummary>

    <ExpansionPanelDetails className={clsx({
      [classes.noExpansionPanelPadding]: item.noExpansionPanelPadding
    })}>
      <Content item={item} />
    </ExpansionPanelDetails>

  </ExpansionPanel>;
}

const Content = (props: any) => {
  const { item } = props
  switch (item.contentType) {
    case 'textWithLink':
      return <TextContentWithLink
        content={
          item.content
        } />
    case 'text':
      return <TextContent
        content={
          Array.isArray(item.content) ? item.content : [item.content]
        } />
    case 'forestContent':
      return <ForestContent item={item.content} />
    case 'buildingsContent':
      return <BuildingsContent item={item.content} />
    case 'bioversityContent':
      return <BioversityContent item={item.content} />
    case 'wetlandsContent':
      return <WetlandsContent item={item.content} />
    case 'snowCoverContent':
      return <SnowCoverContent item={item.content} />
    default:
      return null
  }
}

const TextContent = (props: any) => {
  const { content } = props

  return <Typography>
    {content.map(
      (v, i) => <p key={i}> {v} </p>
    )}
  </Typography>
}

const TextContentWithLink = (props: any) => {
  const { content } = props

  return <Typography>
    {content.map(
      (v, i) => typeof v === 'string' ? <p key={i}> {v} </p> :
        <>
          {v.link.textBefore && <span>{v.link.textBefore}</span>}
          <Link to={v.link.to}>{v.link.text}</Link>
          {v.link.textAfter && <span>{v.link.textAfter}</span>}
        </>
    )}
  </Typography>
}

const Link = (props: any) => {
  const { to, children } = props;
  return <a href={to}>{children}</a>
}

export default Dropdown
