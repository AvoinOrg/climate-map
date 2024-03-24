'use client'

import React, { useEffect } from 'react'
import { Box } from '@mui/material'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

import { routeTree } from '../common/routes'
import { SidebarHeader } from '#/components/Sidebar'
import { BreadcrumbNav } from '#/components/Sidebar'
import AppletWrapper from '#/components/common/AppletWrapper'

import { SIDEBAR_WIDTH_REM } from '../common/constants'
import { planIdsQuery } from '../common/queries/planIdsQuery'
import { planQueries } from '../common/queries/planQueries'

const localizationNamespace = 'hiilikartta'
const defaultLanguage = 'fi'

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession()

  const SidebarHeaderElement = (
    <SidebarHeader title={'Hiilikartta'}>
      <Box sx={{ mt: 8, maxWidth: SIDEBAR_WIDTH_REM - 6 + 'rem' }}>
        <BreadcrumbNav routeTree={routeTree}></BreadcrumbNav>
      </Box>
    </SidebarHeader>
  )

  const planIds = useQuery({ ...planIdsQuery(), enabled: false })

  const serverIds = planIds.data || []
  const planQs = useQueries(planQueries(serverIds))

  useEffect(() => {
    if (session?.user?.id) {
      planIds.refetch()
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id && planIds.data) {
      planQs.forEach((planQ) => {
        planQ.refetch()
      })
    }
  }, [session?.user?.id, planIds.data])

  return (
    <AppletWrapper
      mapContext={'hiilikartta'}
      localizationNamespace={localizationNamespace}
      defaultLanguage={defaultLanguage}
      SidebarHeaderElement={SidebarHeaderElement}
      sx={{
        pt: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </AppletWrapper>
  )
}

export default Layout
