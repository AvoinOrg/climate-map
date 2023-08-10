'use client'

import React from 'react'
import Button from '@mui/material/Button'
import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useSession } from 'next-auth/react'

import LoggedInButton from './LoggedInButton'
import LoginButton from './LoginButton'

const UserButtons = () => {
  const { data: session, status } = useSession()

  return (
    <>
      {status === 'authenticated' ? (
        <Box>
          <LoggedInButton></LoggedInButton>
        </Box>
      ) : (
        <LoginButton></LoginButton>
      )}
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

export default UserButtons
