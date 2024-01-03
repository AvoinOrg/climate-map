import { SelectChangeEvent, SxProps, Theme } from '@mui/material'

import DropDownSelect from '#/components/common/DropDownSelect'

interface Props {
  columns: string[]
  selectedColumn?: string
  onColumnChange: (column: string | undefined) => void
  allowEmpty?: boolean
  label?: string
  sx?: SxProps<Theme>
}

const PlanImportCodeRecordSelect = ({
  columns,
  selectedColumn,
  onColumnChange,
  allowEmpty,
  label,
  sx,
}: Props) => {
  const handleSelectColumn = (event: SelectChangeEvent) => {
    const { value } = event.target

    if (value === '' || value === null) {
      onColumnChange(undefined)
      return
    }

    onColumnChange(value as string)
  }

  return (
    <>
      {columns.length > 0 && (
        <DropDownSelect
          sx={[...(Array.isArray(sx) ? sx : [sx])]}
          value={selectedColumn}
          options={columns.map((col) => {
            return { value: col, label: col }
          })}
          onChange={handleSelectColumn}
          allowEmpty={allowEmpty}
          label={label}
        />
      )}
    </>
  )
}

export default PlanImportCodeRecordSelect
