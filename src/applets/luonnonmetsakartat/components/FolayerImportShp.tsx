import { useState, type ChangeEvent } from 'react'
import { useTranslate } from '@tolgee/react'

import { Box } from '#/common/style/theme'
import type { DropDownValueChangeEvent } from '#/components/common/DropDownSelect'
import TextFieldWithLabel from '#/components/common/TextFieldWithLabel'
import SwitchWithLabel from '#/components/common/SwitchWithLabel'
import DropDownSelectWithLabel from '#/components/common/DropDownSelectWithLabel'
import ColorPickerWithPopover from '#/components/common/ColorPickerWithPopover'
import TText from '#/components/common/TText'

import FolayerImportActionsRow from './FolayerImportActionsRow'
import FolayerImportCodeRecordSelect from './FolayerImportCodeRecordSelect'
import type { IndexingStrategy } from '../common/types'
import { useFolayerShapefile } from 'applets/luonnonmetsakartat/common/useFolayerShapefile'

const selectorFieldSx = { width: '100%' } as const

interface FolayerImportShpProps {
  fileBuffers: ArrayBuffer[]
  onFinish: (params: {
    indexingStrategy: IndexingStrategy
    nameCol: string
    municipalityCol: string
    idCol?: string
    regionCol?: string
    descriptionCol?: string
    areaCol?: string
    name?: string
    colorCode?: string
    isVisible?: boolean
  }) => void
  isInitializing: boolean
}

const FolayerImportShp = ({
  fileBuffers,
  onFinish,
  isInitializing,
}: FolayerImportShpProps) => {
  const { t } = useTranslate('luonnonmetsakartat')
  const [folayerNameValue, setFolayerNameValue] = useState('')
  const [folayerColorValue, setFolayerColorValue] = useState('#06402B')
  const [isVisible, setIsVisible] = useState(false)
  const { columns, selection, setColumn, isReady, errorKey, getValues } =
    useFolayerShapefile(fileBuffers[0])
  const {
    idCol,
    nameCol,
    municipalityCol,
    regionCol,
    descriptionCol,
    areaCol,
    indexingStrategy,
  } = selection
  const handleIndexingStrategyChange = (event: DropDownValueChangeEvent) => {
    const value = event.target.value
    if (value === 'id' || value === 'name_municipality') {
      setColumn('indexingStrategy', value)
    } else {
      throw new Error(`Invalid indexing strategy: ${value}`)
    }
  }

  const handleFolayerNameChange = (value: string) => {
    setFolayerNameValue(value)
  }

  const handleIsVisibleChange = (
    _event: ChangeEvent<HTMLInputElement>,
    checked: boolean
  ) => {
    setIsVisible(checked)
  }

  const handleColorChange = (color: string) => {
    setFolayerColorValue(color)
  }

  const handleFinish = () => {
    if (!folayerNameValue || isInitializing) return
    getValues((values) => {
      if (values)
        onFinish({
          ...values.colOptions,
          name: folayerNameValue,
          colorCode: folayerColorValue,
          isVisible,
        })
    })
  }

  return (
    <Box
      sx={{
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {errorKey && (
        <Box role="alert">
          <TText ns="luonnonmetsakartat" keyName={errorKey} />
        </Box>
      )}
      {columns.length > 0 && (
        <>
          <Box
            sx={(theme) => ({
              backgroundColor: theme.palette.neutral.light,
              p: {
                mobile: 2.5,
                desktop: 3,
              },
              borderRadius: '0.3125rem',
              display: 'flex',
              flexDirection: 'column',
              gap: {
                mobile: 2,
                desktop: 2.25,
              },
              minWidth: 0,
            })}
          >
            <DropDownSelectWithLabel
              label={t('sidebar.admin.create.indexing_strategy_label')}
              value={indexingStrategy}
              onChange={handleIndexingStrategyChange}
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
                  : t('sidebar.admin.create.select_folayer_id_record_optional')
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
          <Box
            sx={{
              mt: {
                mobile: 3,
                desktop: 4,
              },
              display: 'flex',
              flexDirection: 'column',
              gap: {
                mobile: 2.5,
                desktop: 3,
              },
              minWidth: 0,
            }}
          >
            <TextFieldWithLabel
              label={t('sidebar.admin.create.name.header')}
              value={folayerNameValue}
              onChange={(event) => handleFolayerNameChange(event.target.value)}
              placeholder={t('sidebar.admin.create.name.placeholder')}
              disabled={isInitializing}
              sx={{ mb: 2 }}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: {
                  mobile: 2,
                  desktop: 2.25,
                },
              }}
            >
              <ColorPickerWithPopover
                color={folayerColorValue}
                onChange={handleColorChange}
                sx={{
                  width: 'fit-content',
                  minHeight: '34px',
                  alignItems: 'center',
                }}
                colorBoxSx={{
                  width: 26,
                  height: 26,
                }}
                labelSx={{
                  lineHeight: 1.35,
                }}
                labelText={t('sidebar.admin.folayer.settings.color')}
              ></ColorPickerWithPopover>
              <SwitchWithLabel
                checked={isVisible}
                onChange={handleIsVisibleChange}
                sx={{
                  width: 'fit-content',
                  minHeight: '34px',
                }}
                disabled={isInitializing}
                ariaLabel={t('sidebar.admin.create.is_visible')}
              >
                <TText
                  ns="luonnonmetsakartat"
                  keyName="sidebar.admin.create.is_visible"
                />
              </SwitchWithLabel>
            </Box>
          </Box>
        </>
      )}
      <FolayerImportActionsRow
        onClickAccept={handleFinish}
        isAcceptDisabled={
          !isReady ||
          folayerNameValue == null ||
          folayerNameValue.length === 0 ||
          nameCol == null ||
          municipalityCol == null ||
          (indexingStrategy === 'id' && idCol == null) ||
          isInitializing
        }
      ></FolayerImportActionsRow>
    </Box>
  )
}

export default FolayerImportShp
