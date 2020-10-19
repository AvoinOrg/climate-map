import React, { useState } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";

export const StateContext = React.createContext({});

export const StateProvider = (props) => {
  const isSidebarOpen = useObservable(isOpenObservable);
  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const values = {
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarDisabled,
    setIsSidebarDisabled,
    isLoginOpen,
    setIsLoginOpen,
    isSignupOpen,
    setIsSignupOpen,
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
