import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import { createStyles, fade, Theme, makeStyles } from '@material-ui/core/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { Link } from 'react-router-dom';
import { useObservable } from 'micro-observables';

import Logo from '../../logo.svg'
import * as SidebarState from '../Sidebar/SidebarState'
import { NavBarSearch } from './NavBarSearch';
import ProfileMenu from './ProfileMenu';
import { FullscreenExit } from '@material-ui/icons';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
    },
    leftWrapper: {
    },
    menuIcon: {
      marginRight: theme.spacing(4),
      marginLeft: theme.spacing(2),
      padding: "0 5px 0 5px",
    },
    helpWrapper: {
      position: 'relative',
      marginRight: theme.spacing(2),
      marginLeft: 0,
      width: '100%',
    },
    helpIcon: {
      padding: 0,
      margin: "0 0 0 10px",
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
      padding: "8px 0 0 0"
    },
    toolBar: {
      padding: 0,
    }
  }),
);

const NavBar = () => {
  const classes = useStyles({});
  const sidebarOpen = useObservable(SidebarState.isOpenObservable)

  return (
    <AppBar position="fixed" className={classes.appBar}>
      <Toolbar className={classes.toolBar}>

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

          <a href='http://about.avoinmap.org'>
            <IconButton
              className={classes.helpIcon}
              color="inherit"
            >
              <HelpOutlineIcon className={classes.HelpOutlineIcon} />
            </IconButton>
          </a>

        </div>

        <NavBarSearch />

        <ProfileMenu />
      </Toolbar>
    </AppBar>
  );
}
export default NavBar

