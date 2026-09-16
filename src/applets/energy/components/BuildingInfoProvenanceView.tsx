import React from 'react'

import { Box } from '#/common/style/theme'
import { Button } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { Cross } from '#/components/icons'
import type {
  EnergymapBuildingInfoMissingData,
  EnergymapBuildingInfoText,
} from 'applets/energy/common/buildingInfo'

const VIEW_TRANSLATION_PREFIX = 'sidebar.building_info.provenance.view'

const MissingInfoText = ({
  text,
  locale,
}: {
  text: EnergymapBuildingInfoText
  locale: string
}) => {
  if (text.type === 'plain') return <>{text.text}</>
  if (text.type === 'sequence')
    return (
      <>
        {text.parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && text.separator}
            <MissingInfoText text={part} locale={locale} />
          </React.Fragment>
        ))}
      </>
    )
  return (
    <TText
      keyName={text.keyName}
      params={text.params}
      ns="energiakartta"
      language={locale}
    />
  )
}

export type BuildingInfoProvenanceViewProps = {
  missingData: EnergymapBuildingInfoMissingData | null
  locale: string
  regionId: string
  headingId: string
  headingRef: React.Ref<HTMLHeadingElement>
  forceMobileLayout?: boolean
  onClose: () => void
}

export const BuildingInfoProvenanceView = ({
  missingData,
  locale,
  regionId,
  headingId,
  headingRef,
  forceMobileLayout = false,
  onClose,
}: BuildingInfoProvenanceViewProps) => (
  <Box
    component="section"
    role="region"
    id={regionId}
    aria-labelledby={headingId}
    data-testid="building-info-provenance-view"
    data-missing-data-status={missingData == null ? 'unavailable' : 'resolved'}
    data-missing-data-locale={locale}
    sx={{
      minWidth: 0,
      px: { mobile: '1rem', desktop: '1.5rem' },
      pt: forceMobileLayout ? '1rem' : { mobile: '1rem', desktop: '6.25rem' },
      pb: { mobile: '8rem', desktop: '1.5rem' },
      backgroundColor: '#f9f9f9',
      color: '#111111',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        mb: '1.5rem',
      }}
    >
      <Box
        component="h2"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        data-testid="building-info-provenance-heading"
        sx={{
          m: 0,
          flex: '1 1 12rem',
          minWidth: 0,
          fontSize: { mobile: '1.25rem', desktop: '1.5rem' },
          fontWeight: 700,
          lineHeight: 1.25,
          '&:focus-visible': {
            outline: '2px solid currentColor',
            outlineOffset: '3px',
          },
        }}
      >
        <TText
          keyName={`${VIEW_TRANSLATION_PREFIX}.heading`}
          ns="energiakartta"
          language={locale}
        />
      </Box>
      <Button
        type="button"
        size="small"
        variant="text"
        startIcon={<Cross aria-hidden="true" sx={{ width: 14, height: 14 }} />}
        onClick={onClose}
      >
        <TText
          keyName={`${VIEW_TRANSLATION_PREFIX}.close`}
          ns="energiakartta"
          language={locale}
        />
      </Button>
    </Box>
    {missingData != null && missingData.items.length > 0 ? (
      <Box
        component="ul"
        sx={{
          m: 0,
          pl: '1.25rem',
          maxWidth: '42rem',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
      >
        {missingData.items.map((item) => (
          <Box
            component="li"
            key={item.id}
            data-testid="building-info-missing-item"
            data-missing-item-id={item.id}
            sx={{ mb: '1rem', overflowWrap: 'anywhere' }}
          >
            <Box component="span" sx={{ fontWeight: 600 }}>
              <MissingInfoText text={item.label} locale={locale} />
            </Box>
            {item.reason != null && (
              <Box
                component="p"
                sx={{ m: 0, mt: '0.25rem', color: 'neutral.darker' }}
              >
                <MissingInfoText text={item.reason} locale={locale} />
              </Box>
            )}
          </Box>
        ))}
      </Box>
    ) : (
      <Box
        component="p"
        role="status"
        sx={{ m: 0, fontSize: '0.875rem', lineHeight: 1.5 }}
      >
        <TText
          keyName={`sidebar.building_info.missing_data.${missingData == null ? 'unavailable' : 'empty'}`}
          ns="energiakartta"
          language={locale}
        />
      </Box>
    )}
  </Box>
)
