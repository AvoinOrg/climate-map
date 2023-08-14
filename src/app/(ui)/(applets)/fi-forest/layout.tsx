'use client'

import React from 'react'

import AppletWrapper from '#/components/common/AppletWrapper'

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <AppletWrapper mapContext={'fi_forests'}>{children}</AppletWrapper>
}

export default Layout
