import { useTranslate } from '@tolgee/react'
import { Box } from '#/common/style/theme'
import { Button } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { SidebarPanelExtensionPageContainer } from '#/components/Sidebar/SidebarPanelExtensionPageContainer'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'
import EnergyAreaControls from 'applets/energy/components/EnergyAreaControls'

const ns = 'energiakartta'
const prefix = 'sidebar.area_map.'
export const getAreaSourceName = ({
  names,
  locale,
  code,
}: {
  names: { fi?: string | null; sv?: string | null; en?: string | null }
  locale: string
  code: string
}) =>
  [names[locale as keyof typeof names], names.fi, names.sv, names.en].find(
    (name) => name?.trim()
  ) ?? code
const EnergyAreaDetailPanel = ({ locale }: { locale: string }) => {
  const { t } = useTranslate(ns)
  const runtime = useEnergyAreaRuntime()
  const { request, detail, detailProblem } = runtime
  if (!request) return null
  const number = new Intl.NumberFormat(locale)
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
  const name = detail
    ? getAreaSourceName({ names: detail.names, locale, code: request.areaCode })
    : request.areaCode
  return (
    <SidebarPanelExtensionPageContainer
      onClose={runtime.close}
      closeAriaLabel={t(`${prefix}close`)}
      contentSx={{
        p: { mobile: 2, desktop: 3 },
        pb: { mobile: 8, desktop: 3 },
        gap: 2,
        overflowWrap: 'anywhere',
      }}
    >
      <Box data-testid="energy-area-detail" aria-label={t(`${prefix}detail`)}>
        <Box component="h1" sx={{ m: 0, fontSize: '1.2rem', lineHeight: 1.4 }}>
          {name}
        </Box>
        <Box component="p" sx={{ my: 1 }}>
          <TText
            ns={ns}
            keyName={`${prefix}identity`}
            params={{
              level: t(`${prefix}mode.${request.level}`),
              code: request.areaCode,
            }}
          />
        </Box>
        <Box aria-live="polite" aria-busy={runtime.detailLoading}>
          {runtime.detailLoading && (
            <TText ns={ns} keyName={`${prefix}detail_loading`} />
          )}
          {detailProblem && (
            <Box role="alert">
              <TText ns={ns} keyName={`${prefix}error.${detailProblem}`} />
              <Button
                size="small"
                onClick={runtime.retryDetail}
                aria-label={t(`${prefix}retry_detail`)}
              >
                <TText ns={ns} keyName={`${prefix}retry_detail`} />
              </Button>
            </Box>
          )}
          {detail && (
            <>
              {detail.building_count === 0 && (
                <Box component="p">
                  <TText ns={ns} keyName={`${prefix}empty`} />
                </Box>
              )}
              <Box
                component="dl"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  columnGap: 2,
                  rowGap: 1.5,
                  '& dt': { fontWeight: 600 },
                  '& dd': { m: 0 },
                }}
              >
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}building_count`} />
                </Box>
                <Box component="dd">
                  <TText
                    ns={ns}
                    keyName={`${prefix}buildings`}
                    params={{ count: detail.building_count }}
                  />
                </Box>
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}valid_count`} />
                </Box>
                <Box component="dd">
                  {number.format(detail.valid_official_class_count)}
                </Box>
                <Box component="dt">
                  <TText
                    ns={ns}
                    keyName={`${prefix}metric.certificate_coverage`}
                  />
                </Box>
                <Box component="dd">
                  {detail.certificate_coverage == null ? (
                    <TText ns={ns} keyName={`${prefix}value_unavailable`} />
                  ) : (
                    percent.format(detail.certificate_coverage)
                  )}
                </Box>
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}boundary_vintage`} />
                </Box>
                <Box component="dd">{String(detail.boundary_vintage)}</Box>
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}as_of`} />
                </Box>
                <Box component="dd">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeZone: 'UTC',
                  }).format(new Date(`${detail.as_of}T00:00:00Z`))}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
      <EnergyAreaControls locale={locale} />
    </SidebarPanelExtensionPageContainer>
  )
}
export default EnergyAreaDetailPanel
