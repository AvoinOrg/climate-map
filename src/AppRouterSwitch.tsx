import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Switch,
  useParams,
} from "react-router-dom";

import "./components/App";
import Sidebar from "./components/Sidebar";
import NavBar from "./components/NavBar";
import MapButtons from "./components/MapButtons";

import { URLLayerSyncContainer } from "./URLLayerSyncContainer";
import ForestArvometsa from "./components/Sidebar/ForestArvometsa";
import Omaihka from "./components/Sidebar/Omaihka";
import KaribaForestCoverChanges from "./components/Sidebar/KaribaForestCoverChanges";
import FFD from "./components/Sidebar/FFD";
import { MainMenu } from "./components/Sidebar/Sidebar";
import OverlayMessages from "./components/OverlayMessages";
import Ekofolio from "./components/Sidebar/Ekofolio";
import UserModal from "./components/Profile/UserModal";
import LoadingModal from "./components/LoadingModal";
import VerificationForm from "./components/Profile/VerificationForm";
import { UserContext } from "./components/User";
import { StateContext } from "./components/State";

const VerificationRouter = () => {
  const {
    fetchUserProfile,
    isLoggedIn,
    userProfile,
    hasInitialized,
    verifyEmail,
    verificationStatus,
    logout,
  }: any = React.useContext(UserContext);

  const {
    setSignupFunnelStep,
    setIsSignupOpen,
    setIsProfileOpen,
    setProfileState,
  }: any = React.useContext(StateContext);

  const { token }: any = useParams();
  const [hasRouted, setHasRouted] = useState(false);

  useEffect(() => {
    verifyEmail(token)
      .then((res) => {
        if (res.status === 200) {
          if (isLoggedIn) {
            if (res.data.email === userProfile.email) {
              fetchUserProfile();
            } else {
              logout();
            }
          }
        }
      })
      .catch((error) => {
        console.log(error.data)
        if (error.status === 409 && isLoggedIn) {
          if (
            error.data.email &&
            error.data.email !== userProfile.email
          ) {
            logout();
          }
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !hasRouted &&
      hasInitialized &&
      userProfile &&
      userProfile.funnelState === 1
    ) {
      setHasRouted(true);
      setSignupFunnelStep(1);
      setIsSignupOpen(true);
    } else if (!hasRouted && hasInitialized) {
      setHasRouted(true);
      setIsProfileOpen(true);
      setProfileState("verification");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized, userProfile]);

  return (
    <>
      {!hasRouted && <LoadingModal></LoadingModal>}
      <MainMenu />
    </>
  );
};

export default function AppRouterSwitch() {
  return (
    <Router>
      <MapButtons />
      <NavBar />
      <OverlayMessages />
      <URLLayerSyncContainer>
        <Sidebar>
          <Switch>
            <Route path="/layers/fi-forest">
              <ForestArvometsa />
            </Route>
            <Route path="/layers/fi-omaihka">
              <Omaihka />
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
            </Route>
            <Route path="/verify/:token">
              <VerificationRouter />
            </Route>
            <Route path="/">
              <MainMenu />
            </Route>
          </Switch>
        </Sidebar>
      </URLLayerSyncContainer>
      <UserModal />
    </Router>
  );
}
