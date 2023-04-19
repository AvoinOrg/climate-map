/** @jsxImportSource @emotion/react */
'use client'

import { MainMenu } from '#/components/Sidebar'
import { SidebarToggleButton } from '#/components/Sidebar'

const Page = () => {
  return (
    <>
      <SidebarToggleButton></SidebarToggleButton>
      <MainMenu />
    </>
  )
}

export default Page
