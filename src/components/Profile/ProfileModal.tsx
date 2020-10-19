import React from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { StateContext } from "../State";
import Login from "./Login";
import Signup from "./Signup";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: "64px 10px 100px 10px",
      zIndex: theme.zIndex.modal,
      backgroundColor: "white",
    },
  })
);

const ProfileModal = () => {
  const { isSignupOpen, isLoginOpen }: any = React.useContext(StateContext);
  const classes = useStyles({});

  return (
    <>
      <div
        className={classes.root}
        style={{ display: isSignupOpen ? "initial" : "none" }}
      >
        <Signup></Signup>
      </div>

      <div
        className={classes.root}
        style={{ display: isLoginOpen ? "initial" : "none" }}
      >
        <Login></Login>
      </div>
    </>
  );
};

export default ProfileModal;
