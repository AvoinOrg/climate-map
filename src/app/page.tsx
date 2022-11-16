'use client'

import React from 'react'
import { MainMenu } from '#/components/Sidebar'

const Page = ({
  // Layouts must accept a children prop.
  // This will be populated with nested layouts or pages
  children,
}: {
  children: React.ReactNode
}) => {
  return <MainMenu>{children}</MainMenu>
}

export default Page
