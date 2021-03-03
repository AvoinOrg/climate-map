import React from "react";
// import AppBar from "@material-ui/core/AppBar";
// import Toolbar from "@material-ui/core/Toolbar";
// import IconButton from "@material-ui/core/IconButton";
// import {
//   createStyles,
//   fade,
//   Theme,
//   makeStyles,
// } from "@material-ui/core/styles";
// import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
// import ChevronRightIcon from "@material-ui/icons/ChevronRight";
// import { useObservable } from "micro-observables";

// import Logo from "../../logo.svg";
// import HiiliporssiLogo from "../../norppalogo.jpg";
// import * as SidebarState from "../Sidebar/SidebarState";
// import { NavBarSearch } from "./NavBarSearch";

// const useStyles = makeStyles((theme: Theme) =>
//   createStyles({
//     root: {
//       flexGrow: 1,
//     },
//     leftWrapper: {},
//     menuIcon: {
//       marginRight: theme.spacing(2),
//       padding: 0,
//       paddingBottom: 8,
//     },
//     helpWrapper: {
//       position: "relative",
//       marginRight: theme.spacing(2),
//       marginLeft: 0,
//       width: "100%",
//       display: "flex",
//     },
//     helpIcon: {
//       padding: 0,
//       paddingLeft: 10,
//       paddingBottom: 8,
//     },
//     HelpOutlineIcon: {},
//     appBar: {
//       zIndex: theme.zIndex.drawer + 1,
//     },
//     title: {
//       flexGrow: 1,
//       marginLeft: theme.spacing(2),
//       display: "none",
//       minWidth: 100,
//       [theme.breakpoints.up("sm")]: {
//         display: "block",
//       },
//     },
//     search: {
//       position: "relative",
//       borderRadius: theme.shape.borderRadius,
//       backgroundColor: fade(theme.palette.common.white, 0.15),
//       "&:hover": {
//         backgroundColor: fade(theme.palette.common.white, 0.25),
//       },
//       marginLeft: 0,
//       width: "100%",
//       [theme.breakpoints.up("sm")]: {
//         marginLeft: theme.spacing(1),
//         width: "auto",
//       },
//     },
//     searchIcon: {
//       width: theme.spacing(7),
//       height: "100%",
//       position: "absolute",
//       pointerEvents: "none",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//     },
//     inputRoot: {
//       color: "inherit",
//     },
//     inputInput: {
//       padding: theme.spacing(1, 1, 1, 7),
//       transition: theme.transitions.create("width"),
//       width: "100%",
//       [theme.breakpoints.up("sm")]: {
//         width: 120,
//         "&:focus": {
//           width: 200,
//         },
//       },
//     },
//     hpLogo: {
//       paddingTop: 5,
//       width: 280,
//       [theme.breakpoints.down("xs")]: {
//         width: 150,
//       },
//     },
//     logo: {
//       paddingTop: 5,
//       width: 195,
//     },
//     avoinLogoWrapper: {
//       position: "absolute",
//       top: 75,
//       right: theme.spacing(2),
//       [theme.breakpoints.down("xs")]: {
//         top: 70,
//       },
//     },
//   })
// );

const NavBar = () => {
  // const classes = useStyles({});
  // const sidebarOpen = useObservable(SidebarState.isOpenObservable);

  return (
    <></>
    // <AppBar position="fixed" className={classes.appBar}>
    //   <Toolbar>
    //     <IconButton
    //       onClick={SidebarState.toggleSidebar}
    //       edge="start"
    //       className={classes.menuIcon}
    //       color="inherit"
    //       aria-label="open drawer"
    //     >
    //       {sidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    //     </IconButton>

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
