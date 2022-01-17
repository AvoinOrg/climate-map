import {
  Checkbox,
  createStyles,
  ExpansionPanel,
  ExpansionPanelDetails,
  ExpansionPanelSummary,
  makeStyles,
  Theme,
  Typography,
} from "@material-ui/core";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { useObservable } from "micro-observables";
import React from "react";
import { Link } from "react-router-dom";
import * as LayerGroupState from "../../map/LayerGroupState";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    heading: {
      fontWeight: theme.typography["regular"].fontWeight,
    },
    content: {
      margin: "unset",
    },
  })
);

export const AOExpansionPanel = (props: any) => {
  const { groupName, label, content, panelProps } = props;
  const layerGroups = useObservable(LayerGroupState.layerGroups);
  const groupEnabled =
    layerGroups.filter((x) => x.name === groupName).length > 0;
  const classes = useStyles({});

  return (
    <ExpansionPanel {...panelProps}>
      <ExpansionPanelSummary
        className={classes.content}
        expandIcon={<ExpandMoreIcon />}
      >
        <FormControlLabel
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={(event) =>
            LayerGroupState.setGroupState(
              groupName,
              (event.target as HTMLInputElement).checked
            )
          }
          onFocus={(event) => event.stopPropagation()}
          control={<Checkbox />}
          label={label}
          checked={groupEnabled}
        />
        {/* <Typography className={classes.heading}>{label}</Typography> */}
      </ExpansionPanelSummary>

      <ExpansionPanelDetails>{content}</ExpansionPanelDetails>
    </ExpansionPanel>
  );
};

export const AOExpansionPanelLink = ({ href, label }: any) => {
  const classes = useStyles({});

  return (
    <ExpansionPanel expanded={false}>
      <Link to={href} className="neutral-link">
        <ExpansionPanelSummary
          style={{ marginLeft: 31 }}
          className={classes.content}
          expandIcon={<ExpandMoreIcon style={{ transform: "rotate(-90deg" }} />}
        >
          <Typography className={classes.heading}>{label}</Typography>
        </ExpansionPanelSummary>
      </Link>
    </ExpansionPanel>
  );
};

export const AOExpansionProfilePanel = ({ onClick, label }: any) => {
  const classes = useStyles({});

  return (
    <ExpansionPanel onClick={onClick} expanded={false}>
      <div className="neutral-link">
        <ExpansionPanelSummary
          style={{ marginLeft: 31 }}
          className={classes.content}
          expandIcon={<ExpandMoreIcon style={{ transform: "rotate(-90deg" }} />}
        >
          <Typography className={classes.heading}>{label}</Typography>
        </ExpansionPanelSummary>
      </div>
    </ExpansionPanel>
  );
};

export const LayerToggleControl = ({ groupName, label }) => {
  const layerGroups = useObservable(LayerGroupState.layerGroups);
  const groupEnabled =
    layerGroups.filter((x) => x.name === groupName).length > 0;

  return (
    <FormControlLabel
      onClick={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) =>
        LayerGroupState.setGroupState(
          groupName,
          (event.target as HTMLInputElement).checked
        )
      }
      onFocus={(event) => event.stopPropagation()}
      control={<Checkbox />}
      label={label}
      checked={groupEnabled}
    />
  );
};

export const AOAccordionHeader = ({ href, label }: any) => {
  const classes = useStyles({});

  return (
    <ExpansionPanel expanded={false}>
      <Link to={href} className="neutral-link">
        <ExpansionPanelSummary
          className={classes.content}
          expandIcon={<ExpandMoreIcon style={{ transform: "rotate(90deg" }} />}
        >
          <Typography className={classes.heading}>{label}</Typography>
        </ExpansionPanelSummary>
      </Link>
    </ExpansionPanel>
  );
};
