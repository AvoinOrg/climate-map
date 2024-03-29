import React from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import {
  createStyles,
  alpha,
  Theme,
  makeStyles,
} from "@material-ui/core/styles";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import { Link } from "react-router-dom";

import Logo from "../../logo.svg";
import { NavBarSearch } from "./NavBarSearch";
import ProfileMenu from "./ProfileMenu";
import ActionButtons from "./ActionButtons";
import { UserContext } from "../User";
import { StateContext } from "../State";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    menuContainer: {
      margin: `0 17px 0 12px`,
    },
    root: {
      flexGrow: 1,
    },
    leftWrapper: {},
    menuIcon: {
      marginRight: theme.spacing(4),
      marginLeft: theme.spacing(2),
      padding: "0 5px 0 5px",
    },
    helpWrapper: {
      position: "relative",
      marginRight: theme.spacing(2),
      marginLeft: 0,
      width: "100%",
    },
    helpIcon: {
      padding: 0,
      margin: "0 0 0 10px",
    },
    HelpOutlineIcon: {},
    appBar: {
      zIndex: theme.zIndex.appBar,
    },
    title: {
      flexGrow: 1,
      marginLeft: theme.spacing(2),
      display: "none",
      minWidth: 100,
      [theme.breakpoints.up("sm")]: {
        display: "block",
      },
    },
    search: {
      position: "relative",
      borderRadius: theme.shape.borderRadius,
      backgroundColor: alpha(theme.palette.common.white, 0.15),
      "&:hover": {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
      },
      marginLeft: 0,
      width: "100%",
      [theme.breakpoints.up("sm")]: {
        marginLeft: theme.spacing(1),
        width: "auto",
      },
    },
    searchIcon: {
      width: theme.spacing(7),
      height: "100%",
      position: "absolute",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    inputRoot: {
      color: "inherit",
    },
    inputInput: {
      padding: theme.spacing(1, 1, 1, 7),
      transition: theme.transitions.create("width"),
      width: "100%",
      [theme.breakpoints.up("sm")]: {
        width: 120,
        "&:focus": {
          width: 200,
        },
      },
    },
    logo: {
      width: 160,
      padding: "8px 0 0 0",
    },
    toolBar: {
      padding: 0,
      height: 64,
    },
  })
);

const NavBar = () => {
  const classes = useStyles({});
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarDisabled,
  }: any = React.useContext(StateContext);
  const { isLoggedIn }: any = React.useContext(UserContext);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <AppBar position="fixed" className={classes.appBar}>
      <Toolbar className={classes.toolBar}>
        <IconButton
          onClick={toggleSidebar}
          edge="start"
          className={classes.menuIcon}
          color="inherit"
          aria-label="open drawer"
          disabled={isSidebarDisabled}
        >
          {isSidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>

        <Link to="/" className="neutral-link">
          <img className={classes.logo} src={Logo} alt="Logo" />
        </Link>

        <div className={classes.helpWrapper}>
          <a href="https://about.map.avoin.org">
            <IconButton className={classes.helpIcon} color="inherit">
              <HelpOutlineIcon className={classes.HelpOutlineIcon} />
            </IconButton>
          </a>
        </div>

        <NavBarSearch />

        <div className={classes.menuContainer}>
          {isLoggedIn ? <ProfileMenu /> : <ActionButtons />}
        </div>
      </Toolbar>
    </AppBar>
  );
};
export default NavBar;
