import { useRef, useEffect, useState, type ChangeEvent } from 'react'
import { useTranslate } from '@tolgee/react'
import { useMutation } from '@tanstack/react-query'

import { Box } from '#/common/style/theme'
import { useAppRouteHrefBuilder } from '#/common/navigation/appRouteLinks'
import { useAppRouter } from '#/common/navigation/navigation'
import BigMenuButton from '#/components/common/BigMenuButton'
import { SidebarContentBox } from '#/components/Sidebar'
import { Upload } from '#/components/icons'

import type { IndexingStrategy } from 'applets/luonnonmetsakartat/common/types'
import { APP_ROUTE_KEYS } from '#/common/routing/routeMetadata'
import FolayerImportShp from 'applets/luonnonmetsakartat/components/FolayerImportShp'
import { useAdminFolayerPostMutationOptions } from 'applets/luonnonmetsakartat/common/queries/adminFolayerPostMutation'
import { useSidebarActivityLoader } from '#/common/hooks/ui/useSidebarActivityLoader'

const LuonnonmetsakartatAdminImportPage = () => {
  const [fileType, setFileType] = useState<'shp'>()
  const [fileName, setFileName] = useState<string>()
  const [arrayBuffers, setArrayBuffers] = useState<ArrayBuffer[]>()
  const [, setIsLoading] = useSidebarActivityLoader()
  const isInitializingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileReadVersion = useRef(0)
  useEffect(
    () => () => {
      fileReadVersion.current += 1
    },
    []
  )
  const router = useAppRouter()
  const buildAppRouteHref = useAppRouteHrefBuilder()
  const { t } = useTranslate('luonnonmetsakartat')
  const dialogOpenedRef = useRef(false)
  const localFolayerPostMutation = useMutation(
    useAdminFolayerPostMutationOptions()
  )

  useEffect(() => {
    if (inputRef.current && !dialogOpenedRef.current) {
      dialogOpenedRef.current = true
      inputRef.current.click()
    }
  }, [])

  const initializePlan = async (params: {
    indexingStrategy: IndexingStrategy
    nameCol: string
    municipalityCol: string
    name: string
    colorCode: string
    isVisible: boolean
    idCol?: string
    regionCol?: string
    descriptionCol?: string
    areaCol?: string
  }) => {
    if (!arrayBuffers || arrayBuffers.length === 0) {
      return
    }

    const {
      indexingStrategy,
      nameCol,
      municipalityCol,
      name,
      colorCode,
      isVisible,
      idCol,
      regionCol,
      descriptionCol,
      areaCol,
    } = params

    localFolayerPostMutation.mutate({
      colOptions: {
        indexingStrategy: indexingStrategy,
        nameCol: nameCol,
        municipalityCol: municipalityCol,
        regionCol: regionCol,
        descriptionCol: descriptionCol,
        areaCol: areaCol,
        idCol: idCol,
      },
      name,
      isHidden: !isVisible,
      colorCode: colorCode,
      rawShapefile: arrayBuffers[0],
    })
  }

  useEffect(() => {
    if (localFolayerPostMutation.isSuccess) {
      const id = localFolayerPostMutation.data.id
      const route = buildAppRouteHref({
        routeKey: APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN_FOLAYER,
        routeParams: {
          folayerIdSlug: id,
        },
      })
      router.push(route, { locale: false })
      return
    }

    if (localFolayerPostMutation.isError) {
      setIsLoading(false)
    }

    if (localFolayerPostMutation.isPending) {
      setIsLoading(true)
    }
  }, [
    localFolayerPostMutation.data,
    localFolayerPostMutation.isError,
    localFolayerPostMutation.isPending,
    localFolayerPostMutation.isSuccess,
    buildAppRouteHref,
    router,
    setIsLoading,
  ])

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const version = ++fileReadVersion.current
    const reader = new window.FileReader()
    setFileName(file.name)
    setFileType('shp')
    setArrayBuffers(undefined)
    reader.onloadend = () => {
      if (fileReadVersion.current !== version) return
      // Empty input deliberately follows the same visible parse-failure path.
      setArrayBuffers([
        reader.result instanceof ArrayBuffer
          ? reader.result
          : new ArrayBuffer(0),
      ])
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleFinish = async ({
    indexingStrategy,
    idCol,
    nameCol,
    municipalityCol,
    regionCol,
    descriptionCol,
    areaCol,
    name,
    colorCode,
    isVisible,
  }: {
    indexingStrategy: IndexingStrategy
    idCol?: string
    nameCol: string
    municipalityCol: string
    regionCol?: string
    descriptionCol?: string
    areaCol?: string
    name?: string
    colorCode?: string
    isVisible?: boolean
  }) => {
    if (isInitializingRef.current) {
      return
    }
    if (
      nameCol == null ||
      municipalityCol == null ||
      name == null ||
      colorCode == null ||
      isVisible == null
    ) {
      console.error(
        'nameCol, municipalityCol, name, color code and isiVisible are required'
      )
      return
    }
    if (indexingStrategy === 'id' && !idCol) {
      console.error('idCol is required when indexingStrategy is "id"')
      return
    }

    try {
      await initializePlan({
        indexingStrategy,
        nameCol,
        municipalityCol,
        name,
        colorCode,
        isVisible,
        idCol,
        regionCol,
        descriptionCol,
        areaCol,
      })
    } catch (e) {
      console.error(e)
    }
    // TODO: throw error if id is null, i.e. if file is invalid

    isInitializingRef.current = false
  }

  return (
    <SidebarContentBox>
      <BigMenuButton
        variant="outlined"
        component="label"
        aria-label={fileName ?? t('sidebar.admin.create.select_file')}
        sx={{
          width: '100%',
          height: 'auto',
          minHeight: '60px',
          alignItems: 'center',
          gap: 2,
          py: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box
          component="span"
          sx={{
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
          }}
        >
          {fileName ? fileName : t('sidebar.admin.create.select_file')}
        </Box>
        <input
          hidden
          accept=".zip"
          multiple
          type="file"
          onChange={handleFileInput}
          ref={inputRef}
        />
        <Upload
          aria-hidden="true"
          sx={{
            width: '24px',
            height: '24px',
            flex: '0 0 auto',
          }}
        />
      </BigMenuButton>

      {fileType === 'shp' && arrayBuffers && arrayBuffers?.length > 0 && (
        <Box sx={{ mt: { mobile: 3, desktop: 4 }, minWidth: 0 }}>
          <FolayerImportShp
            fileBuffers={arrayBuffers}
            onFinish={handleFinish}
            isInitializing={localFolayerPostMutation.isPending}
          ></FolayerImportShp>
        </Box>
      )}
    </SidebarContentBox>
  )
}

export default LuonnonmetsakartatAdminImportPage
