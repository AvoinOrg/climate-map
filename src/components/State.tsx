import React, { useState, useEffect } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";

import { ProfileState } from "./Utils/types";

export const StateContext = React.createContext({});

export const StateProvider = (props) => {
  // for use in non-react components
  const isSidebarOpen = useObservable(isOpenObservable);

  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileState, setProfileState] = useState<ProfileState>("none");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [signupFunnelStep, setSignupFunnelStep] = useState(0);

  useEffect(() => {
    if (isSignupOpen || isLoginOpen || isProfileOpen) {
      setIsSidebarDisabled(true);
    } else {
      setIsSidebarDisabled(false);
    }
    if (isSignupOpen || isLoginOpen) {
      setIsProfileOpen(false)
    }
  }, [isSignupOpen, isProfileOpen, isLoginOpen]);

  const values = {
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarDisabled,
    setIsSidebarDisabled,
    isLoginOpen,
    setIsLoginOpen,
    isSignupOpen,
    setIsSignupOpen,
    isProfileOpen,
    setIsProfileOpen,
    profileState,
    setProfileState,
    signupFunnelStep,
    setSignupFunnelStep,
  };

  return (
    <StateContext.Provider value={values}>
      {props.children}
    </StateContext.Provider>
  );
};

const sidebarState = observable<boolean>(true);
const isOpenObservable = sidebarState.readOnly();

export const setIsSidebarOpen = (visible: boolean) => {
  sidebarState.set(visible);
};
