import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Switch, useParams } from 'react-router-dom'

import { Sidebar } from 'Components/Sidebar'
import { NavBar } from 'Components/NavBar'
import { GroupOrientation } from 'Components/Map'
// import { URLLayerSyncContainer } from './URLLayerSyncContainer'
// import ForestArvometsa from "Components/Sidebar/ForestArvometsa";
// import Omaihka from "Components/Sidebar/Omaihka";
// import FaoImages2021 from "Components/Sidebar/FaoImages2021";
// import KaribaForestCoverChanges from "Components/Sidebar/KaribaForestCoverChanges";
// import FFD from "Components/Sidebar/FFD";
import { MainMenu } from 'Components/Sidebar'
import { OverlayMessages } from 'Components/OverlayMessages'
// import Ekofolio from "Components/Sidebar/Ekofolio";
import { UserModal } from 'Components/Profile'
import { LoadingModal } from 'Components/Loading'
import { UserStateContext } from 'Components/State'
import { UiStateContext } from 'Components/State'
// import ValioCarbonGrassFields from "Components/Sidebar/ValioCarbonGrassFields";

const VerificationRouter = (props) => {
  const { fetchUserProfile, fetchUserIntegrations, isLoggedIn, userProfile, hasInitialized, verifyEmail, logout }: any =
    React.useContext(UserStateContext)

  const { setSignupFunnelStep, setIsSignupOpen, setIsProfileOpen, setProfileState }: any =
    React.useContext(UiStateContext)

  const { token }: any = useParams()
  const [hasRouted, setHasRouted] = useState(false)
  useEffect(() => {
    verifyEmail(token)
      .then((res) => {
        if (res.status === 200) {
          if (isLoggedIn) {
            if (res.data.email === userProfile.email) {
              fetchUserProfile()
              fetchUserIntegrations()
            } else {
              logout()
            }
          }
        }
      })
      .catch((error) => {
        if (error.status === 409 && isLoggedIn) {
          if (error.data.email && error.data.email !== userProfile.email) {
            logout()
          }
        }
      })
      .finally(() => {
        window.history.replaceState(null, document.title, '/')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasRouted && hasInitialized && userProfile && userProfile.funnelState === 1) {
      setHasRouted(true)
      setSignupFunnelStep(1)
      setIsSignupOpen(true)
    } else if (!hasRouted && hasInitialized) {
      setHasRouted(true)
      setProfileState('verification')
      setIsProfileOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, userProfile])

  return (
    <>
      {!hasRouted && <LoadingModal></LoadingModal>}
      <MainMenu />
    </>
  )
}

const LayerRouter = (props) => {
  const { isLoggedIn, userProfile, userIntegrations, fetchIntegrations, hasInitialized }: any =
    React.useContext(UserStateContext)

  const { setIsSignupOpen, setIsProfileOpen, setProfileState, setSignupFunnelStep, notify }: any =
    React.useContext(UiStateContext)

  const { layer }: any = useParams()
  const [routeState, setRouteState] = useState<'none' | 'allowed' | 'verify' | 'fetching' | 'denied' | 'login'>('none')

  useEffect(() => {
    if (hasInitialized) {
      if (isLoggedIn && userProfile && userIntegrations) {
        if (userProfile.emailVerified === 1) {
          if (userIntegrations[layer]) {
            setRouteState('allowed')
          } else if (['none', 'login'].includes(routeState)) {
            setRouteState('denied')
            notify("You don't have access to this map layer.", 'error', 30000)
          }
          if (routeState === 'verify') {
            setRouteState('fetching')

            fetchIntegrations().then((res) => {
              if (res[layer]) {
                setRouteState('allowed')
                notify('Map layer enabled!', 'success', 6000)
              } else {
                setRouteState('denied')
                notify("You don't have access to this map layer.", 'error', 30000)
              }
            })
          }
        } else {
          setRouteState('verify')
          if (routeState === 'none') {
            notify('You need to verify your email to view this map layer.', 'info', 30000)
          }
        }
      } else if (routeState === 'none') {
        setRouteState('login')
        notify('You need to log in to view this map layer.', 'info', 30000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, userProfile, userIntegrations])

  useEffect(() => {
    if (routeState === 'login') {
      setIsSignupOpen(true)
    } else if (routeState === 'verify') {
      if (userProfile && userProfile.funnelState === 1) {
        setSignupFunnelStep(1)
        setIsSignupOpen(true)
      } else {
        setProfileState('verification')
        setIsProfileOpen(true)
      }
    } else if (routeState === 'denied') {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeState])

  return (
    <>
      {['none', 'fetching'].includes(routeState) && <LoadingModal></LoadingModal>}
      {routeState === 'denied' && <MainMenu />}
      {/* {routeState === "allowed" && (
        <>
          {layer === "valio-carbon-grass-fields" && <ValioCarbonGrassFields />}
        </>
      )} */}
    </>
  )
}

export default function AppRouterSwitch() {
  return (
    <Router>
      <GroupOrientation />
      <NavBar />
      <OverlayMessages />
      {/* <URLLayerSyncContainer> */}
      <Sidebar>
        <Switch>
          {/* <Route path="/layers/fi-forest">
              <ForestArvometsa />
            </Route>
            <Route path="/layers/fi-omaihka">
              <Omaihka />
            </Route>
            <Route path="/layers/fao-images-2021">
              <FaoImages2021 />
            </Route>
            <Route path="/layers/kariba_changes">
              <KaribaForestCoverChanges />
            </Route>
            <Route path="/layers/fi-ffd/:area">
              <FFD />
            </Route>
            <Route path="/layers/fi-ffd">
              <FFD />
            </Route>
            <Route path="/layers/ekofolio">
              <Ekofolio />
            </Route> */}
          <Route path="/layers/:layer">
            <LayerRouter />
          </Route>
          <Route path="/carbon">
            <LayerRouter />
          </Route>
          <Route path="/verify/:token">
            <VerificationRouter />
          </Route>
          <Route path="/">
            <MainMenu />
          </Route>
        </Switch>
      </Sidebar>
      {/* </URLLayerSyncContainer> */}
      <UserModal />
    </Router>
  )
}
