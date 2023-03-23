import * as React from 'react'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'

interface Props {
  label: string
  id: string
  options: string[]
  value: string | undefined
  sx: any
  handleChange: (event: SelectChangeEvent) => void
}

const SelectionMenu = ({ label, id, options, value, sx, handleChange }: Props) => {
  return (
    <FormControl variant="filled" sx={sx}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select labelId={`${id}-label`} id={`${id}`} value={value} onChange={handleChange}>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default SelectionMenu
