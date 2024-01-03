import React, { useEffect } from 'react'
import {
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
  SxProps,
  Theme,
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
  sx?: SxProps<Theme>
  selectSx?: SxProps<Theme>
  labelSx?: SxProps<Theme>
  iconSx?: SxProps<Theme>
}

const DropDownSelect = ({
  value,
  options,
  onChange,
  label,
  sx,
  selectSx,
  labelSx,
  iconSx,
}: Props) => {
  const [hasEmpty, setHasEmpty] = React.useState(true)

  useEffect(() => {
    setHasEmpty(
      Object.values(options).find((option) => option.value === value) == null
    )
  }, [value, options])

  return (
    <FormControl sx={[...(Array.isArray(sx) ? sx : [sx])]}>
      {label && (
        <Typography
          sx={[
            {
              typography: 'h7',
              mb: 2,
            },
            ...(Array.isArray(labelSx) ? labelSx : [labelSx]),
          ]}
        >
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
        sx={[
          {
            backgroundColor: 'background.main',
            '.MuiSvgIcon-root': { fontSize: '16px', margin: '0 10px 0 0' },
            '.MuiSelect-icon': {
              ...(iconSx as Record<string, any>),
            },
          },
          ...(Array.isArray(selectSx) ? selectSx : [selectSx]),
        ]}
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
