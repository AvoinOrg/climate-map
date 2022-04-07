import React, { useState } from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import {
  TextField,
  FormControl,
  OutlinedInput,
  InputLabel,
  FormHelperText,
} from "@mui/material";

import { UserContext } from "../User";
import { StateContext } from "../State";
import { NextButton } from "./Signup";
import PasswordField from "./PasswordField";

const passwordRegex = /^([a-zd!@#$%^&*-_~,./€£]){8,64}$/;
const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
    },
    form: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-around",
      width: "100%",
      margin: "60px 0 0 0",
    },
    textField: {
      width: "100%",
      maxWidth: "384px",
      margin: "20px 8px 10px 8px",
    },
    errorMsg: {
      textAlign: "center",
      fontSize: "18px",
      color: "red",
    },
    separatorContainer: {
      padding: "85px 8px 0 8px",
      width: "100%",
    },
    separator: {
      width: "100%",
      borderTop: "solid 3px " + theme.palette.grey[300],
    },
    loginText: {
      fontFamily: theme.typography.fontFamily[0],
      fontWeight: 300,
      fontSize: "16px",
      textAlign: "center",
    },
    loginTextLink: {
      fontFamily: theme.typography.fontFamily[0],
      fontWeight: 300,
      fontSize: "16px",
      textAlign: "center",
      "&:hover": {
        cursor: "pointer",
      },
    },
  })
);

const defaultValues = {
  email: "",
  password: "",
  name: "",
  phoneNumber: "",
  accountType: "Landowner",
};

const SignupForm = (props) => {
  const classes = useStyles({});
  const { signup }: any = React.useContext(UserContext);
  const { setModalState }: any = React.useContext(StateContext);

  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [bigError, setBigError] = useState("");

  const [values, setValues] = useState(defaultValues);

  const [errors, setErrors] = useState({
    email: false,
    password: false,
  });

  const validators = {
    email: (value) => {
      if (value.match(emailRegex)) {
        return false;
      }
      return true;
    },
    password: (value) => {
      if (value.match(passwordRegex)) {
        return false;
      }
      return true;
    },
  };

  const handleValueChange = (event) => {
    const newValues = { ...values };
    const id = event.target.id;
    const value = event.target.value;
    newValues[id] = value;
    setValues(newValues);
    bigError && setBigError("");

    let error = false;
    const newErrors = { ...errors };

    if (validators.hasOwnProperty(id)) {
      error = validators[id](value);
      newErrors[id] = error;
      setErrors(newErrors);
    }

    for (const key in newErrors) {
      if (newErrors[key]) {
        !isButtonDisabled && setIsButtonDisabled(true);
        return;
      }
    }

    if (newValues.password && newValues.email) {
      isButtonDisabled && setIsButtonDisabled(false);
    }
  };

  const handleClickNext = async () => {
    setIsButtonDisabled(true);
    bigError && setBigError("");

    try {
      await signup(values);
    } catch (error: any) {
      if (error.status && error.status === 409) {
        setBigError("Email address is already in use.");
      } else {
        setBigError("Sorry, something went wrong.");
      }

      setIsButtonDisabled(false);
      return;
    }

    setValues(defaultValues);
    props.handleClickNext();
  };

  const handleClickLogin = async () => {
    setModalState("login");
  };

  return (
    <div className={classes.root}>
      <p className={classes.loginText}>
        Already have an account?{" "}
        <u className={classes.loginTextLink} onClick={handleClickLogin}>
          Log in by clicking here.
        </u>
      </p>
      <form className={classes.form} noValidate autoComplete="off">
        <FormControl className={classes.textField} variant="outlined">
          <InputLabel color={"secondary"} htmlFor="password">
            Email address *
          </InputLabel>
          <OutlinedInput
            id="email"
            error={errors.email}
            onChange={handleValueChange}
            value={values.email}
            color={"secondary"}
            labelWidth={108}
          />
          <FormHelperText>{"Used for logging in."}</FormHelperText>
        </FormControl>
        <PasswordField
          error={errors.password}
          errorMsg={"Between 8 and 64 characters."}
          onChange={handleValueChange}
          value={values.password}
          required={true}
          id={"password"}
        ></PasswordField>
        <TextField
          className={classes.textField}
          id="name"
          label="Name"
          variant="outlined"
          color={"secondary"}
          onChange={handleValueChange}
          value={values.name}
        />
        <TextField
          className={classes.textField}
          id="phoneNumber"
          label="Phone number"
          variant="outlined"
          color={"secondary"}
          onChange={handleValueChange}
          value={values.phoneNumber}
        />
      </form>
      {bigError && <p className={classes.errorMsg}>{bigError}</p>}
      {/* <div className={classes.separatorContainer}>
        <div className={classes.separator} />
      </div> */}
      <NextButton onClick={handleClickNext} disabled={isButtonDisabled} />
    </div>
  );
};

export default SignupForm;
