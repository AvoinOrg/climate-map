import * as React from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { useTranslate } from '@tolgee/react'
import { Autocomplete, SxProps, TextField, Theme } from '@mui/material'

import { SelectOption } from '#/common/types/general'
import { Cross } from '#/components/icons'

interface Props {
  value: SelectOption[]
  options: SelectOption[]
  onChange: (
    event: React.SyntheticEvent<Element, Event>,
    newValue: SelectOption[]
  ) => void
  placeholder?: string
  sx?: SxProps<Theme>
  textFieldSx?: SxProps<Theme>
  optionSx?: SxProps<Theme>
  chipSx?: SxProps<Theme>
}

const MultiSelectAutocomplete = ({
  value,
  options,
  onChange,
  placeholder,
  sx,
  textFieldSx,
  optionSx,
  chipSx,
}: Props) => {
  const { t } = useTranslate('avoin-map')

  return (
    <Autocomplete
      multiple
      value={value}
      sx={[
        {
          border: 'none',
          '& .MuiFormControl-root': {
            border: 'none',
            '& .MuiInputBase-root': {
              border: 'none',
            },
          },
          '& .MuiAutocomplete-noOptions': {
            typography: 'h7',
          },
          '& *': {
            border: 'none !important',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      onChange={onChange}
      options={options}
      noOptionsText={t('components.autocomplete.no_results')}
      getOptionLabel={(option) => option.label}
      clearIcon={null}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index })
          return (
            <Chip
              sx={[
                {
                  borderRadius: 0,
                  typography: 'h5',
                  backgroundColor: 'primary.light',
                },
                ...(Array.isArray(chipSx) ? chipSx : [chipSx]),
              ]}
              label={option.label}
              key={key}
              deleteIcon={
                <Cross
                  sx={{ height: '20px', minHeight: '20px', minWidth: '20px' }}
                />
              }
              {...tagProps}
            />
          )
        })
      }
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={(params) => {
        return (
          <TextField
            placeholder={placeholder}
            sx={{
              border: '1px solid',
              borderColor: 'neutral.main',
              borderRadius: '2px',
              backgroundColor: 'neutral.lighter',
              '& .MuiInputBase-input': {
                typography: 'h8',
              },
              '& .MuiInputBase-input::placeholder': {
                typography: 'h8',
                color: 'neutral.darker',
              },
              ...textFieldSx,
            }}
            {...params}
          />
        )
      }}
      popupIcon={null}
      renderOption={(props, option, state) => {
        return (
          <Box
            sx={[
              (theme) => ({
                typography: 'h8',
                overflow: 'wrap',
                whiteSpace: 'wrap',
                overflowWrap: 'anywhere',
                maxWidth: '100%',
                '&:hover': {
                  backgroundColor: `${theme.palette.primary.light} !important`,
                },
              }),
              ...(Array.isArray(optionSx) ? optionSx : [optionSx]),
            ]}
            component="li"
            {...props}
            key={option.value}
          >
            {option.label}
          </Box>
        )
      }}
    />
  )
}

export default MultiSelectAutocomplete
