import React from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { StateContext } from "../State";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    modalContainer: {
      position: "fixed",
      top: 64,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: theme.zIndex.modal,
      backgroundColor: "white",
    },
  })
);

const ProfileModal = () => {
  const { isSignupFormOpen, isLoginFormOpen }: any = React.useContext(
    StateContext
  );
  const classes = useStyles({});

  return (
    <>
      <div
        className={classes.modalContainer}
        style={{ display: isSignupFormOpen ? "initial" : "none" }}
      >
        <SignupForm></SignupForm>
      </div>

      <div
        className={classes.modalContainer}
        style={{ display: isLoginFormOpen ? "initial" : "none" }}
      >
        <LoginForm></LoginForm>
      </div>
    </>
  );
};

export default ProfileModal;
