import React, { useState } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";

export const StateContext = React.createContext({});

export const StateProvider = (props) => {
  const isSidebarOpen = useObservable(isOpenObservable);
  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const [isSignupFormOpen, setIsSignupFormOpen] = useState(false);
  const [isLoginFormOpen, setIsLoginFormOpen] = useState(false);

  const values = {
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarDisabled,
    setIsSidebarDisabled,
    isLoginFormOpen,
    setIsLoginFormOpen,
    isSignupFormOpen,
    setIsSignupFormOpen,
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
