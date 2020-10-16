import React from "react";
import Button from "@material-ui/core/Button";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { StateContext } from "../State";

const useStyles = makeStyles((Theme) =>
  createStyles({
    buttonContainer: {
      display: "flex",
      overflow: "visible",
    },
    button: {
      height: 40,
      display: "inline",
      width: 85,
      margin: "0 0 0 10px",
      fontSize: 12,
    },
  })
);

const ActionButtons = () => {
  const classes = useStyles({});
  const {
    isSignupFormOpen,
    setIsSignupFormOpen,
    isLoginFormOpen,
    setIsLoginFormOpen,
    setIsSidebarDisabled
  }: any = React.useContext(StateContext);

  const handleLoginClick = (event) => {
    setIsSidebarDisabled(!isLoginFormOpen)
    setIsLoginFormOpen(!isLoginFormOpen);
    setIsSignupFormOpen(false);
  };

  const handleSignupClick = (event) => {
    setIsSidebarDisabled(!isSignupFormOpen)
    setIsSignupFormOpen(!isSignupFormOpen);
    setIsLoginFormOpen(false);
  };

  return (
    <div className={classes.buttonContainer}>
      <Button
        className={classes.button}
        onClick={handleSignupClick}
        variant={isSignupFormOpen ? "contained" : "outlined"}
        disableElevation
      >
        Sign up
      </Button>
      <Button
        className={classes.button}
        onClick={handleLoginClick}
        variant={isLoginFormOpen ? "contained" : "outlined"}
        disableElevation
      >
        Log in
      </Button>
    </div>
  );
};
export default ActionButtons;
