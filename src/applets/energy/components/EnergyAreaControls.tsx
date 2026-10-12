import { useTranslate } from '@tolgee/react'
import { Box } from '#/common/style/theme'
import TText from '#/components/common/TText'
import DropDownSelectWithLabel from '#/components/common/DropDownSelectWithLabel'
import { Button } from '#/components/common/Button'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'
import {
  AREA_METRIC_BANDS,
  AREA_UNAVAILABLE_COLOR,
  type AreaMetric,
} from 'applets/energy/common/areas/mapModes'

import EnergyAreaBackButton from 'applets/energy/components/EnergyAreaBackButton'

const ns = 'energiakartta'
const prefix = 'sidebar.area_map.'
export const EnergyAreaScope = () => (
  <Box component="p" sx={{ my: 1, fontSize: '.75rem', lineHeight: 1.5 }}>
    <TText ns={ns} keyName={`${prefix}scope`} />
  </Box>
)
const EnergyAreaControls = ({
  locale = 'fi',
  compact = false,
}: {
  locale?: string
  compact?: boolean
}) => {
  const { t } = useTranslate(ns)
  const metric = useAppletStore((state) => state.areaMetric)
  const effective = useAppletStore((state) => state.effectiveGeography)
  const runtime = useEnergyAreaRuntime()
  const format = new Intl.NumberFormat(
    locale,
    metric === 'certificate_coverage'
      ? { style: 'percent', maximumFractionDigits: 0 }
      : {}
  )
  return (
    <Box
      data-testid="energy-area-controls"
      sx={{
        width: '100%',
        minWidth: 0,
        fontSize: '.75rem',
        lineHeight: 1.5,
        overflowWrap: 'anywhere',
      }}
    >
      {(compact || !runtime.request) && <EnergyAreaBackButton />}
      {runtime.status !== 'loading' && runtime.status !== 'updating' && (
        <Button
          size="small"
          onClick={runtime.refresh}
          aria-label={t(`${prefix}refresh`)}
        >
          <TText ns={ns} keyName={`${prefix}refresh`} />
        </Button>
      )}
      {effective !== 'buildings' && (
        <>
          <Box sx={{ my: 1 }}>
            <TText
              ns={ns}
              keyName={`${prefix}current_level`}
              params={{ level: t(`${prefix}mode.${effective}`) }}
            />
          </Box>
          {runtime.request?.municipalityCode && (
            <Box
              component="p"
              sx={{ my: 1 }}
              data-testid="energy-area-polygon-scope"
            >
              <TText
                ns={ns}
                keyName={`${prefix}polygon_scope`}
                params={{ code: runtime.request.municipalityCode }}
              />
            </Box>
          )}
          {compact && <EnergyAreaScope />}
          <details open={!compact}>
            <Box
              component="summary"
              sx={{
                display: compact ? 'list-item' : 'none',
                cursor: 'pointer',
                py: 0.5,
              }}
            >
              <TText
                ns={ns}
                keyName={`${prefix}legend`}
                params={{ metric: t(`${prefix}metric.${metric}`) }}
              />
            </Box>
            <DropDownSelectWithLabel
              value={metric}
              label={t(`${prefix}metric`)}
              ariaLabel={t(`${prefix}metric`)}
              options={(
                ['certificate_coverage', 'building_count'] as const
              ).map((value) => ({
                value,
                label: t(`${prefix}metric.${value}`),
              }))}
              onChange={(event) =>
                useAppletStore
                  .getState()
                  .setAreaMetric(event.target.value as AreaMetric)
              }
            />
            {!compact && <EnergyAreaScope />}
            <Box
              component="ul"
              aria-label={t(`${prefix}legend`, {
                metric: t(`${prefix}metric.${metric}`),
              })}
              sx={{
                listStyle: 'none',
                m: 0,
                p: 0,
                display: 'grid',
                gridTemplateColumns: compact ? '1fr 1fr' : '1fr',
                gap: 0.5,
              }}
            >
              {AREA_METRIC_BANDS[metric].map((band, index, bands) => (
                <Box
                  component="li"
                  key={band.min}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      backgroundColor: band.color,
                      border: '1px solid #44546A',
                    }}
                  />
                  {metric === 'building_count' ? (
                    band.max === null ? (
                      <TText
                        ns={ns}
                        keyName={`${prefix}band.at_least`}
                        params={{ min: format.format(band.min) }}
                      />
                    ) : band.max === 1 ? (
                      format.format(0)
                    ) : (
                      `${format.format(band.min)}–${format.format(band.max - 1)}`
                    )
                  ) : (
                    <TText
                      ns={ns}
                      keyName={`${prefix}band.${index === bands.length - 1 ? 'inclusive' : 'below'}`}
                      params={{
                        min: format.format(band.min),
                        max: format.format(band.max!),
                      }}
                    />
                  )}
                </Box>
              ))}
              <Box
                component="li"
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    backgroundColor: AREA_UNAVAILABLE_COLOR,
                    border: '1px solid #44546A',
                  }}
                />
                <TText ns={ns} keyName={`${prefix}value_unavailable`} />
              </Box>
            </Box>
          </details>
          {runtime.tileFailed && (
            <Box role="alert" sx={{ mt: 1 }}>
              <TText ns={ns} keyName={`${prefix}tile_failed`} />
              <Button
                size="small"
                onClick={runtime.retryTiles}
                aria-label={t(`${prefix}retry_tiles`)}
              >
                <TText ns={ns} keyName={`${prefix}retry_tiles`} />
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
export default EnergyAreaControls
