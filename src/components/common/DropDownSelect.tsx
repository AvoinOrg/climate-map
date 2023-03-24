import React from 'react'
import { FormControl, Select, SelectChangeEvent } from '@mui/material'
import { styled } from '@mui/material/styles'
import DownIcon from '#/components/icons/DownIcon'

interface Props {
  value: any
  options: { value: any; label: string }[]
  onChange: (event: SelectChangeEvent) => void
  label?: string
  sx?: any
}

const DropDownSelect = ({ value, options, onChange, label, sx }: Props) => {
  return (
    <FormControl sx={sx}>
      {label && <Label>{label}</Label>}
      <Select
        native
        value={value}
        onChange={onChange}
        IconComponent={DownIcon}
        MenuProps={{
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
        }}
        sx={{ backgroundColor: 'background.main', '.MuiSvgIcon-root': { fontSize: '16px', margin: '0 10px 0 0' } }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormControl>
  )
}

const Label = styled('p')({
  fontSize: '16px',
})

export default DropDownSelect
