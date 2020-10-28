import React from "react";
import {
  makeStyles,
  Theme,
  createStyles,
  withStyles,
} from "@material-ui/core/styles";
import clsx from "clsx";
import Stepper from "@material-ui/core/Stepper";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import StepConnector from "@material-ui/core/StepConnector";
import Check from "@material-ui/icons/Check";

const QontoConnector = withStyles((theme: Theme) =>
  createStyles({
    active: {
      "& $line": {
        borderColor: theme.palette.secondary.main,
      },
    },
    completed: {
      "& $line": {
        borderColor: theme.palette.secondary.main,
      },
    },
    line: {
      borderColor: theme.palette.grey[300],
      borderTopWidth: 3,
      borderRadius: 1,
    },
  })
)(StepConnector);

const useQontoStepIconStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      color: theme.palette.grey[300],
      display: "flex",
      height: 22,
      alignItems: "center",
    },
    active: {
      color: theme.palette.secondary.main,
    },
    circle: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: "currentColor",
    },
    completed: {
      color: theme.palette.secondary.main,
      zIndex: 1,
      fontSize: 18,
    },
  })
);

function QontoStepIcon(props: any) {
  const classes = useQontoStepIconStyles();
  const { active, completed } = props;

  return (
    <div
      className={clsx(classes.root, {
        [classes.active]: active,
      })}
    >
      {completed ? (
        <Check className={classes.completed} />
      ) : (
        <div className={classes.circle} />
      )}
    </div>
  );
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
      maxWidth: 600,
    },
    step: {
      padding: "0 0 0 8px",
    },
    stepper: {
      padding: "24px 0 24px 0",
    },
  })
);

const SignupStepper = (props) => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Stepper
        className={classes.stepper}
        activeStep={props.activeStep}
        connector={<QontoConnector />}
      >
        {props.steps.map((label) => (
          <Step className={classes.step} key={label}>
            <StepLabel StepIconComponent={QontoStepIcon}></StepLabel>
          </Step>
        ))}
      </Stepper>
    </div>
  );
};

export default SignupStepper;
