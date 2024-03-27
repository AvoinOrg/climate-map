'use client'

import React, { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import {
  Box,
  ClickAwayListener,
  Grow,
  Menu,
  MenuItem,
  MenuList,
  Paper,
  Popper,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { T } from '@tolgee/react'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import useSWR from 'swr'

import { openWindow } from '#/common/utils/modal'
import { useUserStore } from '#/common/store/userStore'

const profileUrl =
  process.env.NEXT_PUBLIC_ZITADEL_ISSUER + '/ui/console/users/me'

const LoggedInButton = () => {
  const { data: session, status } = useSession()
  const { data: user, error, isLoading } = useSWR('/api/userinfo')
  const signOutActions = useUserStore((state) => state.signOutActions)

  const [open, setOpen] = React.useState(false)
  const anchorRef = React.useRef<HTMLButtonElement>(null)

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen)
  }

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return
    }

    setOpen(false)
  }

  const handleProfileClick = () => {
    openWindow(profileUrl)
    setOpen(false)
  }

  const handleSignoutClick = () => {
    for (const key in signOutActions) {
      signOutActions[key]()
    }
    signOut()
    setOpen(false)
  }

  function handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => {
    if (error) {
      signOut()
    }
  }, [error])

  // return focus to the button when we transitioned from !open -> open
  const prevOpen = React.useRef(open)
  React.useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current!.focus()
    }

    prevOpen.current = open
  }, [open])

  return (
    <>
      <Button
        ref={anchorRef}
        aria-haspopup="true"
        id="navbar-profile-button"
        sx={{ color: 'neutral.lighter', typography: 'h3' }}
        onClick={handleToggle}
      >
        {user ? user.name : session?.user?.name}
      </Button>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-start"
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === 'bottom-start' ? 'left top' : 'left bottom',
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList
                  autoFocusItem={open}
                  id="navbar-profile-menu"
                  aria-labelledby="navbar-profile-button"
                  onKeyDown={handleListKeyDown}
                >
                  <MenuItem onClick={handleProfileClick}>
                    <T keyName={'navbar.profile.settings'}></T>
                  </MenuItem>
                  <MenuItem onClick={handleSignoutClick}>
                    <T keyName={'navbar.profile.sign_out'}></T>
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  )
}

const ActionButton = styled(Button)({
  height: 40,
  display: 'inline',
  width: 90,
  margin: '0 0 0 10px',
  fontSize: '0.9rem',
})

export default LoggedInButton
