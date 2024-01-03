import { SelectChangeEvent } from '@mui/material'
import DropDownSelect from '#/components/common/DropDownSelect'

interface Props {
  columns: string[]
  selectedColumn?: string
  onColumnChange: (column: string | undefined) => void
  label?: string
  sx?: SxProps<Theme>
}

const PlanImportCodeRecordSelect = ({
  columns,
  selectedColumn,
  onColumnChange,
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
          label={label}
        />
      )}
    </>
  )
}

export default PlanImportCodeRecordSelect
