'use client'

import React from 'react'
import Button from '@mui/material/Button'
import { styled } from '@mui/material/styles'
import { T } from '@tolgee/react'
import { openWindow } from '#/common/utils/modal'
import { Tooltip } from '@mui/material'

const LoginButton = () => {
  return (
    <Tooltip title={'Kirjautuminen on toistaiseksi poissa käytöstä.'}>
      <Button
        sx={{ color: 'neutral.lighter', typography: 'h3' }}
        // onClick={() => openWindow('/login')}
      >
        <T keyName="navbar.profile.sign_in" />
      </Button>
    </Tooltip>
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
