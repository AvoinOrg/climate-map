import React from 'react'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, makeStyles, Theme, createStyles } from '@material-ui/core';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontSize: theme.typography.pxToRem(15),
      fontWeight: theme.typography.fontWeightRegular,
    },
  }),
);


interface DropdownProps {
  title: any;
}

const Dropdown = (props: DropdownProps) => {
  const { title } = props;
  const classes = useStyles({});

  return <ExpansionPanel {...props}>
    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} aria-controls="panel1a-content" id="panel1a-header">
      <Typography className={classes.heading}>{title}</Typography>
    </ExpansionPanelSummary>
    <ExpansionPanelDetails>
      <Typography>
        sum dolor sit amet, consectetur adipiscing elit.Suspendisse malesuada lacus ex,
      sit amet blandit leo lobortis eget.
      </Typography>

    </ExpansionPanelDetails>

  </ExpansionPanel>;
}

export default Dropdown
