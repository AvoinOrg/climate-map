'use client'

import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import { Box, styled } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Link from 'next/link'
import Image from 'next/image'

import { NavBarSearch } from './NavBarSearch'
// import ProfileMenu from './ProfileMenu'
import ActionButtons from './ActionButtons'
// import { UserStateContext, UiStateContext } from '#/components/State'
import { UiStateContext } from '#/components/State'

export const NavBar = () => {
  const { isSidebarOpen, setIsSidebarOpen, isSidebarDisabled }: any = React.useContext(UiStateContext)
  // const { isLoggedIn }: any = React.useContext(UserStateContext)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <AppBar position="fixed" color="primary" sx={(theme) => ({ zIndex: theme.zIndex.appBar })}>
      <Toolbar sx={{ padding: 0, height: 64 }}>
        <IconButton
          onClick={toggleSidebar}
          edge="start"
          sx={(theme) => ({ marginRight: theme.spacing(4), marginLeft: theme.spacing(2), padding: '0 5px 0 5px' })}
          color="inherit"
          aria-label="open drawer"
          disabled={isSidebarDisabled}
          size="large"
        >
          {isSidebarOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>

        <Link href="/" className="neutral-link">
          <StyledImage src={'/img/logo.svg'} alt="Logo" />
        </Link>

        <Box sx={(theme) => ({ position: 'relative', marginRight: theme.spacing(2), marginLeft: 0, width: '100%' })}>
          <a href="https://about.map.avoin.org">
            <IconButton sx={{ padding: 0, margin: '0 0 0 10px' }} color="inherit" size="large">
              <HelpOutlineIcon />
            </IconButton>
          </a>
        </Box>

        <NavBarSearch />

        {/* <Box sx={{ margin: `0 17px 0 12px` }}>{isLoggedIn ? <ProfileMenu /> : <ActionButtons />}</Box> */}
        <Box sx={{ margin: `0 17px 0 12px` }}>{<ActionButtons />}</Box>
      </Toolbar>
    </AppBar>
  )
}

const StyledImage = styled(Image)({
  width: 160,
  padding: '8px 0 0 0',
})
