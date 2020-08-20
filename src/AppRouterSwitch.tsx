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
import Hiiliporssi from './components/Sidebar/Hiiliporssi'
import OverlayMessages from './components/OverlayMessages';

export default function AppRouterSwitch() {
  return (
    <Router>
      <MapButtons />
      <NavBar/>
      <OverlayMessages/>
      <URLLayerSyncContainer>
        <Sidebar>
          <Switch>
            <Route path="/">
              <Hiiliporssi />
            </Route>
          </Switch>
        </Sidebar>
      </URLLayerSyncContainer>
    </Router>
  );
}
