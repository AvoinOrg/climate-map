/** @jsxImportSource @emotion/react */
'use client'

import { useMapStore } from '#/common/store'
import { MainMenu } from '#/components/Sidebar'
import { useEffect } from 'react'

const Page = () => {
  const setMapContext = useMapStore((state) => state.setMapContext)

  useEffect(() => {
    setMapContext('main')
  }, [])

  return (
    <>
      <MainMenu />
    </>
  )
}

export default Page
