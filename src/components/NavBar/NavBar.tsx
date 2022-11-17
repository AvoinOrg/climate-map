'use client'

import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Box } from '@mui/material'
import Link from 'next/link'
import Image from 'next/image'

import { NavBarSearch } from './NavBarSearch'
import ProfileMenu from './ProfileMenu'
import ActionButtons from './ActionButtons'
import { UserStateContext, UiStateContext } from '#/components/State'

export const NavBar = () => {
  const { isSidebarOpen, setIsSidebarOpen, isSidebarDisabled }: any = React.useContext(UiStateContext)
  const { isLoggedIn }: any = React.useContext(UserStateContext)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <AppBar
      position="fixed"
      color="primary"
      sx={{
        zIndex: 'zIndex.appBar',
      }}
    >
      <Toolbar
        sx={{
          padding: 0,
          height: 64,
        }}
      >
        <IconButton
          onClick={toggleSidebar}
          edge="start"
          sx={{
            marginRight: 4,
            marginLeft: 2,
            padding: '0 5px 0 5px',
          }}
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

        <Box
          sx={{
            position: 'relative',
            marginRight: 2,
            marginLeft: 0,
            width: '100%',
          }}
        >
          <a href="https://about.map.avoin.org">
            <IconButton sx={{ padding: 0, margin: '0 0 0 10px' }} color="inherit" size="large">
              <HelpOutlineIcon />
            </IconButton>
          </a>
        </Box>

        <NavBarSearch />

        <div>{isLoggedIn ? <ProfileMenu /> : <ActionButtons />}</div>
      </Toolbar>
    </AppBar>
  )
}

const StyledImage = styled(Image)(({ theme }) => ({
  width: 160,
  padding: '8px 0 0 0',
}))
