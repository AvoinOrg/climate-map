import React from "react";

import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    signupContainer: {},
  })
);

const SignupForm = () => {
  const classes = useStyles({});

  return <div className={classes.signupContainer}></div>;
};

export default SignupForm;
