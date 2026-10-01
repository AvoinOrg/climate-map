import React from 'react'

import { BreadcrumbNav, SidebarBoundary } from '#/components/Sidebar'
import EnergyAreaRuntime from 'applets/energy/components/EnergyAreaRuntime'
import AppletWrapper from '#/components/common/AppletWrapper'
import { listedLayerGroups } from '../common/constants'

const localizationNamespace = 'energiakartta'
const HELSINKI_DEFAULT_VIEW = {
  center: [24.9384, 60.1699] as [number, number],
  zoom: 12,
  duration: 0,
}

const EnergyAppletRuntime = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarBoundary
      id="energiakartta-floating"
      mode="floating"
      config={{
        width: 'compact',
      }}
    >
      <AppletWrapper
        mapContext="energy"
        localizationNamespace={localizationNamespace}
        isNavbarHidden={true}
        defaultView={HELSINKI_DEFAULT_VIEW}
        listedLayerGroups={listedLayerGroups}
        sidebarHeaderTitle={'Energiakartta'}
        sidebarHeaderChildren={
          <BreadcrumbNav collapseIfRoot={true}></BreadcrumbNav>
        }
        sx={{
          pt: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <EnergyAreaRuntime>{children}</EnergyAreaRuntime>
      </AppletWrapper>
    </SidebarBoundary>
  )
}

export default EnergyAppletRuntime
