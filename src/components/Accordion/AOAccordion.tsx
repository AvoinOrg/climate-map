import {
  Checkbox,
  createStyles,
  Accordion,
  AccordionDetails,
  AccordionSummary,
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

export const AOAccordion = (props: any) => {
  const { groupName, label, content, panelProps } = props;
  const layerGroups = useObservable(LayerGroupState.layerGroups);
  const groupEnabled =
    layerGroups.filter((x) => x.name === groupName).length > 0;
  const classes = useStyles({});

  return (
    <Accordion {...panelProps}>
      <AccordionSummary
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
      </AccordionSummary>

      <AccordionDetails>{content}</AccordionDetails>
    </Accordion>
  );
};

export const AOAccordionLink = ({ href, label }: any) => {
  const classes = useStyles({});

  return (
    <Accordion expanded={false}>
      <Link to={href} className="neutral-link">
        <AccordionSummary
          style={{ marginLeft: 31 }}
          className={classes.content}
          expandIcon={<ExpandMoreIcon style={{ transform: "rotate(-90deg" }} />}
        >
          <Typography className={classes.heading}>{label}</Typography>
        </AccordionSummary>
      </Link>
    </Accordion>
  );
};

export const AOProfileAccordion = ({ onClick, label }: any) => {
  const classes = useStyles({});

  return (
    <Accordion onClick={onClick} expanded={false}>
      <div className="neutral-link">
        <AccordionSummary
          style={{ marginLeft: 31 }}
          className={classes.content}
          expandIcon={<ExpandMoreIcon style={{ transform: "rotate(-90deg" }} />}
        >
          <Typography className={classes.heading}>{label}</Typography>
        </AccordionSummary>
      </div>
    </Accordion>
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
    <Accordion expanded={false}>
      <Link to={href} className="neutral-link">
        <AccordionSummary
          className={classes.content}
          expandIcon={<ExpandMoreIcon style={{ transform: "rotate(90deg" }} />}
        >
          <Typography className={classes.heading}>{label}</Typography>
        </AccordionSummary>
      </Link>
    </Accordion>
  );
};
