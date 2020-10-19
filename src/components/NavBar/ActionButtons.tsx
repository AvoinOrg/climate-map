import React from "react";
import Button from "@material-ui/core/Button";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
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
  const {
    isSignupOpen,
    setIsSignupOpen,
    isLoginOpen,
    setIsLoginOpen,
    setIsSidebarDisabled
  }: any = React.useContext(StateContext);

  const handleLoginClick = (event) => {
    setIsSidebarDisabled(!isLoginOpen)
    setIsLoginOpen(!isLoginOpen);
    setIsSignupOpen(false);
  };

  const handleSignupClick = (event) => {
    setIsSidebarDisabled(!isSignupOpen)
    setIsSignupOpen(!isSignupOpen);
    setIsLoginOpen(false);
  };

  return (
    <div className={classes.buttonContainer}>
      <Button
        className={classes.button}
        onClick={handleSignupClick}
        variant={isSignupOpen ? "contained" : "outlined"}
        disableElevation
      >
        Sign up
      </Button>
      <Button
        className={classes.button}
        onClick={handleLoginClick}
        variant={isLoginOpen ? "contained" : "outlined"}
        disableElevation
      >
        Log in
      </Button>
    </div>
  );
};
export default ActionButtons;
