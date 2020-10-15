import React from "react";
import Menu from "@material-ui/core/Menu";
import { withStyles } from "@material-ui/core/styles";
import MenuItem from "@material-ui/core/MenuItem";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";
import { AuthContext } from "../../map/auth";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    menuContainer: {
      margin: `0 17px 0 12px`,
    },
    iconContainer: {
      margin: `0 ${theme.spacing(2)} 0 0`,
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

  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);

  const handleMenuClick = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const { isAuthenticated }: any = React.useContext(AuthContext);

  return (
    <div className={classes.menuContainer}>
      {isAuthenticated ? (
        <>
          <IconButton
            className={classes.iconContainer}
            aria-label="display more actions"
            aria-controls="actions-menu"
            aria-haspopup="true"
            onClick={handleMenuClick}
            color="inherit"
          >
            <AccountCircleIcon />
          </IconButton>
          <StyledMenu
            id="actions-menu"
            anchorEl={menuAnchorEl}
            keepMounted
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem id="btn-profile" onClick={handleMenuClose}>
              Log out
            </MenuItem>
            <MenuItem id="btn-login" onClick={handleMenuClose}>
              Log in
            </MenuItem>
            <MenuItem id="btn-signup" onClick={handleMenuClose}>
              Sign up
            </MenuItem>
            <MenuItem id="btn-logout" onClick={handleMenuClose}>
              Log out
            </MenuItem>
          </StyledMenu>
        </>
      ) : (
        <div className={classes.buttonContainer}>
          <Button className={classes.button} variant="outlined">
            Sign up
          </Button>
          <Button className={classes.button} variant="outlined">
            Log in
          </Button>
        </div>
      )}
    </div>
  );
};
export default ProfileMenu;
