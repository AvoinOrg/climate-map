import React, { useState } from 'react'
import { FormControl, Select, SelectChangeEvent } from '@mui/material'
import { styled } from '@mui/material/styles'
import DownIcon from '#/components/icons/DownIcon'

interface Props {
  value: any
  options: { value: any; label: string }[]
  onChange: (event: SelectChangeEvent) => void
  sx?: any
  isIconOnTheRight?: boolean // added prop
}

const DropDownSelectMinimal = ({
  value,
  options,
  onChange,
  sx,
  isIconOnTheRight = true,
}: Props) => {
  const [hasEmpty, setHasEmpty] = useState(value == null)

  return (
    <FormControl variant={'standard'}>
      <Select
        native
        value={value == null ? '' : value}
        onChange={onChange}
        IconComponent={StyledDownIcon}
        disableUnderline={true}
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
        sx={{
          ...sx,

          '.MuiSelect-icon': {
            height: '10px',
          },

          '& .Mui-selected': {
            backgroundColor: 'transparent',
            color: 'inherit', // or your desired color
          },
        }}
      >
        {hasEmpty && <option key={''} value={''}></option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormControl>
  )
}

const StyledDownIcon = styled(DownIcon)(({ theme }) => ({
  margin: '6px 0 0 0',
  height: '10px',
}))

export default DropDownSelectMinimal
