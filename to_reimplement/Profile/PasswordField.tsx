import React, { useState } from 'react'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { FormControl, InputAdornment, OutlinedInput, InputLabel, IconButton, FormHelperText } from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    textField: {
      width: '100%',
      maxWidth: '384px',
      margin: '20px 8px 10px 8px',
    },
  })
)

const PasswordField = (props) => {
  const classes = useStyles({})

  const [showPassword, setShowPassword] = useState(false)

  const handleClickTogglePassword = () => {
    setShowPassword(!showPassword)
  }

  return (
    <FormControl className={classes.textField} variant="outlined">
      <InputLabel color={'secondary'} htmlFor="password">
        Password {props.required && '*'}
      </InputLabel>
      <OutlinedInput
        id={props.id}
        error={props.error}
        onChange={props.onChange}
        type={showPassword ? 'text' : 'password'}
        color={'secondary'}
        label={props.required ? 'Password *' : 'Password'}
        value={props.value}
        endAdornment={
          <InputAdornment position="end">
            <IconButton aria-label="toggle password visibility" onClick={handleClickTogglePassword} size="large">
              {props.showPassword ? <Visibility /> : <VisibilityOff />}
            </IconButton>
          </InputAdornment>
        }
      />
      <FormHelperText>{props.error ? props.errorMsg : ''}</FormHelperText>
    </FormControl>
  )
}

export default PasswordField
