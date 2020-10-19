import React, { useState } from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { Button } from "@material-ui/core";

import SignupStepper from "./SignupStepper";
import SignupForm from "./SignupForm";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
      justifyContent: "center",
    },
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      maxWidth: "800px",
    },
    header: {
      fontFamily: theme.typography.fontFamily[0],
      fontWeight: 500,
      textAlign: "center",
      margin: "60px 0 0 0",
    },
    nextButton: {
      alignSelf: "flex-end",
      margin: "16px 8px 0 8px",
    },
  })
);

const steps = [0, 1, 2];

const Signup = () => {
  const classes = useStyles({});

  const [activeStep, setActiveStep] = useState(0);

  const handleClickNext = () => {
    setActiveStep(activeStep + 1);
  };

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <h2 className={classes.header}>Sign up and create a free profile</h2>
        <SignupStepper activeStep={activeStep} steps={steps}></SignupStepper>

        {activeStep === 0 && (
          <SignupForm handleClickNext={handleClickNext}></SignupForm>
        )}
      </div>
    </div>
  );
};

export const NextButton = (props) => {
  const classes = useStyles({});

  return (
    <Button
      variant={"contained"}
      disableElevation
      className={classes.nextButton}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      Next
    </Button>
  );
};

export default Signup;
