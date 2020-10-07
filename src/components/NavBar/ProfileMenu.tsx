import React from 'react';
import Menu from '@material-ui/core/Menu';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';
import IconButton from '@material-ui/core/IconButton';
import { createStyles, Theme, makeStyles } from '@material-ui/core/styles';
import AccountCircleIcon from '@material-ui/icons/AccountCircle';


const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        menuContainer: {
            margin: `0 12px 0 12px`
        },
        iconContainer: {
            margin: `0 ${theme.spacing(2)} 0 0`
        }
    })
);

const StyledMenu = withStyles({
    paper: {
        width: 200
    },
})((props: any) => (
    <Menu
        getContentAnchorEl={null}
        keepMounted
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
        }}
        transformOrigin={{
            vertical: -15,
            horizontal: 'center',
        }}
        marginThreshold={0}
        {...props}
    />
));

const ProfileMenu = () => {
    const classes = useStyles({});

    const [menuAnchorEl, setMenuAnchorEl] = React.useState(null);

    const handleClick = (event) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setMenuAnchorEl(null);
    };

    return (
        <div className={classes.menuContainer}>
            <IconButton className={classes.iconContainer} aria-label="display more actions" aria-controls="actions-menu" aria-haspopup="true" onClick={handleClick} color="inherit">
                <AccountCircleIcon />
            </IconButton>
            <StyledMenu
                id="actions-menu"
                anchorEl={menuAnchorEl}
                keepMounted
                open={Boolean(menuAnchorEl)}
                onClose={handleClose}
            >
                <MenuItem id="btn-profile" onClick={handleClose}>Log out</MenuItem>
                <MenuItem id="btn-login" onClick={handleClose}>Log in</MenuItem>
                <MenuItem id="btn-signup" onClick={handleClose}>Sign up</MenuItem>
                <MenuItem id="btn-logout" onClick={handleClose}>Log out</MenuItem>
            </StyledMenu>
        </div>
    );
}
export default ProfileMenu