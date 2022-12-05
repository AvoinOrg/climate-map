import React from 'react'
import { Menu } from '@mui/material'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'

// import { UserStateContext, UiStateContext } from '#/components/State'
import { UiStateContext } from '#/components/State'

const ProfileMenu = () => {
  // const { logout }: any = React.useContext(UserStateContext)
  const { setModalState }: any = React.useContext(UiStateContext)

  const [menuAnchorEl, setMenuAnchorEl] = React.useState(null)

  const handleMenuClick = (event: any) => {
    if (menuAnchorEl) {
      handleMenuClose()
    } else {
      setMenuAnchorEl(event.currentTarget)
    }
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  const handleLogOut = () => {
    handleMenuClose()
    setModalState('none')
    // logout()
  }

  return (
    <>
      <IconButton
        sx={(theme) => ({ margin: `0 ${theme.spacing(2)} 0 0` })}
        aria-label="display more actions"
        aria-controls="actions-menu"
        aria-haspopup="true"
        onClick={handleMenuClick}
        color="inherit"
        size="large"
      >
        <AccountCircleIcon
          sx={{
            fontSize: '2rem',
          }}
        />
      </IconButton>
      <Menu
        sx={{ paper: { width: 200 } }}
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
        id="actions-menu"
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem id="btn-logout" onClick={handleLogOut}>
          Log out
        </MenuItem>
      </Menu>
    </>
  )
}

export default ProfileMenu
