import React, { useEffect } from 'react'
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from '@mui/material'

import DownIcon from '#/components/icons/DownIcon'
import { SelectOption } from '#/common/types/general'
import { T } from '@tolgee/react'

interface Props {
  value: any
  options: SelectOption[]
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
  const [hasEmpty, setHasEmpty] = React.useState(true)

  useEffect(() => {
    setHasEmpty(
      Object.values(options).find((option) => option.value === value) == null
    )
  }, [value, options])

  return (
    <FormControl sx={sx}>
      {label && (
        <Typography sx={{ typography: 'h7', mb: 2, ...labelSx }}>
          {label}
        </Typography>
      )}
      <Select
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
          hasEmpty === true && (
            <MenuItem key={''} value={value}>
              {value != null ? (
                <i>
                  <T
                    keyName={'components.drop_down_select.invalid_value'}
                    ns={'avoin-map'}
                  ></T>
                  {` (${value})`}
                </i>
              ) : (
                ''
              )}
            </MenuItem>
          ),
          options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          )),
        ]}
      </Select>
    </FormControl>
  )
}

export default DropDownSelect
