import React, { useEffect, useState } from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { Button } from "@material-ui/core";

import DataForm from "./DataForm";
import SignupStepper from "./SignupStepper";
import SignupForm from "./SignupForm";
import IntegrationForm from "./IntegrationForm";
import Finish from "./Finish";
import { UserContext } from "../User";
import { StateContext } from "../State";

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
      margin: "80px 0 0 0",
    },
    nextButton: {
      alignSelf: "flex-end",
      margin: "60px 8px 0 8px",
    },
  })
);

const steps = [0, 1, 2];

const Signup = () => {
  const classes = useStyles({});
  const { isLoggedIn }: any = React.useContext(UserContext);
  const {
    setIsSignupOpen,
    setIsSidebarDisabled,
    setIsSidebarOpen,
  }: any = React.useContext(StateContext);

  const [activeStep, setActiveStep] = useState(2);

  const handleClickNext = () => {
    setActiveStep(activeStep + 1);
  };

  const handleFinish = () => {
    setIsSignupOpen(false);
    setIsSidebarDisabled(false);
    setIsSidebarOpen(true);
  };

  useEffect(() => {
    if (activeStep > 0 && !isLoggedIn) {
      setActiveStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <h2 className={classes.header}>Sign up and create a free profile</h2>
        <SignupStepper activeStep={activeStep} steps={steps}></SignupStepper>

        {activeStep === 0 && (
          <SignupForm handleClickNext={handleClickNext}></SignupForm>
        )}
        {activeStep === 1 && isLoggedIn && (
          <DataForm handleClickNext={handleClickNext}></DataForm>
        )}
        {activeStep === 2 && isLoggedIn && (
          <IntegrationForm handleClickNext={handleClickNext}></IntegrationForm>
        )}
        {activeStep > 2 && isLoggedIn && (
          <Finish handleClickNext={handleFinish}></Finish>
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
