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
      padding: "150px 0 0 0",
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

// const states = ["data", "data-integrate"];

const Profile = () => {
  const classes = useStyles({});
  const { userProfile, isLoggedIn }: any = React.useContext(UserContext);
  const { profileState, setProfileState }: any = React.useContext(StateContext);

  const handleClickNext = () => {
    setProfileState("data-integrate");
  };

  useEffect(() => {
    if (profileState === "data") {
      if (userProfile && userProfile.funnel_state > 1) {
        setProfileState("data-integrate");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileState]);

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        {profileState === "data" && isLoggedIn && (
          <DataForm handleClickNext={handleClickNext}></DataForm>
        )}
        {profileState === "data-integrate" && isLoggedIn && (
          <IntegrationForm></IntegrationForm>
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

export default Profile;
