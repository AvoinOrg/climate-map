import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Combobox as BaseCombobox } from '@base-ui/react/combobox'
import { useTranslate } from '@tolgee/react'
import { FixedSizeList, ListChildComponentProps } from 'react-window'

import {
  Box,
  useMediaQuery,
  useTheme,
  type AppSxProps,
  type AppTheme,
  toSxArray,
} from '#/common/style/theme/system'
import AppTooltip from '#/components/common/AppTooltip'
import BigMenuButton from '#/components/common/BigMenuButton'
import { IconButton } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { Cross, Upload } from '#/components/icons'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import type { FolayerAreaConf } from 'applets/luonnonmetsakartat/common/types'

const AREA_OPTION_ROW_HEIGHT = 36
const AREA_OPTION_MAX_VISIBLE_ROWS = 7
const MAPPING_ROW_HEIGHT_DESKTOP = 56
const MAPPING_ROW_HEIGHT_MOBILE = 96
const MAPPING_LIST_MAX_HEIGHT_DESKTOP = 500
const MAPPING_LIST_MAX_HEIGHT_MOBILE = 520
const autoHighlightOnOpen = 'always' as unknown as boolean
const directoryInputAttributes = {
  webkitdirectory: '',
  directory: '',
}
const EMPTY_FEATURES: FolayerAreaConf['data']['features'] = []

type ComponentSxArrayItem = Exclude<NonNullable<AppSxProps>, readonly unknown[]>

const toComponentSxArray = (sx?: AppSxProps) =>
  toSxArray(sx) as ComponentSxArrayItem[]

const uploadButtonSx = {
  width: '100%',
  height: 'auto',
  minHeight: '60px',
  alignItems: 'center',
  gap: {
    mobile: 1.5,
    desktop: 2,
  },
  px: {
    mobile: 2,
    desktop: 3,
  },
  py: 1.5,
  overflow: 'hidden',
} as const

const uploadButtonLabelSx = {
  minWidth: 0,
  flex: '1 1 auto',
  display: '-webkit-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  overflowWrap: 'anywhere',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: {
    mobile: 2,
    desktop: 1,
  },
  lineHeight: 1.35,
  textAlign: 'left',
} as const

const uploadIconSx = {
  width: '24px',
  height: '24px',
  flex: '0 0 auto',
} as const

const summaryTextSx = {
  m: 0,
  typography: 'body2',
  lineHeight: 1.4,
  overflowWrap: 'anywhere',
} as const

const warningTextSx = {
  m: 0,
  mb: 1,
  typography: 'body2',
  lineHeight: 1.4,
  color: 'error.main',
  overflowWrap: 'anywhere',
} as const

const mappingGridSx = {
  display: 'grid',
  gridTemplateColumns: {
    mobile: 'minmax(0, 1fr) auto',
    desktop: 'minmax(0, 1fr) auto minmax(0, 1.5fr)',
  },
  gridTemplateAreas: {
    mobile: '"folder count" "select select"',
    desktop: '"folder count select"',
  },
  columnGap: {
    mobile: 1.5,
    desktop: 2,
  },
  rowGap: {
    mobile: 0.75,
    desktop: 0,
  },
  alignItems: {
    mobile: 'stretch',
    desktop: 'center',
  },
  minWidth: 0,
} as const

const mappingHeaderSx = {
  ...mappingGridSx,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
} as const

const mappingRowSx = {
  ...mappingGridSx,
  height: '100%',
  boxSizing: 'border-box',
  py: {
    mobile: 1,
    desktop: 1,
  },
  borderBottom: '1px solid',
  borderColor: 'divider',
} as const

const mappingHeaderTextSx = {
  typography: 'body7',
  color: 'text.secondary',
  minWidth: 0,
  lineHeight: 1.35,
} as const

const folderColumnSx = {
  gridArea: 'folder',
  minWidth: 0,
} as const

const countColumnSx = {
  gridArea: 'count',
  justifySelf: 'end',
  minWidth: '2ch',
  typography: 'body7',
  color: 'text.secondary',
  textAlign: 'right',
  lineHeight: 1.35,
} as const

const selectColumnSx = {
  gridArea: 'select',
  minWidth: 0,
} as const

const comboboxFieldSx = {
  width: '100%',
  minWidth: 0,
  minHeight: '2.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.25,
  border: '1px solid',
  borderColor: 'neutral.main',
  borderRadius: '2px',
  backgroundColor: 'neutral.lighter',
  cursor: 'text',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
  '&:focus-within, &[data-open]': {
    borderColor: 'secondary.dark',
    boxShadow: (theme: AppTheme) =>
      `0 0 0 1px ${theme.palette.secondary.dark}`,
  },
} as const

type AreaOption = {
  id: string
  label: string
  municipality: string
  name: string
}

type FixedSizeListHandle = {
  scrollToItem: (
    index: number,
    align?: 'auto' | 'smart' | 'center' | 'end' | 'start'
  ) => void
}

const FixedSizeListComponent = FixedSizeList as unknown as React.ComponentType<{
  height: number
  itemCount: number
  itemSize: number
  width: number | string
  ref?: React.Ref<FixedSizeListHandle>
  children: (props: ListChildComponentProps) => React.ReactNode
}>

export interface FolayerImportPicturesValues {
  bulkImages: File[]
  bulkAreaIds: string[]
}

export interface FolayerImportPicturesRef {
  getValues: (
    callback: (values: FolayerImportPicturesValues | null) => void
  ) => void
}

export type FolayerImportPicturesFixtureState = {
  files?: File[]
  selectedFolderLabel?: string
  manualMappings?: Record<string, string | null | undefined>
  openFolder?: string
  inputValueByFolder?: Record<string, string>
}

interface FolayerImportPicturesProps {
  disabled?: boolean
  folayerId: string
  onValidationChange?: (isValid: boolean) => void
  fixtureState?: FolayerImportPicturesFixtureState
}

const normalize = (s?: string) =>
  (s || '').toString().trim().replace(/\s+/g, ' ').toLowerCase()

const isAreaOptionEqual = (option: AreaOption, selected: AreaOption) =>
  option.id === selected.id

const filterAreaOption = (
  option: AreaOption,
  query: string,
  itemToString?: (option: AreaOption) => string
) => {
  const label = itemToString?.(option) ?? option.label

  return normalize(label).includes(normalize(query))
}

const FolderNameTooltip = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <AppTooltip
    title={title}
    side="top"
    align="start"
    sideOffset={8}
    delay={200}
    closeDelay={0}
    popupSx={{
      maxWidth: 280,
      px: 1,
      overflowWrap: 'anywhere',
    }}
  >
    {(triggerProps) => (
      <Box
        {...triggerProps}
        component="span"
        sx={{
          minWidth: 0,
          display: 'block',
        }}
      >
        {children}
      </Box>
    )}
  </AppTooltip>
)

type AreaSingleSelectComboboxProps = {
  disabled?: boolean
  value: AreaOption | null
  options: AreaOption[]
  onChange: (value: AreaOption | null) => void
  placeholder: string
  noOptionsText: string
  ariaLabel: string
  open?: boolean
  defaultOpen?: boolean
  defaultInputValue?: string
  sx?: AppSxProps
}

const AreaSingleSelectCombobox = ({
  disabled = false,
  value,
  options,
  onChange,
  placeholder,
  noOptionsText,
  ariaLabel,
  open,
  defaultOpen,
  defaultInputValue,
  sx,
}: AreaSingleSelectComboboxProps) => {
  const rootRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const optionListRef = useRef<FixedSizeListHandle | null>(null)
  const openIsControlled = open !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    defaultOpen ?? false
  )
  const [inputValue, setInputValue] = useState(
    defaultInputValue ?? value?.label ?? ''
  )
  const resolvedOpen = !disabled && (openIsControlled ? open : uncontrolledOpen)
  const filteredOptions = useMemo(() => {
    const inputMatchesSelectedValue =
      value && normalize(inputValue) === normalize(value.label)

    if (!inputValue.trim() || inputMatchesSelectedValue) {
      return options
    }

    return options.filter((option) =>
      filterAreaOption(option, inputValue, (areaOption) => areaOption.label)
    )
  }, [inputValue, options, value])
  const optionListHeight =
    Math.min(filteredOptions.length, AREA_OPTION_MAX_VISIBLE_ROWS) *
    AREA_OPTION_ROW_HEIGHT

  const setResolvedOpen = useCallback(
    (nextOpen: boolean) => {
      if (!disabled && !openIsControlled) {
        setUncontrolledOpen(nextOpen)
      }
    },
    [disabled, openIsControlled]
  )

  const handleClear = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onChange(null)
    setInputValue('')
    setResolvedOpen(false)
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!resolvedOpen || !value) {
      return undefined
    }

    const selectedIndex = filteredOptions.findIndex((option) =>
      isAreaOptionEqual(option, value)
    )

    if (selectedIndex < 0) {
      return undefined
    }

    const animationFrame = window.requestAnimationFrame(() => {
      optionListRef.current?.scrollToItem(selectedIndex, 'smart')
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [filteredOptions, resolvedOpen, value])

  const renderOptionRow = ({ index, style }: ListChildComponentProps) => {
    const option = filteredOptions[index]

    if (!option) {
      return null
    }

    return (
      <BaseCombobox.Item
        key={option.id}
        value={option}
        index={index}
        render={(itemProps, itemState) => (
          <Box
            {...itemProps}
            style={style as React.CSSProperties}
            data-slot="area-select-option"
            data-selected={itemState.selected ? '' : undefined}
            sx={{
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              py: 0,
              typography: 'body7',
              lineHeight: 1.35,
              color: '#111111',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              cursor: 'pointer',
              outline: 0,
              '&[data-highlighted], &:hover, &:focus-visible': {
                backgroundColor: 'primary.light',
              },
              '&[data-highlighted], &:focus-visible': {
                boxShadow: (theme: AppTheme) =>
                  `inset 0 0 0 2px ${theme.palette.secondary.dark}`,
              },
              '&[data-selected]': {
                backgroundColor: 'primary.lighter',
                fontWeight: 700,
              },
              '&[data-selected][data-highlighted]': {
                backgroundColor: 'primary.light',
              },
            }}
          >
            <Box
              component="span"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {option.label}
            </Box>
          </Box>
        )}
      />
    )
  }

  return (
    <Box
      ref={rootRef}
      sx={[
        {
          width: '100%',
          minWidth: 0,
          position: 'relative',
        },
        ...toComponentSxArray(sx),
      ]}
    >
      <BaseCombobox.Root<AreaOption>
        disabled={disabled}
        modal={false}
        items={options}
        filteredItems={filteredOptions}
        value={value}
        open={resolvedOpen}
        virtualized
        autoHighlight={autoHighlightOnOpen}
        inputValue={inputValue}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.id}
        isItemEqualToValue={isAreaOptionEqual}
        filter={filterAreaOption}
        onOpenChange={(nextOpen) => {
          setResolvedOpen(nextOpen)
        }}
        onItemHighlighted={(_, eventDetails) => {
          if (eventDetails.index >= 0) {
            optionListRef.current?.scrollToItem(eventDetails.index, 'smart')
          }
        }}
        onInputValueChange={(nextInputValue) => {
          setInputValue(nextInputValue)
          setResolvedOpen(true)
        }}
        onValueChange={(nextValue) => {
          const resolvedValue = nextValue ?? null
          onChange(resolvedValue)
          setInputValue(resolvedValue?.label ?? '')
          setResolvedOpen(false)
        }}
      >
        <Box
          data-slot="field"
          data-open={resolvedOpen ? '' : undefined}
          onMouseDown={(event) => {
            if (
              event.target instanceof HTMLElement &&
              event.target.closest('[data-slot="clear-button"]')
            ) {
              return
            }

            setResolvedOpen(true)
            inputRef.current?.focus()
          }}
          onClick={() => setResolvedOpen(true)}
          sx={comboboxFieldSx}
        >
          <BaseCombobox.Input
            ref={inputRef}
            aria-label={ariaLabel}
            placeholder={!value && !inputValue ? placeholder : undefined}
            render={(inputProps) => (
              <Box
                component="input"
                {...inputProps}
                role={inputProps.role ?? 'combobox'}
                aria-expanded={
                  inputProps['aria-expanded'] ??
                  (resolvedOpen ? 'true' : 'false')
                }
                aria-haspopup={inputProps['aria-haspopup'] ?? 'listbox'}
                onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
                  ;(
                    inputProps.onFocus as
                      | React.FocusEventHandler<HTMLInputElement>
                      | undefined
                  )?.(event)

                  setResolvedOpen(true)
                }}
                onMouseDown={(event: React.MouseEvent<HTMLInputElement>) => {
                  ;(
                    inputProps.onMouseDown as
                      | React.MouseEventHandler<HTMLInputElement>
                      | undefined
                  )?.(event)

                  setResolvedOpen(true)
                }}
                onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                  ;(
                    inputProps.onClick as
                      | React.MouseEventHandler<HTMLInputElement>
                      | undefined
                  )?.(event)

                  setResolvedOpen(true)
                }}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                  ;(
                    inputProps.onKeyDown as
                      | React.KeyboardEventHandler<HTMLInputElement>
                      | undefined
                  )?.(event)

                  if (event.defaultPrevented || event.key !== 'Escape') {
                    return
                  }

                  if (resolvedOpen) {
                    setResolvedOpen(false)
                    return
                  }

                  if (value || inputValue) {
                    event.preventDefault()
                    onChange(null)
                    setInputValue('')
                  }
                }}
                data-slot="input"
                sx={{
                  minWidth: 0,
                  flex: 1,
                  border: 0,
                  outline: 0,
                  backgroundColor: 'transparent',
                  typography: 'body7',
                  lineHeight: 1.35,
                  color: '#111111',
                  fontFamily: 'inherit',
                  '&::placeholder': {
                    typography: 'body7',
                    color: 'neutral.dark',
                    opacity: 1,
                  },
                }}
              />
            )}
          />
          {value && (
            <IconButton
              disabled={disabled}
              data-slot="clear-button"
              type="button"
              size="small"
              aria-label={`${ariaLabel} clear`}
              onClick={handleClear}
              sx={{
                width: '2rem',
                minWidth: '2rem',
                height: '2rem',
                flex: '0 0 2rem',
                p: 0,
                color: 'neutral.dark',
                '& svg': {
                  width: '0.75rem',
                  height: '0.75rem',
                },
              }}
            >
              <Cross />
            </IconButton>
          )}
        </Box>

        <BaseCombobox.Portal keepMounted>
          <BaseCombobox.Positioner
            anchor={rootRef}
            align="start"
            sideOffset={4}
            render={(positionerProps) => (
              <Box
                {...positionerProps}
                data-slot="area-select-positioner"
                sx={{
                  zIndex: (theme) => theme.zIndex.modal + 1,
                  width: {
                    mobile: 'min(var(--anchor-width), calc(100vw - 2rem))',
                    desktop:
                      'min(max(var(--anchor-width), 18rem), calc(100vw - 2rem))',
                  },
                  minWidth: 0,
                  maxWidth: 'calc(100vw - 2rem)',
                }}
              />
            )}
          >
            <BaseCombobox.Popup
              render={(popupProps) => (
                <Box
                  {...popupProps}
                  data-slot="area-select-popup"
                  sx={{
                    maxHeight: 'min(18rem, calc(100vh - 2rem))',
                    overflowY: 'hidden',
                    overflowX: 'hidden',
                    border: '1px solid #D6D6D6',
                    borderRadius: '0.25rem',
                    backgroundColor: 'common.white',
                    boxShadow: '0px 8px 24px rgba(17, 17, 17, 0.12)',
                  }}
                />
              )}
            >
              <BaseCombobox.List>
                {filteredOptions.length > 0 && (
                  <FixedSizeListComponent
                    ref={optionListRef}
                    height={optionListHeight}
                    itemCount={filteredOptions.length}
                    itemSize={AREA_OPTION_ROW_HEIGHT}
                    width="100%"
                  >
                    {renderOptionRow}
                  </FixedSizeListComponent>
                )}
              </BaseCombobox.List>

              <BaseCombobox.Empty
                render={(emptyProps) => (
                  <Box
                    {...emptyProps}
                    data-slot="area-select-empty"
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      typography: 'body7',
                      lineHeight: 1.35,
                      color: 'text.secondary',
                      backgroundColor: 'neutral.lighter',
                      overflowWrap: 'anywhere',
                    }}
                  />
                )}
              >
                {noOptionsText}
              </BaseCombobox.Empty>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
    </Box>
  )
}

const FolayerImportPictures = forwardRef<
  FolayerImportPicturesRef,
  FolayerImportPicturesProps
>(({ folayerId, onValidationChange, fixtureState, disabled = false }, ref) => {
  const { t } = useTranslate('luonnonmetsakartat')
  const theme = useTheme<AppTheme>()
  const isMobile = useMediaQuery(theme.breakpoints.down('desktop'))
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>(fixtureState?.files ?? [])
  const [selectedFolderLabel, setSelectedFolderLabel] = useState<
    string | undefined
  >(fixtureState?.selectedFolderLabel)
  const [manualMappings, setManualMappings] = useState<
    Record<string, string | null | undefined>
  >(fixtureState?.manualMappings ?? {})

  const areaConf: FolayerAreaConf | undefined = useAppletStore(
    (s) => s.folayerAreaConfs[folayerId]
  )

  const features = areaConf?.data?.features ?? EMPTY_FEATURES
  const areaOptionsAll: AreaOption[] = useMemo(() => {
    const list = features
      .map((feat) => {
        const id =
          feat.id != null
            ? String(feat.id)
            : feat.properties?.id != null
              ? String(feat.properties.id)
              : undefined
        if (!id) return null
        const municipality = feat.properties?.municipality || ''
        const name = feat.properties?.name || ''
        const label = [municipality, name].filter(Boolean).join(', ')
        return { id, label, municipality, name }
      })
      .filter((o): o is AreaOption => !!o)
      .sort((a, b) => {
        const am = normalize(a.municipality)
        const bm = normalize(b.municipality)
        if (am !== bm) return am.localeCompare(bm)
        const an = normalize(a.name)
        const bn = normalize(b.name)
        return an.localeCompare(bn)
      })
    return list
  }, [features])
  const optionsById = useMemo(
    () => new Map(areaOptionsAll.map((o) => [o.id, o] as const)),
    [areaOptionsAll]
  )
  const featureIdByNormKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const feat of features) {
      const id =
        feat.id != null
          ? String(feat.id)
          : feat.properties?.id != null
            ? String(feat.properties.id)
            : undefined
      if (!id) continue
      const municipality = normalize(feat.properties?.municipality)
      const name = normalize(feat.properties?.name)
      const key = `${municipality}|${name}`
      if (!map.has(key)) map.set(key, id)
    }
    return map
  }, [features])

  const groups = useMemo(() => {
    const map = new Map<string, File[]>()
    for (const f of files) {
      if (!f.type || !f.type.startsWith('image/')) continue
      const rel = (f as File & { webkitRelativePath?: string })
        .webkitRelativePath || f.name
      const parts = rel.split('/')
      const folder = parts.length > 1 ? parts[parts.length - 2] : ''
      if (!map.has(folder)) map.set(folder, [])
      map.get(folder)!.push(f)
    }
    return map
  }, [files])

  const mapping = useMemo(() => {
    const result: { bulkImages: File[]; bulkAreaIds: string[] } = {
      bulkImages: [],
      bulkAreaIds: [],
    }
    const unmatched: string[] = []
    const resolvedByFolder: Record<string, string | undefined> = {}

    if (!features.length) return { ...result, unmatched, resolvedByFolder }

    groups.forEach((imgs, folderName) => {
      if (!folderName) return
      const split = folderName.split(',')
      const municipalityRaw = split.shift()
      const nameRaw = split.join(',')

      const nMunicipality = normalize(municipalityRaw)
      const nName = normalize(nameRaw)
      const autoFoundId = featureIdByNormKey.get(`${nMunicipality}|${nName}`)

      const manual = manualMappings[folderName]
      let resolvedId: string | undefined

      if (manual === null) {
        resolvedId = undefined
      } else if (typeof manual === 'string' && manual) {
        resolvedId = manual
      } else if (autoFoundId) {
        resolvedId = autoFoundId
      }

      if (!resolvedId) {
        unmatched.push(folderName)
        resolvedByFolder[folderName] = undefined
      } else {
        resolvedByFolder[folderName] = resolvedId
        for (const img of imgs) {
          result.bulkImages.push(img)
          result.bulkAreaIds.push(resolvedId)
        }
      }
    })

    return { ...result, unmatched, resolvedByFolder }
  }, [groups, featureIdByNormKey, manualMappings, features.length])

  const rowOrder = useMemo(() => {
    const folders = Array.from(groups.keys())
    if (folders.length === 0) {
      return []
    }
    if (!features.length) return []

    const autoResolvedByFolder: Record<string, boolean> = {}
    folders.forEach((folderName) => {
      if (!folderName || features.length === 0) {
        autoResolvedByFolder[folderName] = false
        return
      }
      const split = folderName.split(',')
      const municipalityRaw = split.shift()
      const nameRaw = split.join(',')

      const nMunicipality = normalize(municipalityRaw)
      const nName = normalize(nameRaw)
      autoResolvedByFolder[folderName] = featureIdByNormKey.has(
        `${nMunicipality}|${nName}`
      )
    })

    return folders.sort((a, b) => {
      const aUnmatched = !autoResolvedByFolder[a]
      const bUnmatched = !autoResolvedByFolder[b]
      if (aUnmatched === bUnmatched) return a.localeCompare(b)
      return aUnmatched ? -1 : 1
    })
  }, [groups, features.length, featureIdByNormKey])

  useEffect(() => {
    if (!onValidationChange) return
    const isValid = mapping.bulkImages.length > 0 && !!areaConf
    onValidationChange(isValid)
  }, [onValidationChange, mapping.bulkImages.length, areaConf])

  useImperativeHandle(ref, () => ({
    getValues: (cb) => {
      // Allow partial saves: return mapped images even if some folders are unmatched.
      if (mapping.bulkImages.length === 0) {
        cb(null)
        return
      }
      cb({ bulkImages: mapping.bulkImages, bulkAreaIds: mapping.bulkAreaIds })
    },
  }))

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const fList = e.target.files
    if (!fList) return
    const arr = Array.from(fList)
    setManualMappings({})
    setFiles(arr)
    const first = arr[0] as File & { webkitRelativePath?: string }
    const relFirst: string = first?.webkitRelativePath || first?.name || ''
    const root = relFirst.includes('/') ? relFirst.split('/')[0] : relFirst
    setSelectedFolderLabel(root || undefined)
    e.target.value = ''
  }

  const totalImages = mapping.bulkImages.length
  const matchedAreaIds = useMemo(
    () => new Set<string>(mapping.bulkAreaIds || []),
    [mapping.bulkAreaIds]
  )
  const totalAreas = matchedAreaIds.size
  const unmatchedFolders = mapping.unmatched
  const unmatchedFoldersCount = unmatchedFolders.length
  const unmatchedImagesCount = useMemo(() => {
    if (!unmatchedFolders.length) return 0
    let count = 0
    unmatchedFolders.forEach((folder) => {
      const imgs = groups.get(folder)
      if (imgs) count += imgs.length
    })
    return count
  }, [unmatchedFolders, groups])

  const rowHeight = isMobile
    ? MAPPING_ROW_HEIGHT_MOBILE
    : MAPPING_ROW_HEIGHT_DESKTOP
  const maxListHeight = isMobile
    ? MAPPING_LIST_MAX_HEIGHT_MOBILE
    : MAPPING_LIST_MAX_HEIGHT_DESKTOP
  const listHeight = Math.min(rowOrder.length * rowHeight, maxListHeight)

  const Row = ({ index, style }: ListChildComponentProps) => {
    const folder = rowOrder[index]
    const imgs = groups.get(folder) || []
    const count = imgs.length
    const manualVal = manualMappings[folder]
    const currentId =
      manualVal === null
        ? undefined
        : manualVal || mapping.resolvedByFolder[folder]
    const currentValue = currentId ? optionsById.get(currentId) || null : null
    const selectAreaText = t(
      'sidebar.admin.folayer.settings.picture.select_area'
    )

    return (
      <Box
        key={folder}
        style={style as unknown as React.CSSProperties}
        sx={mappingRowSx}
      >
        <FolderNameTooltip title={folder}>
          <Box
            component="span"
            sx={{
              ...folderColumnSx,
              display: 'block',
              typography: 'body7',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {folder}
          </Box>
        </FolderNameTooltip>
        <Box
          component="span"
          sx={countColumnSx}
        >
          {count}
        </Box>
        <AreaSingleSelectCombobox
          disabled={disabled}
          options={areaOptionsAll}
          value={currentValue}
          placeholder={selectAreaText}
          ariaLabel={`${selectAreaText}: ${folder}`}
          noOptionsText={t(
            'sidebar.admin.folayer.settings.picture.no_options'
          )}
          open={fixtureState?.openFolder === folder ? true : undefined}
          defaultInputValue={fixtureState?.inputValueByFolder?.[folder]}
          onChange={(newValue) => {
            setManualMappings((prev) => ({
              ...prev,
              [folder]: newValue ? newValue.id : null,
            }))
          }}
          sx={selectColumnSx}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <BigMenuButton
        disabled={disabled}
        variant="outlined"
        component="label"
        sx={uploadButtonSx}
        aria-label={
          selectedFolderLabel ||
          t('sidebar.admin.folayer.settings.picture.select_folder')
        }
      >
        <Box component="span" sx={uploadButtonLabelSx}>
          {selectedFolderLabel ||
            t('sidebar.admin.folayer.settings.picture.select_folder')}
        </Box>
        <input
          hidden
          multiple
          {...directoryInputAttributes}
          disabled={disabled}
          type="file"
          accept="image/*"
          onChange={handleFolderInput}
          ref={inputRef}
        />
        <Upload aria-hidden="true" sx={uploadIconSx} />
      </BigMenuButton>

      {groups.size > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box component="p" sx={summaryTextSx}>
            <TText
              ns="luonnonmetsakartat"
              keyName={'sidebar.admin.folayer.settings.picture.areas'}
            />
            : {totalAreas} •{' '}
            <TText
              ns="luonnonmetsakartat"
              keyName={'sidebar.admin.folayer.settings.picture.images'}
            />
            : {totalImages}
          </Box>
        </Box>
      )}

      {unmatchedFolders.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box component="p" sx={warningTextSx}>
            <TText
              ns="luonnonmetsakartat"
              keyName={
                unmatchedFoldersCount > 1
                  ? 'sidebar.admin.folayer.settings.picture.unmatched_folders'
                  : 'sidebar.admin.folayer.settings.picture.unmatched_folder'
              }
              params={{
                folderCount: unmatchedFoldersCount,
                imageCount: unmatchedImagesCount,
              }}
            />
          </Box>
        </Box>
      )}

      {groups.size > 0 && features.length ? (
        <Box sx={{ mt: 2 }}>
          <Box sx={mappingHeaderSx}>
            <Box
              component="span"
              sx={{ ...mappingHeaderTextSx, ...folderColumnSx }}
            >
              {t('sidebar.admin.folayer.settings.picture.folders')}
            </Box>
            <Box
              component="span"
              sx={countColumnSx}
            >
              {t('sidebar.admin.folayer.settings.picture.images')}
            </Box>
            <Box
              component="span"
              sx={{ ...mappingHeaderTextSx, ...selectColumnSx }}
            >
              {t('sidebar.admin.folayer.settings.picture.areas')}
            </Box>
          </Box>

          <Box
            data-testid="folayer-import-pictures-mapping-list"
            sx={{ width: '100%' }}
          >
            <FixedSizeListComponent
              height={listHeight}
              itemCount={rowOrder.length}
              itemSize={rowHeight}
              width="100%"
            >
              {Row}
            </FixedSizeListComponent>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
})

FolayerImportPictures.displayName = 'FolayerImportPictures'

export default FolayerImportPictures
