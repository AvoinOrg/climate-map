import * as React from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import { Autocomplete, TextField } from '@mui/material'

import { SelectOption } from '#/common/types/general'

interface Props {
  value: SelectOption[]
  options: SelectOption[]
  onChange: (
    event: React.SyntheticEvent<Element, Event>,
    newValue: SelectOption[]
  ) => void
  sx?: any
  optionSx?: any
  iconSx?: any
}

const MultiSelectChip = ({
  value,
  options,
  onChange,
  sx,
  optionSx,
  iconSx,
}: Props) => {
  const theme = useTheme()

  return (
    <Autocomplete
      multiple
      id="fixed-tags-demo"
      value={value}
      sx={sx}
      onChange={onChange}
      options={options}
      noOptionsText={t('components.autocomplete.no_results')}
      getOptionLabel={(option) => option.label}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => {
          const { key, ...tagProps } = getTagProps({ index })
          return <Chip label={option.label} key={key} {...tagProps} />
        })
      }
      style={{ width: 500 }}
      isOptionEqualToValue={(option, value) => option.value === value.value}
      renderInput={(params) => {
        return (
          <TextField {...params} label="Fixed tag" placeholder="Favorites" />
        )
      }}
      renderOption={(props, option) => {
        return (
          <Box
            sx={
              {
                // margin: '5px',
              }
            }
            component="li"
            {...props}
            {...optionSx}
            key={option.value}
          >
            {option.label}
          </Box>
        )
      }}
    />
  )
}

export default MultiSelectChip
