import React, { useRef, useEffect } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import InputBase from '@material-ui/core/InputBase';
import { createStyles, fade, Theme, makeStyles } from '@material-ui/core/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import SearchIcon from '@material-ui/icons/Search';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';
import {map, getGeocoder} from '../../map/map'

import Logo from './logo.svg'
import { Link } from 'react-router-dom';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    leftWrapper: {
    },
    menuIcon: {
      marginRight: theme.spacing(2),
    },
    helpWrapper: {
      position: 'relative',
      marginRight: theme.spacing(2),
      marginLeft: 0,
      width: '100%',
    },
    helpIcon: {
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
      maxWidth: 200,
    },
  }),
);

const NavBar = ({ toggleSidebar, sidebarOpen }) => {
  const classes = useStyles({});

  const geocoderSearchRef = useRef(null)
  useEffect(() => {
    const geocoder = getGeocoder()
    if (geocoder) geocoderSearchRef.current.appendChild(geocoder.onAdd(map))
  }, [geocoderSearchRef])

  return (
    <AppBar position="fixed" className={classes.appBar}>
      <Toolbar>

        <IconButton
          onClick={toggleSidebar}
          edge="start"
          className={classes.menuIcon}
          color="inherit"
          aria-label="open drawer"
        >
          {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>

        <img className={classes.logo} src={Logo} alt="Logo" />

        <Link to='/' className='neutral-link'>
          <Typography className={classes.title} variant="h6">Avoin Map</Typography>
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
            // onChange={... TODO}
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

