import * as React from 'react'
import { Theme, useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import Chip from '@mui/material/Chip'
import { find } from 'lodash-es'

import { SelectOption } from '#/common/types/general'

const ITEM_HEIGHT = 48
const ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
}

function getStyles(name: string, personName: readonly string[], theme: Theme) {
  return {
    fontWeight:
      personName.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  }
}

const findLabelByValue = (valueToFind: string, data: SelectOption[]) => {
  const item = find(data, { value: valueToFind })
  return item ? item.label : undefined
}

interface Props {
  value: string[]
  options: SelectOption[]
  onChange: (event: SelectChangeEvent<string[]>) => void
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
    <FormControl sx={{ ...sx }}>
      <InputLabel id="multiple-chip-label">Chip</InputLabel>
      <Select
        labelId="multiple-chip-label"
        id="multiple-chip"
        multiple
        value={value}
        onChange={onChange}
        input={<OutlinedInput id="select-multiple-chip" label="Chip" />}
        renderValue={(selected) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selected.map((value) => (
              <Chip key={value} label={findLabelByValue(value, options)} />
            ))}
          </Box>
        )}
        MenuProps={MenuProps}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            style={getStyles(option.value, value, theme)}
            sx={{ ...optionSx }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default MultiSelectChip
