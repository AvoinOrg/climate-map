'use client'

import React from 'react'

import MainMenu from './components/MainMenu'
import { AppStateProvider } from './state/AppState'

const CarbonMap = () => {
  return (
    <AppStateProvider>
      <MainMenu />
    </AppStateProvider>
  )
}

export default CarbonMap
