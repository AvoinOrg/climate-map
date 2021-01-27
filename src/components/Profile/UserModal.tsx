import React from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import Close from "@material-ui/icons/Close";

import { StateContext } from "../State";
import Login from "./Login";
import Signup from "./Signup";
import Profile from "./Profile";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: "64px 10px 200px 10px",
      zIndex: theme.zIndex.modal,
      backgroundColor: "white",
      overflowY: "auto",
    },
    closeIconContainer: {
      position: "absolute",
      top: "94px",
      right: "30px",
    },
    closeIcon: {
      fontSize: "1.5rem",
    },
    pane: {},
  })
);

const UserModal = () => {
  const {
    isSignupOpen,
    isLoginOpen,
    isProfileOpen,
    setIsProfileOpen,
    setIsLoginOpen,
    setIsSignupOpen,
  }: any = React.useContext(StateContext);

  const classes = useStyles({});

  const handleCloseClick = () => {
    setIsProfileOpen(false);
    setIsLoginOpen(false);
    setIsSignupOpen(false);
  };

  return (
    <div
      className={classes.root}
      style={{
        display:
          isSignupOpen || isLoginOpen || isProfileOpen ? "initial" : "none",
      }}
    >
      <IconButton
        className={classes.closeIconContainer}
        aria-label="display more actions"
        aria-controls="actions-menu"
        aria-haspopup="true"
        onClick={handleCloseClick}
        color="inherit"
      >
        <Close className={classes.closeIcon} />
      </IconButton>
      <div
        className={classes.pane}
        style={{ display: isSignupOpen ? "initial" : "none" }}
      >
        <Signup></Signup>
      </div>

      <div
        className={classes.pane}
        style={{ display: isLoginOpen ? "initial" : "none" }}
      >
        <Login></Login>
      </div>
      <div
        className={classes.pane}
        style={{ display: isProfileOpen ? "initial" : "none" }}
      >
        <Profile></Profile>
      </div>
    </div>
  );
};

export default UserModal;
