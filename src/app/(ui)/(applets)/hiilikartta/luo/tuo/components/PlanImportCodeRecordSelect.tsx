import { SelectChangeEvent } from '@mui/material'
import DropDownSelect from '#/components/common/DropDownSelect'

interface Props {
  columns: string[]
  selectedColumn?: string
  onColumnChange: (column: string | undefined) => void
  label?: string
}

const PlanImportCodeRecordSelect = ({
  columns,
  selectedColumn,
  onColumnChange,
  label,
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
          sx={() => ({ margin: '20px 0 0 0' })}
          value={selectedColumn}
          options={columns.map((table) => {
            return { value: table, label: table }
          })}
          onChange={handleSelectColumn}
          label={label}
        />
      )}
    </>
  )
}

export default PlanImportCodeRecordSelect
