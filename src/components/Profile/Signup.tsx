import React, { useEffect } from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { Button } from "@mui/material";

import DataForm from "./DataForm";
import SignupStepper from "./SignupStepper";
import SignupForm from "./SignupForm";
import IntegrationForm from "./IntegrationForm";
import VerificationForm from "./VerificationForm";
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

const steps = [0, 1, 2, 3];

const Signup = () => {
  const classes = useStyles({});
  const { isLoggedIn, updateProfile }: any = React.useContext(UserContext);
  const {
    setIsSignupOpen,
    setIsSidebarOpen,
    signupFunnelStep,
    setSignupFunnelStep,
  }: any = React.useContext(StateContext);

  const handleClickNext = () => {
    setSignupFunnelStep(signupFunnelStep + 1);
    updateProfile({ funnelState: signupFunnelStep + 1 });
  };

  const handleFinish = () => {
    setIsSignupOpen(false);
    setIsSidebarOpen(true);
  };

  useEffect(() => {
    if (signupFunnelStep > 0 && !isLoggedIn) {
      setSignupFunnelStep(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <h2 className={classes.header}>Sign up and create a free profile</h2>
        <SignupStepper
          activeStep={signupFunnelStep}
          steps={steps}
        ></SignupStepper>

        {signupFunnelStep === 0 && (
          <SignupForm handleClickNext={handleClickNext}></SignupForm>
        )}
        {signupFunnelStep === 1 && isLoggedIn && (
          <VerificationForm
            handleClickNext={handleClickNext}
          ></VerificationForm>
        )}
        {signupFunnelStep === 2 && isLoggedIn && (
          <DataForm handleClickNext={handleClickNext}></DataForm>
        )}
        {signupFunnelStep === 3 && isLoggedIn && (
          <IntegrationForm handleClickNext={handleClickNext}></IntegrationForm>
        )}
        {signupFunnelStep > 3 && isLoggedIn && (
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
