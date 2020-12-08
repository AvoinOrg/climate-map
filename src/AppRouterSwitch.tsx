import React from 'react';
import {
  BrowserRouter as Router,
  Route, Switch,
} from "react-router-dom";

import './components/App';
import Sidebar from './components/Sidebar';
import NavBar from './components/NavBar';
import MapButtons from './components/MapButtons';

import { URLLayerSyncContainer } from './URLLayerSyncContainer';
import ForestArvometsa from './components/Sidebar/ForestArvometsa'
import Omaihka from './components/Sidebar/Omaihka'
import KaribaForestCoverChanges from './components/Sidebar/KaribaForestCoverChanges'
import FFD from './components/Sidebar/FFD'
import { MainMenu } from './components/Sidebar/Sidebar';
import OverlayMessages from './components/OverlayMessages';
import Ekofolio from './components/Sidebar/Ekofolio';

export default function AppRouterSwitch() {
  return (
    <Router>
      <MapButtons />
      <NavBar/>
      <OverlayMessages/>
      <URLLayerSyncContainer>
        <Sidebar>
          <Switch>
            <Route path="/layers/fi-forest">
              <ForestArvometsa />
            </Route>
            <Route path="/layers/fi-omaihka">
              <Omaihka />
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
            </Route>
            <Route path="/">
              <MainMenu />
            </Route>
          </Switch>
        </Sidebar>
      </URLLayerSyncContainer>
    </Router>
  );
}
