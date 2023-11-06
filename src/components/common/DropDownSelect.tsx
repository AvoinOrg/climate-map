import React, { useEffect } from 'react'
import {
  FormControl,
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
  label?: string
  sx?: any
  labelSx?: any
}

const DropDownSelect = ({
  value,
  options,
  onChange,
  label,
  sx,
  labelSx,
}: Props) => {
  const [hasEmpty, setHasEmpty] = React.useState(value == null)

  return (
    <FormControl sx={sx}>
      {label && (
        <Typography sx={{ typography: 'h7', mb: 2, ...labelSx }}>{label}</Typography>
      )}
      <Select
        native
        value={value == null ? '' : value}
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
        sx={{
          backgroundColor: 'background.main',
          '.MuiSvgIcon-root': { fontSize: '16px', margin: '0 10px 0 0' },
        }}
      >
        {...[
          hasEmpty == true && <option key={''} value={undefined}></option>,
          options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          )),
        ]}
      </Select>
    </FormControl>
  )
}

export default DropDownSelect
