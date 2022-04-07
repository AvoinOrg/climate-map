import React from "react";
import Button from "@mui/material/Button";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { StateContext } from "../State";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttonContainer: {
      display: "flex",
      overflow: "visible",
    },
    button: {
      height: 40,
      display: "inline",
      width: 90,
      margin: "0 0 0 10px",
      fontSize: "0.9rem",
    },
  })
);

const ActionButtons = () => {
  const classes = useStyles({});
  const { modalState, setModalState }: any = React.useContext(StateContext);

  const handleLoginClick = () => {
    if (modalState === "login") {
      setModalState("none");
    } else {
      setModalState("login");
    }
  };

  const handleSignupClick = () => {
    if (modalState === "signup") {
      setModalState("none");
    } else {
      setModalState("signup");
    }
  };

  return (
    <div className={classes.buttonContainer}>
      <Button
        className={classes.button}
        onClick={handleSignupClick}
        variant={modalState === "signup" ? "contained" : "outlined"}
        disableElevation
      >
        Sign up
      </Button>
      <Button
        className={classes.button}
        onClick={handleLoginClick}
        variant={modalState === "login" ? "contained" : "outlined"}
        disableElevation
      >
        Log in
      </Button>
    </div>
  );
};
export default ActionButtons;
