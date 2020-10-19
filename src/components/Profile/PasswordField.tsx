import React, { useState } from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import {
  FormControl,
  InputAdornment,
  OutlinedInput,
  InputLabel,
  IconButton,
  FormHelperText,
} from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    textField: {
      width: "100%",
      maxWidth: "384px",
      margin: "20px 8px 10px 8px",
    },
  })
);

const PasswordField = (props) => {
  const classes = useStyles({});

  const [showPassword, setShowPassword] = useState(false);

  const handleClickTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <FormControl className={classes.textField} variant="outlined">
      <InputLabel color={"secondary"} htmlFor="password">
        Password *
      </InputLabel>
      <OutlinedInput
        id="password"
        error={props.error}
        onChange={props.onChange}
        type={showPassword ? "text" : "password"}
        color={"secondary"}
        labelWidth={78}
        value={props.value}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={handleClickTogglePassword}
            >
              {props.showPassword ? <Visibility /> : <VisibilityOff />}
            </IconButton>
          </InputAdornment>
        }
      />
      <FormHelperText>
        {props.error ? props.errorMsg : ""}
      </FormHelperText>
    </FormControl>
  );
};

export default PasswordField;
