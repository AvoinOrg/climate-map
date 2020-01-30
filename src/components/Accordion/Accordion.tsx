import React from 'react'
import clsx from 'clsx'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, makeStyles, Theme, createStyles } from '@material-ui/core';

const drawerWidth = 340;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontSize: theme.typography.pxToRem(15),
      fontWeight: theme.typography.fontWeightRegular,
    },
    drawerItem: {
      marginLeft: 20,
      marginBottom: 25,
      marginRight: 21,
      maxWidth: drawerWidth - 46
    },
    details: {
      marginLeft: 20,
      marginBottom: 25,
      marginRight: 21,
      maxWidth: drawerWidth - 46
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
  })} {...props}>

    <ExpansionPanelSummary  expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
      {item?.title && <Typography className={classes.heading}>{item.title}</Typography>}
    </ExpansionPanelSummary>

    <ExpansionPanelDetails>
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
