import * as React from 'react'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'
import Select, { SelectChangeEvent } from '@mui/material/Select'

interface Props {
  id: string
  options: string[]
  value: string | undefined
  onChange: (event: SelectChangeEvent) => void
  label?: string
  sx?: any
}

const SelectionMenu = ({ id, options, value, onChange, sx, label }: Props) => {
  return (
    <FormControl variant="filled" sx={sx}>
      {label && <InputLabel id={`${id}-label`}>{label}</InputLabel>}
      <Select labelId={`${id}-label`} id={`${id}`} value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </FormControl>
  )
}

export default SelectionMenu
