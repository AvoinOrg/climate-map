import React, { useState, useEffect } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";

export const StateContext = React.createContext({});

export const StateProvider = (props) => {
  // for use in non-react components
  const isSidebarOpen = useObservable(isOpenObservable);

  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileState, setProfileState] = useState(0);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    if (isSignupOpen || isLoginOpen || isProfileOpen) {
      setIsSidebarDisabled(true);
    } else {
      setIsSidebarDisabled(false);
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
