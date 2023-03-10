'use client'

import React from 'react'

import { AppStateProvider } from './state/AppState'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <AppStateProvider>{children}</AppStateProvider>
}

export default Layout
