import React from 'react'
import { Box, IconButton } from '@mui/material'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'

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
      <IconButton onClick={onClickNext}>
        <ArrowForwardIosIcon
          sx={(theme) => ({ float: 'right', cursor: 'pointer' })}
        ></ArrowForwardIosIcon>
      </IconButton>
    </Box>
  )
}

export default InitActionsRow
