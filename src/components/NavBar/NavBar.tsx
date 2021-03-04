import React from "react";
// import AppBar from "@material-ui/core/AppBar";
// import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import {
  createStyles,
  Theme,
  makeStyles,
} from "@material-ui/core/styles";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useObservable } from "micro-observables";

// import Logo from "../../logo.svg";
// import HiiliporssiLogo from "../../norppalogo.jpg";
import * as SidebarState from "../Sidebar/SidebarState";
// import { NavBarSearch } from "./NavBarSearch";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    menuIcon: {
      marginRight: theme.spacing(2),
      position: "fixed",
      display: "flex",
      zIndex: 3000,
      backgroundColor: "white",
      borderRadius: 100,
      margin: "14px 0 0 4px",
      boxShadow: "2px 2px 2px 1px rgba(0, 0, 0, 0.2)"
    },
    iconWrapper: {
      margin: "0 0 0 12px",
      backgroundColor: "white",
    },
  })
);

const NavBar = () => {
  const classes = useStyles({});
  const sidebarOpen = useObservable(SidebarState.isOpenObservable);

  return (
    <div className={classes.iconWrapper}>
      <IconButton
        onClick={SidebarState.toggleSidebar}
        edge="start"
        className={classes.menuIcon}
        color="inherit"
        aria-label="open drawer"
      >
        {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>
    </div>
    // <AppBar position="fixed" className={classes.appBar}>
    //   <Toolbar>

    //     <a href="https://www.sll.fi">
    //       <img className={classes.hpLogo} src={HiiliporssiLogo} alt="Logo" />
    //     </a>

    //     <div className={classes.helpWrapper}></div>
    //     <NavBarSearch />
    //     <div className={classes.avoinLogoWrapper}>
    //       <a href="http://about.avoinmap.org">
    //         <img className={classes.logo} src={Logo} alt="Logo" />
    //       </a>
    //     </div>

    //     {/* <IconButton aria-label="display more actions" edge="end" color="inherit" disabled={true}>
    //       <AccountCircleIcon />
    //     </IconButton> */}
    //   </Toolbar>
    // </AppBar>
  );
};
export default NavBar;
