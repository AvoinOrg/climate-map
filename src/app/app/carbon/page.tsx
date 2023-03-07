'use client'

import React from 'react'

import MainMenu from './components/MainMenu'
import { StateProvider } from './state/State'

const CarbonMap = () => {
  return (
    <StateProvider>
      <MainMenu />
    </StateProvider>
  )
}

export default CarbonMap
