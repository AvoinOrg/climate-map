import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { clearAdminAccess } from 'applets/luonnonmetsakartat/common/queries/clearAdminAccess'
import { useAuthSession } from '#/common/auth'
import { useUIStore } from '#/common/store/uiStore'
import { useExclusiveLayerGroups } from '#/common/hooks/map/useExclusiveLayerGroups'
import { useAppRouteHrefBuilder } from '#/common/navigation/appRouteLinks'
import { useAppPathname, useAppRouter } from '#/common/navigation/navigation'

import { APP_ROUTE_KEYS } from '#/common/routing/routeMetadata'
import { useAppletStore } from 'applets/luonnonmetsakartat/state/appletStore'
import { useAdminVerificationQueryOptions } from 'applets/luonnonmetsakartat/common/queries/adminVerificationQuery'
import { SidebarContentBox, SidebarLoadingBlock } from '#/components/Sidebar'
import { Box } from '#/common/style/theme'
import { Star } from '#/components/icons'
import TText from '#/components/common/TText'
import { AdminVerificationStatus } from 'applets/luonnonmetsakartat/common/types'
import { useLuonnonmetsakartatMockScenarioQueryState } from 'applets/luonnonmetsakartat/common/mockScenarios/queryState'
import LuonnonmetsakartatLandingSidebar from 'applets/luonnonmetsakartat/components/LuonnonmetsakartatLandingSidebar'

enum LocalState {
  Loading = 'loading',
  Verified = 'verified',
  Rejected = 'rejected',
  Errored = 'errored',
  NoUser = 'noUser',
}

const AdminGateMessage = ({ keyName }: { keyName: string }) => (
  <SidebarContentBox>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 1.5,
        mt: 3,
        width: '100%',
      }}
    >
      <Star
        aria-hidden="true"
        sx={{
          width: '2rem',
          height: '2rem',
          flexShrink: 0,
          mt: '0.125rem',
        }}
      />
      <Box
        component="p"
        sx={{
          typography: 'body2',
          m: 0,
          minWidth: 0,
          overflowWrap: 'break-word',
          whiteSpace: 'normal',
        }}
      >
        <TText keyName={keyName} ns="luonnonmetsakartat" />
      </Box>
    </Box>
  </SidebarContentBox>
)

const LuonnonmetsakartatAdminGate = ({
  children,
}: {
  children: React.ReactNode
}) => {
  useExclusiveLayerGroups()
  const setIsNavbarHidden = useUIStore((state) => state.setIsNavbarHidden)
  const adminVerificationStatus = useAppletStore(
    (state) => state.adminVerificationStatus
  )
  const { data: session, status, isAccessTokenLoading } = useAuthSession()
  const { accessToken } = session ?? {}
  const client = useQueryClient()
  const userId = session?.user?.id
  const sessionId = session?.session?.id
  // Opaque, render-time identity: credentials never enter a store or query key.
  const context = useMemo(
    () => ({}),
    // Each credential/session change deliberately creates a new opaque identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, userId, sessionId, accessToken, isAccessTokenLoading]
  )
  const [completedContext, setCompletedContext] = useState<object | null>(null)
  const eligible =
    status === 'authenticated' &&
    !!userId?.trim() &&
    !!accessToken?.trim() &&
    !isAccessTokenLoading
  const mockScenarioState = useLuonnonmetsakartatMockScenarioQueryState()
  const isMockScenarioQueryActive = mockScenarioState != null

  const router = useAppRouter()
  const buildAppRouteHref = useAppRouteHrefBuilder()
  const pathname = useAppPathname()
  const adminRoute = buildAppRouteHref({
    routeKey: APP_ROUTE_KEYS.LUONNONMETSAKARTAT_ADMIN,
  })

  const { refetch: refetchAdminVerification } = useQuery({
    ...useAdminVerificationQueryOptions(),
    enabled: false,
  })

  useEffect(() => {
    setIsNavbarHidden(false)

    return () => {
      setIsNavbarHidden(true)
    }
  }, [setIsNavbarHidden])

  useEffect(() => {
    if (isMockScenarioQueryActive) return
    let active = true
    clearAdminAccess(client)
    if (eligible) {
      void refetchAdminVerification().then(() => {
        if (active) setCompletedContext(context)
      })
    } else if (status === 'authenticated' && !isAccessTokenLoading) {
      useAppletStore
        .getState()
        .setAdminVerificationStatus(AdminVerificationStatus.Errored)
    }
    return () => {
      active = false
      clearAdminAccess(client)
    }
  }, [
    client,
    context,
    eligible,
    isMockScenarioQueryActive,
    refetchAdminVerification,
    status,
    isAccessTokenLoading,
  ])

  const localState = React.useMemo(() => {
    if (!isMockScenarioQueryActive) {
      if (status === 'unauthenticated') return LocalState.NoUser
      if (status === 'loading' || isAccessTokenLoading)
        return LocalState.Loading
      if (!eligible) return LocalState.Errored
      if (completedContext !== context) return LocalState.Loading
    }
    if (status === 'authenticated') {
      if (adminVerificationStatus === AdminVerificationStatus.NoUser) {
        return LocalState.Loading
      } else if (adminVerificationStatus === AdminVerificationStatus.Pending) {
        return LocalState.Loading
      } else if (adminVerificationStatus === AdminVerificationStatus.Verified) {
        return LocalState.Verified
      } else if (adminVerificationStatus === AdminVerificationStatus.Rejected) {
        return LocalState.Rejected
      } else if (adminVerificationStatus === AdminVerificationStatus.Errored) {
        return LocalState.Errored
      }
    } else if (status === 'unauthenticated') {
      return LocalState.NoUser
    }

    return LocalState.Loading
  }, [
    status,
    adminVerificationStatus,
    isMockScenarioQueryActive,
    isAccessTokenLoading,
    eligible,
    completedContext,
    context,
  ])

  // returns the user back to admin page, if they try to navigate
  // further without being verified
  useEffect(() => {
    if (localState === LocalState.Rejected) {
      if (pathname !== adminRoute) {
        router.replace(adminRoute, { locale: false })
      }
    }
  }, [adminRoute, localState, pathname, router])

  const content = (
    <>
      {localState !== LocalState.Verified && (
        <>
          {localState === LocalState.Loading && (
            <SidebarLoadingBlock sx={{ mt: 3 }} />
          )}
          {localState === LocalState.NoUser && (
            <AdminGateMessage keyName="sidebar.admin.log_in_hint" />
          )}
          {localState === LocalState.Errored && (
            <AdminGateMessage keyName="sidebar.admin.verification_errored" />
          )}
          {localState === LocalState.Rejected && (
            <AdminGateMessage keyName="sidebar.admin.verification_rejected" />
          )}
        </>
      )}
      {localState === LocalState.Verified && children}
    </>
  )

  return pathname === adminRoute ? (
    <LuonnonmetsakartatLandingSidebar boundaryId="luonnonmetsakartat-admin-landing">
      {content}
    </LuonnonmetsakartatLandingSidebar>
  ) : (
    content
  )
}

export default LuonnonmetsakartatAdminGate
