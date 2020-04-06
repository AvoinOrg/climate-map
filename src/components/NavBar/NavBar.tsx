import React, { useRef, useEffect } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import InputBase from '@material-ui/core/InputBase';
import { createStyles, fade, Theme, makeStyles } from '@material-ui/core/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import SearchIcon from '@material-ui/icons/Search';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import { Link } from 'react-router-dom';
import { useObservable } from 'micro-observables';

import Logo from '../../logo.svg'
import {map, getGeocoder} from '../../map/map'
import * as SidebarState from '../Sidebar/SidebarState'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    leftWrapper: {
    },
    menuIcon: {
      marginRight: theme.spacing(2),
      padding: 0,
      paddingBottom: 8,
    },
    helpWrapper: {
      position: 'relative',
      marginRight: theme.spacing(2),
      marginLeft: 0,
      width: '100%',
    },
    helpIcon: {
      padding: 0,
      paddingLeft: 10,
      paddingBottom: 8,
    },
    HelpOutlineIcon: {
    },
    appBar: {
      zIndex: theme.zIndex.drawer + 1,
    },
    title: {
      flexGrow: 1,
      marginLeft: theme.spacing(2),
      display: 'none',
      minWidth: 100,
      [theme.breakpoints.up('sm')]: {
        display: 'block',
      },
    },
    search: {
      position: 'relative',
      borderRadius: theme.shape.borderRadius,
      backgroundColor: fade(theme.palette.common.white, 0.15),
      '&:hover': {
        backgroundColor: fade(theme.palette.common.white, 0.25),
      },
      marginLeft: 0,
      width: '100%',
      [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(1),
        width: 'auto',
      },
    },
    searchIcon: {
      width: theme.spacing(7),
      height: '100%',
      position: 'absolute',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    inputRoot: {
      color: 'inherit',
    },
    inputInput: {
      padding: theme.spacing(1, 1, 1, 7),
      transition: theme.transitions.create('width'),
      width: '100%',
      [theme.breakpoints.up('sm')]: {
        width: 120,
        '&:focus': {
          width: 200,
        },
      },
    },
    logo: {
      width: 160,
    },
  }),
);

const NavBar = () => {
  const classes = useStyles({});
  const sidebarOpen = useObservable(SidebarState.isOpenObservable)

  const geocoderSearchRef = useRef(null)
  useEffect(() => {
    const geocoder = getGeocoder()
    if (geocoder) geocoderSearchRef.current.appendChild(geocoder.onAdd(map))
  }, [geocoderSearchRef])

  return (
    <AppBar position="fixed" className={classes.appBar}>
      <Toolbar>

        <IconButton
          onClick={SidebarState.toggleSidebar}
          edge="start"
          className={classes.menuIcon}
          color="inherit"
          aria-label="open drawer"
        >
          {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>

        <Link to='/' className='neutral-link'>
          <img className={classes.logo} src={Logo} alt="Logo" />
        </Link>

        <div className={classes.helpWrapper}>

          <IconButton
            className={classes.helpIcon}
            color="inherit"
          >
            <HelpOutlineIcon className={classes.HelpOutlineIcon} />
          </IconButton>

        </div>

        <div className={classes.search} hidden={true}>
          <div className={classes.searchIcon}>
            <SearchIcon />
          </div>
          <InputBase
            placeholder="Search…"
            classes={{
              root: classes.inputRoot,
              input: classes.inputInput,
            }}
            type="search"
            inputProps={{ 'aria-label': 'search' }}
            id='geocoder'
          />
        </div>

        <div ref={geocoderSearchRef}/>

        <IconButton aria-label="display more actions" edge="end" color="inherit" disabled={true}>
          <AccountCircleIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
export default NavBar

