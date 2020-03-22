import React from 'react';
import {
  BrowserRouter as Router,
  Route, Switch
} from "react-router-dom";
import { makeStyles, Theme, createStyles } from '@material-ui/core';

import App from './components/App';
import Sidebar from './components/Sidebar';
import NavBar from './components/NavBar';
import MapButtons from './components/MapButtons';

import ForestArvometsa from './components/Sidebar/ForestArvometsa'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
    },
    content: {
      flexGrow: 1,
    },

  }),
);

export default function AppRouterSwitch() {
  const classes = useStyles({});
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <Router>
      <MapButtons />
      <NavBar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className={classes.root}>
        <main className={classes.content}>
          <Switch>
            <Route path="/" exact component={App} />
            <Route path="/info" component={ForestArvometsa} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}
