import React from "react";
import Menu from "@mui/material/Menu";
import withStyles from '@mui/styles/withStyles';
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import { UserContext } from "../User";
import { StateContext } from "../State";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    iconContainer: {
      margin: `0 ${theme.spacing(2)} 0 0`,
    },
    icon: {
      fontSize: "2rem",
    },
    buttonContainer: {
      display: "flex",
    },
    button: {
      height: 40,
      display: "inline",
      width: 85,
      margin: "0 0 0 10px",
      fontSize: 12,
    },
  })
);

const StyledMenu = withStyles({
  paper: {
    width: 200,
  },
})((props: any) => (
  <Menu
    getContentAnchorEl={null}
    keepMounted
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "right",
    }}
    transformOrigin={{
      vertical: -15,
      horizontal: "center",
    }}
    marginThreshold={0}
    {...props}
  />
));

const ProfileMenu = () => {
  const classes = useStyles({});
  const { logout }: any = React.useContext(UserContext);
  const {
    setModalState
  }: any = React.useContext(StateContext);

  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);

  const handleMenuClick = (event) => {
    if (menuAnchorEl) {
      handleMenuClose();
    } else {
      setMenuAnchorEl(event.currentTarget);
    }
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleLogOut = () => {
    handleMenuClose();
    setModalState("none");
    logout();
  };

  return <>
    <IconButton
      className={classes.iconContainer}
      aria-label="display more actions"
      aria-controls="actions-menu"
      aria-haspopup="true"
      onClick={handleMenuClick}
      color="inherit"
      size="large">
      <AccountCircleIcon className={classes.icon} />
    </IconButton>
    <StyledMenu
      id="actions-menu"
      anchorEl={menuAnchorEl}
      keepMounted
      open={Boolean(menuAnchorEl)}
      onClose={handleMenuClose}
    >
      <MenuItem id="btn-logout" onClick={handleLogOut}>
        Log out
      </MenuItem>
    </StyledMenu>
  </>;
};

export default ProfileMenu;
