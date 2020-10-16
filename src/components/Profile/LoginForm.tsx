import React from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    loginContainer: {},
  })
);

const LoginForm = () => {
  const classes = useStyles({});

  return <div className={classes.loginContainer}></div>;
};

export default LoginForm;
