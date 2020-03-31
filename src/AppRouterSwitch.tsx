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
import { MainMenu } from './components/Sidebar/Sidebar';
import OverlayMessages from './components/OverlayMessages';

export default function AppRouterSwitch() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const toggleSidebar = () => { setSidebarOpen(!sidebarOpen) }

  return (
    <Router>
      <MapButtons />
      <NavBar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <OverlayMessages/>
      <URLLayerSyncContainer>
        <Sidebar sidebarOpen={sidebarOpen}>
          <Switch>
            <Route path="/layers/fi-forest">
              <ForestArvometsa />
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
