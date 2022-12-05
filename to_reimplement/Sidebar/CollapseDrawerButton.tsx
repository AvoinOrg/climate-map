import React from 'react';
import clsx from 'clsx';
import { Theme } from '@mui/material/styles';
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { Button } from '@mui/material';
import { ArrowDropDown, ArrowDropUp } from '@mui/icons-material';

interface CollapseDrawerButtonProps {
  onClick: any;
  open: boolean
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    button: {
      'z-index': '9999999',
      transform: 'rotate(90deg)',
      position: 'fixed',
      left: 199,
      top: 80,
      width: 110,
      height: 30,
      'border-radius': '15px 15px 0 0px',
      'background-color': 'white',
      transition: theme.transitions.create(['left'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
    },
    buttonDrawerOpen: {
      left: -40,
    }
  }),
);

export function CollapseDrawerButton(props: CollapseDrawerButtonProps) {
  const { onClick, open } = props;

  const classes = useStyles({});

  return (<Button
    variant="contained"
    disableElevation
    onClick={onClick}
    className={
      clsx(classes.button, {
        [classes.buttonDrawerOpen]: !open
      })}
  >
    {open ? <ArrowDropDown /> : <ArrowDropUp />}
  </Button >
  )
}

export default CollapseDrawerButton
