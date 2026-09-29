import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslate } from '@tolgee/react'
import { useMutation } from '@tanstack/react-query'

import { Box, type AppSxProps, type AppTheme } from '#/common/style/theme'
import {
  MOBILE_SIDEBAR_PADDING_REM,
  SIDEBAR_PADDING_REM,
} from '#/common/style/theme/constants'
import { useSidebarActivityLoader } from '#/common/hooks/ui/useSidebarActivityLoader'
import { SidebarContentBox } from '#/components/Sidebar'
import { Button } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { SaveOutlined } from '#/components/icons'
import { useAdminFolayerPatchMutationOptions } from 'applets/luonnonmetsakartat/common/queries/adminFolayerPatchMutation'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import FolayerImportPictures, {
  FolayerImportPicturesRef,
  FolayerImportPicturesValues,
} from 'applets/luonnonmetsakartat/components/FolayerImportPictures'
import { FolayerConfState } from 'applets/luonnonmetsakartat/common/types'
import { LoadingSpinner } from '#/components/Loading'
import { useAppParams } from '#/common/navigation/navigation'
import { useLuonnonmetsakartatMockScenarioQueryState } from 'applets/luonnonmetsakartat/common/mockScenarios/queryState'
import {
  createLuonnonmetsakartatMockPicturesMappedFixtureState,
  createLuonnonmetsakartatMockPicturesUnmatchedFixtureState,
} from 'applets/luonnonmetsakartat/common/mockScenarios/seedData'

const picturesRootSx = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  minHeight: 0,
} as const

const picturesSidebarOuterSx = {
  position: 'relative',
  flex: '1 1 auto',
  minHeight: 0,
} as const

const picturesContentSx = {
  display: 'flex',
  flexDirection: 'column',
  pb: {
    mobile: 3,
    desktop: 5,
  },
  minWidth: 0,
} as const

const saveFooterSx = (theme: AppTheme) => ({
  display: 'flex',
  flex: '0 0 auto',
  flexDirection: 'column',
  px: {
    mobile: `${MOBILE_SIDEBAR_PADDING_REM}rem`,
    desktop: `${SIDEBAR_PADDING_REM}rem`,
  },
  pt: {
    mobile: 1.5,
    desktop: 1.75,
  },
  pb: {
    mobile: '6rem',
    desktop: 1.75,
  },
  zIndex: theme.zIndex.drawer + 1,
  borderTop: 1,
  borderColor: 'primary.lighter',
  backgroundColor: theme.palette.neutral.light,
})

const saveButtonSx: AppSxProps = {
  display: 'inline-flex',
  width: '100%',
  minWidth: 0,
  minHeight: '36px',
  justifyContent: 'flex-start',
  alignSelf: 'flex-start',
  px: 0,
  py: 0.5,
  color: 'neutral.darker',
  typography: 'body1',
  fontWeight: 700,
  lineHeight: 1.35,
  gap: 1,
  textAlign: 'left',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  '&:hover': {
    backgroundColor: 'transparent',
    color: 'neutral.darker',
  },
  '&:disabled, &[data-disabled], &[aria-disabled="true"]': {
    color: 'neutral.dark',
    backgroundColor: 'transparent',
    opacity: 0.75,
    cursor: 'not-allowed',
  },
}

const LuonnonmetsakartatAdminLayerFolayerPicturesPage = () => {
  const [, setIsLoading] = useSidebarActivityLoader()
  const [isReadyToSave, setIsReadyToSave] = useState(false)
  const [componentKey, setComponentKey] = useState(0)
  const picturesRef = useRef<FolayerImportPicturesRef>(null)
  const params = useAppParams<{ folayerIdSlug: string }>()
  const { t } = useTranslate('luonnonmetsakartat')
  const mockScenarioState = useLuonnonmetsakartatMockScenarioQueryState()

  const adminFolayerConf = useAppletStore(
    (state) => state.adminFolayerConfs[params.folayerIdSlug]
  )

  const localAdminFolayerPatchMutation = useMutation(
    useAdminFolayerPatchMutationOptions()
  )

  useEffect(() => {
    if (!localAdminFolayerPatchMutation.isPending) {
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }
  }, [localAdminFolayerPatchMutation.isPending, setIsLoading])

  const handleSaveClick = async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()

    if (adminFolayerConf && !localAdminFolayerPatchMutation.isPending) {
      const picValues = await new Promise<FolayerImportPicturesValues | null>(
        (resolve) => {
          if (!picturesRef.current) return resolve(null)
          picturesRef.current.getValues((vals) => resolve(vals))
        }
      )

      if (picValues && picValues.bulkImages?.length) {
        const payload = {
          id: adminFolayerConf.id,
          bulkImages: picValues.bulkImages,
          bulkAreaIds: picValues.bulkAreaIds,
        } as unknown as Parameters<
          typeof localAdminFolayerPatchMutation.mutate
        >[0]
        localAdminFolayerPatchMutation.mutate(payload, {
          onSuccess: () => {
            setIsReadyToSave(false)
            setComponentKey((prev) => prev + 1)
          },
        })
        setIsLoading(true)
      }
    }
  }

  const isFolayerReady =
    adminFolayerConf && adminFolayerConf.state === FolayerConfState.Idle
  const pictureFixtureState = useMemo(
    () =>
      mockScenarioState === 'pictures-mapped'
        ? createLuonnonmetsakartatMockPicturesMappedFixtureState()
        : mockScenarioState === 'pictures-unmatched'
          ? createLuonnonmetsakartatMockPicturesUnmatchedFixtureState()
          : undefined,
    [mockScenarioState]
  )

  return (
    <Box sx={picturesRootSx}>
      <SidebarContentBox sxOuter={picturesSidebarOuterSx}>
        {!isFolayerReady && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <LoadingSpinner></LoadingSpinner>
          </Box>
        )}
        {isFolayerReady && (
          <Box sx={picturesContentSx}>
            <FolayerImportPictures
              key={`${componentKey}-${mockScenarioState ?? 'normal'}`}
              folayerId={adminFolayerConf.id}
              disabled={localAdminFolayerPatchMutation.isPending}
              ref={picturesRef}
              onValidationChange={setIsReadyToSave}
              fixtureState={pictureFixtureState}
            />
          </Box>
        )}
      </SidebarContentBox>
      {isReadyToSave && (
        <Box sx={saveFooterSx}>
          <Button
            type="button"
            variant="text"
            color="neutral"
            aria-label={t('sidebar.admin.folayer.pictures.save')}
            disabled={localAdminFolayerPatchMutation.isPending}
            onClick={handleSaveClick}
            startIcon={
              <SaveOutlined sx={{ width: '1.25rem', height: '1.25rem' }} />
            }
            sx={saveButtonSx}
          >
            <TText
              keyName={'sidebar.admin.folayer.pictures.save'}
              ns={'luonnonmetsakartat'}
            />
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default LuonnonmetsakartatAdminLayerFolayerPicturesPage
