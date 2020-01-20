import React from 'react';
import clsx from 'clsx';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import { Button } from '@material-ui/core';
import { ArrowDropDown, ArrowDropUp } from '@material-ui/icons';

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
