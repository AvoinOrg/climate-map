import React from "react";
import Menu from "@material-ui/core/Menu";
import { withStyles } from "@material-ui/core/styles";
import MenuItem from "@material-ui/core/MenuItem";
import IconButton from "@material-ui/core/IconButton";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";

import { UserContext } from "../User";

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
    logout();
  };

  return (
    <>
      <IconButton
        className={classes.iconContainer}
        aria-label="display more actions"
        aria-controls="actions-menu"
        aria-haspopup="true"
        onClick={handleMenuClick}
        color="inherit"
      >
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
    </>
  );
};

export default ProfileMenu;
