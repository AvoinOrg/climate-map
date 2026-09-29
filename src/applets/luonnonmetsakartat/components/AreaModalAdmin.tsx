import React, { useEffect, useMemo, useState } from 'react'
import { useTranslate } from '@tolgee/react'
import { useMutation } from '@tanstack/react-query'

import { Box, type AppSxProps } from '#/common/style/theme/system'
import { Button, IconButton } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { Cross, SaveOutlined } from '#/components/icons'
import type { PopupProps } from '#/common/types/map'
import TextFieldWithLabel from '#/components/common/TextFieldWithLabel'
import TextFieldMultilineWithLabel from '#/components/common/TextFieldMultilineWithLabel'
import { MapModalWrapper } from '#/components/Map/MapModalWrapper'
import { SCROLLBAR_WIDTH_REM } from '#/common/style/theme/constants'
import { LoadingSpinner } from '#/components/Loading'

import { useAdminFolayerAreaPatchMutationOptions } from '../common/queries/adminFolayerAreaPatchMutation'
import { useAppletStore } from '../state/appletStore'
import type { FolayerFeature, FolayerFeatureProperties } from '../common/types'
import { MasonryPhotoAlbum } from 'react-photo-album'
import 'react-photo-album/masonry.css'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

interface Props extends PopupProps<FolayerFeatureProperties> {
  folayerId: string
  fixtureState?: {
    unsyncedChanges?: boolean
    isUpdating?: boolean
    lightboxIndex?: number
  }
}

type ImgproxyOptions = {
  width?: number
  height?: number
  resize?: 'cover' | 'contain' | 'fill'
  quality?: number
  dpr?: number
}

const THUMB_TARGET_W = 200
const ADMIN_MODAL_WIDTH = '37.5rem'
const CLOSE_BUTTON_SIZE = 44
const GALLERY_BREAKPOINT_PX = 420

const textFieldControlSx = {
  display: 'block',
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
} satisfies AppSxProps

const descriptionControlSx = {
  ...textFieldControlSx,
  minHeight: { mobile: '9rem', desktop: '11rem' },
  maxHeight: { mobile: '13.5rem', desktop: '18rem' },
  lineHeight: 1.35,
  overflowY: 'auto',
} satisfies AppSxProps

// Supabase object URL -> imgproxy render URL helper.
const toImgproxy = (
  url: string,
  {
    width = 400,
    height,
    resize = 'cover',
    quality = 80,
    dpr = 2,
  }: ImgproxyOptions = {}
) => {
  if (!url) return url
  const renderUrl = url.replace('/object/', '/render/image/')
  const params = new URLSearchParams()
  if (width) params.set('width', String(width))
  if (height) params.set('height', String(height))
  if (resize) params.set('resize', resize)
  if (quality) params.set('quality', String(quality))
  if (dpr) params.set('dpr', String(dpr))
  return `${renderUrl}?${params.toString()}`
}

type AreaModalAdminContentProps = {
  feature: FolayerFeature | null
  folayerId: string
  onClose?: () => void
  fixtureState?: Props['fixtureState']
}

const AreaModalAdminContent = ({
  feature,
  folayerId,
  onClose,
  fixtureState,
}: AreaModalAdminContentProps) => {
  const { t } = useTranslate('luonnonmetsakartat')
  const [name, setName] = useState(feature?.properties.name || '')
  const [description, setDescription] = useState(
    feature?.properties.description || ''
  )
  const [municipality, setMunicipality] = useState(
    feature?.properties.municipality || ''
  )
  const [region, setRegion] = useState(feature?.properties.region || '')
  const [unsyncedChanges, setUnsyncedChanges] = useState(
    fixtureState?.unsyncedChanges ?? false
  )
  const localAdminFolayerAreaPatchMutation = useMutation(
    useAdminFolayerAreaPatchMutationOptions()
  )
  const [lightboxIndex, setLightboxIndex] = useState<number>(
    fixtureState?.lightboxIndex ?? -1
  )

  const pictures: string[] = useMemo(() => {
    let rawPictures = feature?.properties?.pictures as unknown
    // GET collections normalize pictures, while metadata PATCH responses may
    // still contain the backend's JSON string. Preserve the saved gallery.
    if (typeof rawPictures === 'string') {
      try {
        rawPictures = JSON.parse(rawPictures)
      } catch {
        return []
      }
    }

    return Array.isArray(rawPictures)
      ? rawPictures.filter((picture): picture is string =>
          typeof picture === 'string'
        )
      : []
  }, [feature])

  const initialPhotos = useMemo(
    () =>
      pictures.map((u) => ({
        src: toImgproxy(u, {
          width: THUMB_TARGET_W,
          quality: 80,
          dpr: 2,
        }),
        originalSrc: u,
        width: THUMB_TARGET_W,
        height: Math.round(THUMB_TARGET_W * 0.75),
      })),
    [pictures]
  )
  const [photoHeightsBySrc, setPhotoHeightsBySrc] = useState<
    Record<string, number>
  >({})
  const photos = useMemo(
    () =>
      initialPhotos.map((photo) => ({
        src: photo.src,
        width: photo.width,
        height: photoHeightsBySrc[photo.src] ?? photo.height,
      })),
    [initialPhotos, photoHeightsBySrc]
  )
  const slides = useMemo(() => pictures.map((u) => ({ src: u })), [pictures])

  useEffect(() => {
    if (initialPhotos.length === 0) {
      return
    }

    let cancelled = false

    initialPhotos.forEach((photo) => {
      const updateMeasuredHeight = (src: string, image: HTMLImageElement) => {
        if (cancelled) {
          return
        }

        const naturalWidth = image.naturalWidth || THUMB_TARGET_W
        const naturalHeight =
          image.naturalHeight || Math.round(THUMB_TARGET_W * 0.75)
        const ratio = naturalHeight / (naturalWidth || 1)
        const finalHeight = Math.max(1, Math.round(THUMB_TARGET_W * ratio))

        setPhotoHeightsBySrc((prev) =>
          prev[src] === finalHeight ? prev : { ...prev, [src]: finalHeight }
        )
      }

      const img = new Image()
      img.onload = () => updateMeasuredHeight(photo.src, img)
      img.onerror = () => {
        const fallbackSrc = toImgproxy(photo.originalSrc, {
          width: THUMB_TARGET_W,
          resize: 'cover',
          quality: 80,
          dpr: 2,
        })
        const fallbackImg = new Image()
        fallbackImg.onload = () =>
          updateMeasuredHeight(fallbackSrc, fallbackImg)
        fallbackImg.src = fallbackSrc
      }
      img.src = photo.src
    })

    return () => {
      cancelled = true
    }
  }, [initialPhotos])

  const handleClose = () => {
    onClose?.()
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setUnsyncedChanges(true)
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    setUnsyncedChanges(true)
  }

  const handleMunicipalityChange = (value: string) => {
    setMunicipality(value)
    setUnsyncedChanges(true)
  }

  const handleRegionChange = (value: string) => {
    setRegion(value)
    setUnsyncedChanges(true)
  }

  const handleSaveClick = () => {
    if (!feature || isUpdating) {
      return
    }

    localAdminFolayerAreaPatchMutation.mutate(
      {
        layerId: folayerId,
        featureId: feature.id as string,
        properties: {
          name: name,
          description: description,
          municipality: municipality,
          region: region,
        },
      },
      {
        onSuccess: () => setUnsyncedChanges(false),
      }
    )
  }

  const minWidthBeforeFullScreen = 600
  const isUpdating =
    fixtureState?.isUpdating ?? localAdminFolayerAreaPatchMutation.isPending

  return (
    <MapModalWrapper minWidthBeforeFullScreen={minWidthBeforeFullScreen}>
      <Box
        data-testid="luonnonmetsakartat-admin-area-modal"
        sx={{
          backgroundColor: '#3E3E3E',
          color: '#A9E7CB',
          width: ADMIN_MODAL_WIDTH,
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: '0.625rem',
          maxHeight: 'min(80rem, 100%)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            minHeight: { mobile: '3.5rem', desktop: '4rem' },
            borderBottom: '1px solid',
            borderColor: 'neutral.dark',
            px: { mobile: 1, desktop: 1.25 },
            flex: '0 0 auto',
          }}
        >
          <IconButton
            aria-label="Close admin area modal"
            onClick={handleClose}
            type="button"
            sx={{
              width: CLOSE_BUTTON_SIZE,
              minWidth: CLOSE_BUTTON_SIZE,
              height: CLOSE_BUTTON_SIZE,
              borderRadius: '50%',
              borderColor: 'transparent',
              color: (theme) => theme.palette.grey[500],
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
            }}
          >
            <Cross sx={{ width: '1.125rem', height: '1.125rem' }} />
          </IconButton>
        </Box>
        {feature && (
          <Box
            sx={(theme) => ({
              overflowY: 'auto',
              minHeight: 0,
              minWidth: 0,
              flex: '1 1 auto',
              boxSizing: 'border-box',
              pt: { mobile: 2.5, desktop: 3 },
              pb: { mobile: 2.5, desktop: 3 },
              pr: { mobile: 2, desktop: 2.5 },
              pl: {
                mobile: 2,
                desktop: `${2 + SCROLLBAR_WIDTH_REM}rem`,
              },
              scrollbarGutter: 'stable',
              '@supports selector(::-webkit-scrollbar)': {
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#878787',
                },
              },
              '@supports not selector(::-webkit-scrollbar)': {
                scrollbarColor: `${theme.palette.neutral.main} transparent`,
              },
            })}
          >
            <TextFieldWithLabel
              label={t('sidebar.admin.area.name.header')}
              placeholder={t('sidebar.admin.area.name.placeholder')}
              disabled={isUpdating}
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              sx={{ mb: 2, textTransform: 'uppercase' }}
              textFieldSx={textFieldControlSx}
            />

            <TextFieldWithLabel
              label={t('sidebar.admin.area.region.header')}
              placeholder={t('sidebar.admin.area.region.placeholder')}
              disabled={isUpdating}
              value={region}
              onChange={(event) => handleRegionChange(event.target.value)}
              sx={{ mb: 2 }}
              textFieldSx={textFieldControlSx}
            />
            <TextFieldWithLabel
              label={t('sidebar.admin.area.municipality.header')}
              placeholder={t('sidebar.admin.area.municipality.placeholder')}
              disabled={isUpdating}
              value={municipality}
              onChange={(event) => handleMunicipalityChange(event.target.value)}
              sx={{ mb: 2 }}
              textFieldSx={textFieldControlSx}
            />
            <TextFieldMultilineWithLabel
              label={t('sidebar.admin.area.description.header')}
              placeholder={t('sidebar.admin.area.description.placeholder')}
              disabled={isUpdating}
              value={description}
              onChange={(event) => handleDescriptionChange(event.target.value)}
              minRows={6}
              maxRows={12}
              sx={{ mb: 2 }}
              textFieldSx={descriptionControlSx}
            />
            {pictures.length > 0 && (
              <Box sx={{ mt: { mobile: 2.5, desktop: 3 }, minWidth: 0 }}>
                <Box
                  component="p"
                  sx={{
                    m: 0,
                    typography: 'body1',
                    overflowWrap: 'anywhere',
                  }}
                >
                  <TText
                    ns="luonnonmetsakartat"
                    keyName={'sidebar.admin.area.pictures.header'}
                  />
                </Box>
                <Box
                  sx={{
                    mt: 1,
                    minWidth: 0,
                    '& img': {
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      objectFit: 'cover',
                      borderRadius: '0.25rem',
                      backgroundColor: 'transparent',
                    },
                    '& button': {
                      cursor: 'zoom-in',
                    },
                  }}
                >
                  <MasonryPhotoAlbum
                    photos={photos}
                    columns={(containerWidth) =>
                      (containerWidth ?? 0) < GALLERY_BREAKPOINT_PX ? 1 : 2
                    }
                    spacing={(containerWidth) =>
                      (containerWidth ?? 0) < GALLERY_BREAKPOINT_PX ? 8 : 10
                    }
                    defaultContainerWidth={360}
                    onClick={({ index }) => setLightboxIndex(index)}
                  />
                  <Lightbox
                    open={lightboxIndex >= 0}
                    close={() => setLightboxIndex(-1)}
                    slides={slides}
                    index={lightboxIndex}
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            minHeight: { mobile: '4.75rem', desktop: '5.5rem' },
            justifyContent: { mobile: 'center', desktop: 'flex-end' },
            alignItems: 'center',
            px: { mobile: 2, desktop: 3.5 },
            py: { mobile: 1.25, desktop: 1.5 },
            boxSizing: 'border-box',
            borderTop: `1px solid`,
            borderColor: 'neutral.dark',
            flex: '0 0 auto',
          }}
        >
          {feature && unsyncedChanges && (
            <Button
              type="button"
              variant="text"
              color="neutral"
              aria-label={t('sidebar.admin.folayer.settings.save')}
              disabled={isUpdating}
              onClick={handleSaveClick}
              startIcon={<SaveOutlined />}
              sx={{
                display: 'inline-flex',
                maxWidth: '100%',
                minWidth: 0,
                minHeight: 44,
                px: 1,
                py: 0.5,
                color: '#A9E7CB',
                typography: 'h3',
                gap: 1,
                whiteSpace: { mobile: 'normal', desktop: 'nowrap' },
                justifyContent: 'center',
                overflowWrap: 'anywhere',
                textAlign: 'center',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              <TText
                keyName={'sidebar.admin.folayer.settings.save'}
                ns={'luonnonmetsakartat'}
              />
            </Button>
          )}
        </Box>
        {isUpdating && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              borderRadius: 'inherit',
              overflow: 'hidden',
            }}
          >
            <LoadingSpinner
              size="5rem"
              variant={fixtureState?.isUpdating ? 'determinate' : 'indeterminate'}
              value={fixtureState?.isUpdating ? 65 : undefined}
            />
          </Box>
        )}
      </Box>
    </MapModalWrapper>
  )
}

const AreaModalAdmin = ({
  features,
  folayerId,
  onClose,
  fixtureState,
}: Props) => {
  const folayerAreaConf = useAppletStore(
    (state) => state.folayerAreaConfs[folayerId]
  )

  const feature = useMemo(() => {
    if (!features?.length || !folayerAreaConf) {
      return null
    }

    return (
      folayerAreaConf.data.features.find((f) => f.id === features[0].id) ?? null
    )
  }, [features, folayerAreaConf])

  return (
    <AreaModalAdminContent
      key={
        feature
          ? `${feature.id}-${feature.properties.updated_ts ?? ''}`
          : 'empty'
      }
      feature={feature}
      folayerId={folayerId}
      onClose={onClose}
      fixtureState={fixtureState}
    />
  )
}

export default AreaModalAdmin
