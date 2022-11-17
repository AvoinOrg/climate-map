'use client'

import React from 'react'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { useServerInsertedHTML } from 'next/navigation'
import { useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'

import theme from '#/style/theme'

const RootStyleRegistry = ({ children }: { children: JSX.Element }) => {
  const [cache] = useState(() => {
    const cache = createCache({ key: 'css' })
    cache.compat = true
    return cache
  })

  useServerInsertedHTML(() => {
    return (
      <style
        data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: Object.values(cache.inserted).join(' '),
        }}
      />
    )
  })

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CacheProvider>
  )
}

export default RootStyleRegistry
