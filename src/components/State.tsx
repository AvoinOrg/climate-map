import React, { useState } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";

const sidebarState = observable<boolean>(true);

const isOpenObservable = sidebarState.readOnly();

export const setIsSidebarOpen = (visible: boolean) => {
  sidebarState.set(visible);
};

export const StateContext = React.createContext({});

export const StateProvider = (props) => {
  const isSidebarOpen = useObservable(isOpenObservable);
  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const values = {
    isSidebarOpen,
    setIsSidebarOpen,
    setIsProfileModalOpen,
    isProfileModalOpen,
  };

  return (
    <StateContext.Provider value={values}>
      {props.children}
    </StateContext.Provider>
  );
};
