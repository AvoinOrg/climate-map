import { useTranslate } from '@tolgee/react'
import { Box } from '#/common/style/theme'
import { Button } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'

// Only genuine tile failures have UI. There is no generic area information card.
const EnergyAreaTileError = () => {
  const runtime = useEnergyAreaRuntime()
  const { t } = useTranslate('energiakartta')
  if (!runtime.tileFailed) return null
  return (
    <Box role="alert" sx={{ my: 1 }}>
      <TText ns="energiakartta" keyName="sidebar.area_map.tile_failed" />
      <Button
        size="small"
        onClick={runtime.retryTiles}
        aria-label={t('sidebar.area_map.retry_tiles')}
      >
        <TText ns="energiakartta" keyName="sidebar.area_map.retry_tiles" />
      </Button>
    </Box>
  )
}
export default EnergyAreaTileError
