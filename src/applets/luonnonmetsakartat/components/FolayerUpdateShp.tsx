import { useEffect, forwardRef, useImperativeHandle } from 'react'
import { useTranslate } from '@tolgee/react'

import { Box, type AppTheme } from '#/common/style/theme'
import DropDownSelectWithLabel from '#/components/common/DropDownSelectWithLabel'
import TText from '#/components/common/TText'

import FolayerImportCodeRecordSelect from './FolayerImportCodeRecordSelect'
import type { AdminFolayerConf } from 'applets/luonnonmetsakartat/common/types'
import type { ShapefileValues } from 'applets/luonnonmetsakartat/common/folayerShapefile'
import { useFolayerShapefile } from 'applets/luonnonmetsakartat/common/useFolayerShapefile'

const selectorFieldSx = {
  width: '100%',
  minWidth: 0,
} as const

const selectorHeadingSx = {
  typography: 'h4',
  m: 0,
} as const

const selectorPanelSx = (theme: AppTheme) => ({
  borderLeft: `1px solid ${theme.palette.neutral.main}`,
  pl: {
    mobile: 1.5,
    desktop: 2,
  },
  py: {
    mobile: 0.5,
    desktop: 0.75,
  },
  display: 'flex',
  flexDirection: 'column',
  gap: {
    mobile: 2,
    desktop: 2.25,
  },
  minWidth: 0,
})

export interface FolayerUpdateShpRef {
  getValues: (callback: (values: ShapefileValues | null) => void) => void
}

interface FolayerUpdateShpProps {
  fileBuffers: ArrayBuffer[]
  adminFolayerConf: AdminFolayerConf
  onValidationChange?: (isValid: boolean) => void
}

const FolayerUpdateShp = forwardRef<FolayerUpdateShpRef, FolayerUpdateShpProps>(
  function FolayerUpdateShp(
    { fileBuffers, adminFolayerConf, onValidationChange },
    ref
  ) {
    const { t } = useTranslate('luonnonmetsakartat')
    const {
      columns,
      selection,
      setColumn,
      isValid,
      errorKey,
      blockingError,
      getValues,
    } = useFolayerShapefile(fileBuffers[0], adminFolayerConf.colOptions)
    const {
      idCol,
      nameCol,
      municipalityCol,
      regionCol,
      descriptionCol,
      areaCol,
      indexingStrategy,
    } = selection
    useEffect(() => {
      onValidationChange?.(isValid)
    }, [onValidationChange, isValid])
    useImperativeHandle(ref, () => ({ getValues }))

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: {
            mobile: 2,
            desktop: 2.25,
          },
          minWidth: 0,
        }}
      >
        {errorKey && (
          <Box role="alert">
            <TText ns="luonnonmetsakartat" keyName={errorKey} />
          </Box>
        )}
        {!errorKey && blockingError && (
          <Box role="status">
            <TText
              ns="luonnonmetsakartat"
              keyName={blockingError.key}
              params={blockingError.params}
            />
          </Box>
        )}
        {columns.length > 0 && (
          <>
            <Box component="h3" sx={selectorHeadingSx}>
              <TText
                keyName="sidebar.admin.create.column_selection_header"
                ns="luonnonmetsakartat"
              />
            </Box>
            <Box sx={selectorPanelSx}>
              <DropDownSelectWithLabel
                label={t('sidebar.admin.create.indexing_strategy_label')}
                value={indexingStrategy}
                onChange={() => {}}
                disabled={true}
                options={[
                  {
                    value: 'id',
                    label: t('sidebar.admin.create.indexing_strategy.id'),
                  },
                  {
                    value: 'name_municipality',
                    label: t(
                      'sidebar.admin.create.indexing_strategy.name_municipality'
                    ),
                  },
                ]}
                sx={selectorFieldSx}
              />
              <FolayerImportCodeRecordSelect
                columns={columns}
                selectedColumn={idCol}
                onColumnChange={(value) => setColumn('idCol', value)}
                label={
                  indexingStrategy === 'id'
                    ? t('sidebar.admin.create.select_folayer_id_record')
                    : t(
                        'sidebar.admin.create.select_folayer_id_record_optional'
                      )
                }
                allowEmpty={true}
                sx={selectorFieldSx}
              />
              <FolayerImportCodeRecordSelect
                columns={columns}
                selectedColumn={nameCol}
                onColumnChange={(value) => setColumn('nameCol', value)}
                label={t('sidebar.admin.create.select_folayer_name_record')}
                allowEmpty={true}
                sx={selectorFieldSx}
              />
              <FolayerImportCodeRecordSelect
                columns={columns}
                selectedColumn={municipalityCol}
                onColumnChange={(value) => setColumn('municipalityCol', value)}
                label={t(
                  'sidebar.admin.create.select_folayer_municipality_record'
                )}
                allowEmpty={true}
                sx={selectorFieldSx}
              />
              <FolayerImportCodeRecordSelect
                columns={columns}
                selectedColumn={regionCol}
                onColumnChange={(value) => setColumn('regionCol', value)}
                label={t('sidebar.admin.create.select_folayer_region_record')}
                allowEmpty={true}
                sx={selectorFieldSx}
              />
              <FolayerImportCodeRecordSelect
                columns={columns}
                selectedColumn={descriptionCol}
                onColumnChange={(value) => setColumn('descriptionCol', value)}
                label={t(
                  'sidebar.admin.create.select_folayer_description_record'
                )}
                allowEmpty={true}
                sx={selectorFieldSx}
              />
              <FolayerImportCodeRecordSelect
                columns={columns}
                selectedColumn={areaCol}
                onColumnChange={(value) => setColumn('areaCol', value)}
                label={t('sidebar.admin.create.select_folayer_area_record')}
                allowEmpty={true}
                sx={selectorFieldSx}
              />
            </Box>
          </>
        )}
      </Box>
    )
  }
)

export default FolayerUpdateShp
