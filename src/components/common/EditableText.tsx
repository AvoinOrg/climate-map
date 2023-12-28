import React, { useLayoutEffect, useState } from 'react'
import {
  SxProps,
  Theme,
  TextField,
  Typography,
  Box,
  InputAdornment,
  IconButton,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

interface Props {
  value: string
  onChange: (event: any) => void
  valueAppendix?: string
  sx?: SxProps<Theme>
  textSx?: SxProps<Theme>
  iconSx?: SxProps<Theme>
}

const EditableText = ({
  value,
  onChange,
  valueAppendix,
  sx,
  textSx,
  iconSx,
}: Props) => {
  const [internalValue, setInternalValue] = useState(value)
  const [isValueFocused, setIsInputFocused] = useState(false)
  const isCanceledRef = React.useRef(false)

  useLayoutEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleCancel = (event: any) => {
    isCanceledRef.current = true
    setInternalValue(value) // Revert to original value
    setIsInputFocused(false)
    event.stopPropagation()
  }

  const handleAccept = (event: any) => {
    handleChange({ target: { value: internalValue } })
    event.stopPropagation()
  }

  const handleChange = (event: any) => {
    setIsInputFocused(false)
    onChange(event)
  }

  const handleBlur = () => {
    setTimeout(() => {
      if (isCanceledRef.current) {
        isCanceledRef.current = false
        return
      }
      handleChange({ target: { value: internalValue } })
    }, 100) // Delay to allow click event to be registered
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      handleChange({ target: { value: internalValue } })
    }
  }

  const handleEditClick = (event: any) => {
    event.stopPropagation()
    setIsInputFocused(true)
  }

  const handleInputChange = (event: any) => {
    setInternalValue(event.target.value)
  }

  return (
    <Box
      sx={[
        {
          display: 'flex',
          alignItems: 'start',
          width: '100%',
          justifyContent: 'flex-start',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {!isValueFocused ? (
        <>
          <Typography
            sx={[
              {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                // float: "left",
              },
              ...(Array.isArray(textSx) ? textSx : [textSx]),
            ]}
            // onClick={(event) => {
            //   event?.stopPropagation()
            //   setIsInputFocused(true)
            // }}
          >
            {`${value}${valueAppendix ?? ''}`}
          </Typography>
          <IconButton
            disableRipple
            onClick={handleEditClick}
            sx={{ ml: 1, p: 0, height: '100%' }}
          >
            <EditIcon
              sx={[
                {
                  fontSize: '19px',
                  color: 'neutral.dark',
                  '&:hover': {
                    color: 'neutral.darker',
                  },
                },
                ...(Array.isArray(iconSx) ? iconSx : [iconSx]),
              ]}
            />
          </IconButton>
        </>
      ) : (
        <TextField
          autoFocus
          sx={{ p: 0, m: 0, width: '100%' }}
          inputProps={{
            sx: [
              { m: 0, p: 0, height: '100%' },
              ...(Array.isArray(textSx) ? textSx : [textSx]),
            ],
          }} // Use inline styles for inputProps
          value={internalValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
          variant="standard"
          onFocus={(event) => {
            event.stopPropagation()
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  disableRipple
                  sx={{
                    height: '100%',
                    color: 'neutral.dark',
                    '&:hover': {
                      color: 'neutral.darker',
                    },
                  }}
                  onClick={handleAccept}
                >
                  <CheckIcon
                    sx={[
                      { fontSize: '19px' },
                      ...(Array.isArray(iconSx) ? iconSx : [iconSx]),
                    ]}
                  />
                </IconButton>
                <IconButton
                  disableRipple
                  sx={{
                    p: 0,
                    height: '100%',
                    color: 'neutral.dark',
                    '&:hover': {
                      color: 'neutral.darker',
                    },
                  }}
                  onClick={handleCancel}
                >
                  <CloseIcon
                    sx={[
                      { fontSize: '19px' },
                      ...(Array.isArray(iconSx) ? iconSx : [iconSx]),
                    ]}
                  />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      )}
    </Box>
  )
}

export default EditableText
