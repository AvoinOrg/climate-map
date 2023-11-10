import React, { useState } from 'react'
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import DownIcon from '#/components/icons/DownIcon'

interface Props {
  value: any
  options: { value: any; label: string }[]
  onChange: (event: SelectChangeEvent) => void
  sx?: any
  optionSx?: any
  iconSx?: any
  isIconOnTheRight?: boolean // added prop
}

const DropDownSelectMinimal = ({
  value,
  options,
  onChange,
  sx,
  optionSx,
  iconSx,
  isIconOnTheRight = true,
}: Props) => {
  const [hasEmpty, setHasEmpty] = useState(value == null)

  return (
    <FormControl variant={'standard'}>
      <Select
        value={value == null ? '' : value}
        onChange={onChange}
        IconComponent={StyledDownIcon}
        disableUnderline={true}
        MenuProps={{
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          PaperProps: {
            sx: {
              // You can define the top position to make it nearer to the top of the anchor element
              m: 0, // This negative margin will pull the menu up closer to the Select
              p: 0,
              '& .MuiList-root': {
                m: 0,
                p: 0,
              },
            },
          },
        }}
        sx={{
          '.MuiSelect-icon': {
            ...iconSx,
          },
          '& .MuiSelect-select': {
            m: 0,
            p: 0,
          },

          '& .MuiSelect-select:focus': {
            backgroundColor: 'transparent',
          },
          m: 0,
          p: 0,
          ...sx,
        }}
      >
        {hasEmpty && <option key={''} value={''}></option>}
        {options.map((option) => (
          <MenuItem
            sx={{
              m: 0,
              p: 0,
            }}
            key={option.value}
            value={option.value}
          >
            <Typography
              sx={{ textAlign: 'left', pl: 1, pt: 0.5, pb: 0.5, ...optionSx }}
            >
              {option.label}
            </Typography>
          </MenuItem>
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