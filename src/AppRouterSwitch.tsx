import React from 'react';
import {
  BrowserRouter as Router,
  // Route, Switch
} from "react-router-dom";
import { makeStyles, Theme, createStyles } from '@material-ui/core';

// import App from './components/App';
import Sidebar from './components/Sidebar';

// se on taa ?_?
// toi on kai oikein nyt
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
  // const classes = useStyles({});
  // emt onks sit eri versio kaytossa jostai jos npm install kaikkee? mut ei sinansa kai ongelma kunhan vaa laittaa ne propsit?
  // tai emt miten ne propsit toimii? Sen tyypin nimi on StyleHook kuitenki? mihin se hook menee?

  return (
    <Router>
      <Sidebar />
      {/* <div className={classes.root}> */}
      {/* <main className={classes.content}> */}
      {/* <Switch>
            <Route path="/" exact component={App} />
            <Route path="/info" component={App} />
          </Switch> */}
      {/* </main> */}
      {/* </div> */}
    </Router>
  );
}
