import React from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import IconButton from "@mui/material/IconButton";
import Close from "@mui/icons-material/Close";

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
      padding: "64px 10px 20px 10px",
      zIndex: theme.zIndex.modal,
      backgroundColor: "white",
      overflowY: "scroll",
    },
    closeIconContainer: {
      position: "absolute",
      top: "94px",
      right: "30px",
      zIndex: theme.zIndex.modal + 1,
    },
    closeIcon: {
      fontSize: "1.5rem",
    },
    pane: {
      position: "fixed",
      top: 64,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      flexDirection: "column",
      backgroundColor: "white",
      overflow: "auto",
      padding: "0 0 128px 0",
    },
  })
);

const UserModal = () => {
  const { modalState, setModalState }: any =
    React.useContext(StateContext);

  const classes = useStyles({});

  const handleCloseClick = () => {
    setModalState("none");
  };

  return (
    <div
      className={classes.root}
      style={{
        display:
          modalState !== "none" ? "flex" : "none",
      }}
    >
      <IconButton
        className={classes.closeIconContainer}
        aria-label="display more actions"
        aria-controls="actions-menu"
        aria-haspopup="true"
        onClick={handleCloseClick}
        color="inherit"
        size="large">
        <Close className={classes.closeIcon} />
      </IconButton>
      <div
        className={classes.pane}
        style={{ display: modalState === "signup" ? "flex" : "none" }}
      >
        <Signup></Signup>
      </div>

      <div
        className={classes.pane}
        style={{ display: modalState === "login" ? "flex" : "none" }}
      >
        <Login></Login>
      </div>
      <div
        className={classes.pane}
        style={{ display: modalState === "profile" ? "flex" : "none" }}
      >
        <Profile></Profile>
      </div>
    </div>
  );
};

export default UserModal;
