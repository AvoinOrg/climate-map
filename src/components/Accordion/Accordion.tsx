import React from 'react'
import clsx from 'clsx'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, makeStyles, Theme, createStyles } from '@material-ui/core';

import ForestContent from './ForestContent'
import BuildingsContent from './BuildingsContent'
import BiodiversityContent from './BiodiversityContent'
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
      marginBottom: 8,
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

const contentTypeMappings = {
  forestContent: ForestContent,
  buildingsContent: BuildingsContent,
  biodiversityContent: BiodiversityContent,
  wetlandsContent: WetlandsContent,
  snowCoverContent: SnowCoverContent,
}
const Content = (props: any) => {
  const { item, checked } = props
  const type = item.contentType

  if (type === 'textWithLink')
    return <TextContentWithLink content={item.content} />

  if (type === 'textWithLink')
    return <TextContent
      content={Array.isArray(item.content) ? item.content : [item.content]}
    />

  const ContentComponent = contentTypeMappings[type]
  if (!ContentComponent) return null

  return <ContentComponent
    checked={checked}
    item={item.content} />
}


const TextContent = (props: any) => {
  const { content } = props

  const paragraphs = content.map(
    (v, i) => <p key={i}> {v} </p>
  )

  return <Typography>{paragraphs}</Typography>
}

const TextContentWithLink = (props: any) => {
  const { content } = props

  return <Typography>
    {content.map(
      (v, i) => typeof v === 'string' ? <p key={i}> {v} </p> :
        <span key={i}>
          {v.link.textBefore && <span>{v.link.textBefore}</span>}
          <Link to={v.link.to}>{v.link.text}</Link>
          {v.link.textAfter && <span>{v.link.textAfter}</span>}
        </span>
    )}
  </Typography>
}

const Link = (props: any) => {
  const { to, children } = props;
  return <a href={to}>{children}</a>
}

export default Dropdown
