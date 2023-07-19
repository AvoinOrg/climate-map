'use client'

// TODO: clean up imports and commented out code
import React from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import IconButton from '@mui/material/IconButton'
import { Box, Button } from '@mui/material'
import { styled } from '@mui/material/styles'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import Link from 'next/link'
import Image from 'next/image'

// import { NavBarSearch } from './NavBarSearch'
// import ProfileMenu from './ProfileMenu'
import ActionButtons from './ActionButtons'
import { useUIStore } from '#/common/store'
// import { UserStateContext, UiStateContext } from '#/components/State'

export const NavBar = () => {
  // const { isLoggedIn }: any = React.useContext(UserStateContext)
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const setIsLoginModalOpen = useUIStore((state) => state.setIsLoginModalOpen)
  return (
    // <AppBar position="fixed" color="inherit" sx={(theme) => ({ zIndex: theme.zIndex.appBar, top: 'auto', bottom: 0 })}>
    //   <Toolbar sx={{ padding: '0 0 0 0 !important', height: 64 }}>
    //     <Link href="/" className="neutral-link">
    //       <ImageWrapper>
    //         <Image src={'/img/logo.svg'} alt="Logo" width={160} height={100} />
    //       </ImageWrapper>
    //     </Link>

    //     <Box sx={(theme) => ({ position: 'relative', marginRight: theme.spacing(2), marginLeft: 0, width: '100%' })}>
    //       <a href="https://about.map.avoin.org">
    //         <IconButton sx={{ padding: 0, margin: '0 0 0 10px' }} color="inherit" size="large">
    //           <HelpOutlineIcon />
    //         </IconButton>
    //       </a>
    //     </Box>

    //     {/* <NavBarSearch /> */}

    //     {/* <Box sx={{ margin: `0 17px 0 12px` }}>{isLoggedIn ? <ProfileMenu /> : <ActionButtons />}</Box> */}
    //     <Box sx={{ margin: `0 17px 0 12px` }}>{<ActionButtons />}</Box>
    //   </Toolbar>
    // </AppBar>
    <>
      {isSidebarOpen && (
        <Box
          className="navbar-container"
          sx={(theme) => ({
            zIndex: theme.zIndex.appBar,
            width: '100%',
            minWidth: '200px',
            height: '100px',
            backgroundColor: theme.palette.primary.dark,
            margin: 'auto 0 0 0',
            bottom: 0,
            border: 1,
            borderColor: theme.palette.primary.dark,
            display: 'flex',
            flexDirection: 'row',
            p: 4,
          })}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <Button sx={{ color: 'neutral.lighter', typography: 'h3' }} onClick={() => setIsLoginModalOpen(true)}>
              Kirjaudu
            </Button>
          </Box>
        </Box>
      )}
    </>
  )
}

const ImageWrapper = styled('div')({
  padding: '8px 0 0 0',
})