import { useTranslate } from '@tolgee/react'
import { Button, IconButton } from '#/components/common/Button'
import { SidebarPanelExtensionTooltip } from '#/components/Sidebar/SidebarPanelExtensionTooltip'
import TText from '#/components/common/TText'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'

const EnergyAreaBackButton = ({ iconOnly = false }: { iconOnly?: boolean }) => {
  const runtime = useEnergyAreaRuntime()
  const { t } = useTranslate('energiakartta')
  if (!runtime.canGoBack) return null
  if (iconOnly)
    return (
      <SidebarPanelExtensionTooltip
        title={t('sidebar.area_map.back')}
        side="bottom"
      >
        {(props) => (
          <IconButton
            {...props}
            size="small"
            onClick={runtime.back}
            aria-label={t('sidebar.area_map.back')}
          >
            <span aria-hidden="true">←</span>
          </IconButton>
        )}
      </SidebarPanelExtensionTooltip>
    )
  return (
    <Button
      size="small"
      onClick={runtime.back}
      aria-label={t('sidebar.area_map.back')}
    >
      <TText ns="energiakartta" keyName="sidebar.area_map.back" />
    </Button>
  )
}
export default EnergyAreaBackButton
