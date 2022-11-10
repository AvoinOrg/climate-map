import React from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@mui/material/styles'

import './style/index.css'
import './style/mapbox.css'
import App from 'Components/App'

// import * as serviceWorker from "./serviceWorker";

// declare module '@mui/styles/defaultTheme' {
//   // eslint-disable-next-line @typescript-eslint/no-empty-interface
//   interface DefaultTheme extends Theme {}
// }

const container = document.getElementById('root')
const root = createRoot(container)

root.render(<App />)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
