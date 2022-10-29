import React from 'react'
import { Route, Switch } from 'react-router-dom'

import { CarbonMap, MainMenu } from 'Components/Sidebar'

const Routes = () => {
  return (
    <Switch>
      {/* <Route path="/layers/fi-forest">
                <ForestArvometsa />
              </Route>
              <Route path="/layers/fi-omaihka">
                <Omaihka />
              </Route>
              <Route path="/layers/fao-images-2021">
                <FaoImages2021 />
              </Route>
              <Route path="/layers/kariba_changes">
                <KaribaForestCoverChanges />
              </Route>
              <Route path="/layers/fi-ffd/:area">
                <FFD />
              </Route>
              <Route path="/layers/fi-ffd">
                <FFD />
              </Route>
              <Route path="/layers/ekofolio">
                <Ekofolio />
              </Route> */}
      {/* <Route path="/layers/:layer">
          <LayerRouter />
        </Route> */}
      <Route path="/carbon">
        <CarbonMap />
      </Route>
      {/* <Route path="/verify/:token">
          <VerificationRouter />
        </Route> */}
      <Route path="/">
        <MainMenu />
      </Route>
    </Switch>
  )
}

export default Routes
