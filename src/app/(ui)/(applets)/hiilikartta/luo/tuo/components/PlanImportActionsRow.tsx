import React from 'react'
import { Box, Typography } from '@mui/material'
import { T } from '@tolgee/react'

const InitActionsRow = ({
  onClickAccept,
  isAcceptDisabled,
}: {
  onClickAccept: () => void
  isAcceptDisabled: boolean
}) => {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '25px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        margin: '40px 0 60px 0',
      })}
    >
      <Typography
        typography={'h3'}
        sx={(theme) => ({
          float: 'right',
          ...(isAcceptDisabled
            ? { color: theme.palette.neutral.main }
            : { cursor: 'pointer' }),
        })}
        onClick={isAcceptDisabled ? undefined : onClickAccept}
      >
        <u>
          <T keyName="sidebar.create.accept" ns="hiilikartta" />
        </u>
      </Typography>
    </Box>
  )
}

export default InitActionsRow
