import { useEffect, useRef, useState } from 'react'
import type { FeatureCollection } from 'geojson'
import { useTranslate } from '@tolgee/react'
import { useUIStore } from '#/common/store/uiStore'
import type { ColOptions } from 'applets/luonnonmetsakartat/common/types'
import {
  detectShapefileColumns,
  getFeatureColumns,
  parseFolayerShapefile,
  validateShapefile,
  type ShapefileColumns,
  type ShapefileValues,
} from 'applets/luonnonmetsakartat/common/folayerShapefile'

type ParsedFile = {
  buffer: ArrayBuffer
  geojson: FeatureCollection
  selection: ShapefileColumns
}

export const useFolayerShapefile = (
  buffer?: ArrayBuffer,
  saved?: ColOptions
) => {
  const { t } = useTranslate('luonnonmetsakartat')
  const notify = useUIStore((state) => state.notify)
  const triggerConfirmationDialog = useUIStore(
    (state) => state.triggerConfirmationDialog
  )
  const [parsed, setParsed] = useState<ParsedFile>()
  const [failedBuffer, setFailedBuffer] = useState<ArrayBuffer>()
  const current = useRef<ParsedFile | undefined>(undefined)
  const active = parsed?.buffer === buffer ? parsed : undefined
  current.current = active

  useEffect(() => {
    let stale = false
    setParsed(undefined)
    setFailedBuffer(undefined)
    if (buffer) {
      void parseFolayerShapefile(buffer)
        .then((geojson) => {
          if (!stale)
            setParsed({
              buffer,
              geojson,
              selection: detectShapefileColumns(
                getFeatureColumns(geojson),
                saved
              ),
            })
        })
        .catch(() => {
          if (!stale) setFailedBuffer(buffer)
        })
    }
    return () => {
      stale = true
      current.current = undefined
    }
  }, [buffer, saved])

  const selection = active?.selection ?? {
    indexingStrategy: saved?.indexingStrategy ?? 'id',
  }
  const validation = validateShapefile({ geojson: active?.geojson, selection })
  const errorKey =
    failedBuffer && failedBuffer === buffer
      ? 'sidebar.admin.create.error_invalid_shapefile'
      : active && validation.error === 'columns'
        ? 'sidebar.admin.create.error_missing_columns'
        : undefined
  const setColumn = <K extends keyof ShapefileColumns>(
    field: K,
    value: ShapefileColumns[K]
  ) => {
    setParsed((previous) =>
      previous && previous.buffer === buffer
        ? {
            ...previous,
            selection: { ...previous.selection, [field]: value },
          }
        : previous
    )
  }
  const validationKeys = {
    columns: 'sidebar.admin.create.error_missing_columns',
    id: 'sidebar.admin.create.error_id_not_unique',
    name_municipality:
      'sidebar.admin.create.error_name_municipality_not_unique',
    strings: 'sidebar.admin.create.error_invalid_chars_or_encoding',
  }
  const blockingError =
    active && validation.error
      ? {
          key: validationKeys[validation.error],
          params: {
            ids: validation.duplicates.join(', '),
            duplicates: validation.duplicates.join(', '),
            values: validation.invalidValues.join(', '),
          },
        }
      : undefined
  const getValues = (callback: (values: ShapefileValues | null) => void) => {
    if (
      !active ||
      current.current !== active ||
      validation.error ||
      !validation.colOptions
    ) {
      if (blockingError)
        notify({
          variant: 'error',
          persist: true,
          message: t(blockingError.key, blockingError.params),
        })
      callback(null)
      return
    }
    const values = {
      colOptions: validation.colOptions,
      rawShapefile: active.buffer,
    }
    // A dialog may outlive its upload, selection, or component.
    const finish = () => callback(current.current === active ? values : null)
    if (validation.warnings.length) {
      triggerConfirmationDialog({
        content: t('sidebar.admin.create.confirm_invalid_chars', {
          columns: validation.warnings.join(', '),
          values: validation.invalidValues.join(', '),
        }),
        onConfirm: finish,
        onCancel: () => callback(null),
      })
    } else finish()
  }
  return {
    columns: active ? getFeatureColumns(active.geojson) : [],
    selection,
    setColumn,
    isReady: Boolean(active),
    isValid: Boolean(active && !validation.error),
    errorKey,
    blockingError,
    getValues,
  }
}
