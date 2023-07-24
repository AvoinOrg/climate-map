'use client'

import React from 'react'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import { T } from '@tolgee/react'
import { openWindow } from '#/common/utils/modal'

const LoginButton = () => {
  return (
    <Button
      sx={{ color: 'neutral.lighter', typography: 'h3' }}
      onClick={() => openWindow('/login')}
    >
      <T keyName="navbar.profile.signin" />
    </Button>
  )
}

const ActionButton = styled(Button)({
  height: 40,
  display: 'inline',
  width: 90,
  margin: '0 0 0 10px',
  fontSize: '0.9rem',
})

export default LoginButton
