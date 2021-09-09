import React, { useState, useRef } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { Snackbar } from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";

import { ProfileState, ModalState } from "./Utils/types";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
      zIndex: 3000,
      "& > * + *": {
        marginTop: theme.spacing(2),
      },
    },
  })
);

const Notification = (props) => {
  const [open, setOpen] = useState(true);

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === "clickaway") {
      return;
    }
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={props.duration}
      onClose={handleClose}
    >
      <MuiAlert
        elevation={6}
        variant="filled"
        onClose={handleClose}
        severity={props.severity}
      >
        {props.message}
      </MuiAlert>
    </Snackbar>
  );
};

export const StateContext = React.createContext({});

export const StateProvider = (props) => {
  const classes = useStyles({});

  // for use in non-react components
  const isSidebarOpen = useObservable(isOpenObservable);

  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false);
  const [profileState, setProfileState] = useState<ProfileState>("none");
  const [modalState, setModalState] = useState<ModalState>("none");
  // const [profileMessage, setProfileMessage] = useState(null);
  const [signupFunnelStep, setSignupFunnelStep] = useState(0);
  const [notifications, setNotifications] = useState({});

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const notify = (message, severity, duration = 6000) => {
    const newNotification = {};
    const index = new Date().getTime();

    newNotification[index] = {
      message,
      severity,
      duration,
    };

    setNotificationTimeout(index, duration + 1000);

    setNotifications((notifications) => {
      return { ...notifications, ...newNotification };
    });
  };

  const setNotificationTimeout = (index, timeout) => {
    setTimeout(async () => {
      const newNotifications = { ...notificationsRef.current };
      delete newNotifications[index];
      setNotifications(newNotifications);
    }, timeout);
  };

  const handleSetModalState = (state: ModalState) => {
    setModalState(state);
    setIsSidebarDisabled(state !== "none");
  };

  const handleSetProfileState = (state: ProfileState) => {
    setProfileState(state);

    if (state !== "none") {
      setModalState("profile");
    } else {
      setModalState("none");
    }

    setIsSidebarDisabled(state !== "none");
  };

  const values = {
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarDisabled,
    setIsSidebarDisabled,
    profileState,
    setProfileState: handleSetProfileState,
    modalState,
    setModalState: handleSetModalState,
    signupFunnelStep,
    setSignupFunnelStep,
    notifications,
    notify,
    // profileMessage,
    // setProfileMessage,
  };

  return (
    <StateContext.Provider value={values}>
      {props.children}
      <div className={classes.root}>
        {Object.keys(notifications).map((key) => {
          return (
            <Notification
              key={key}
              message={notifications[key].message}
              severity={notifications[key].severity}
              duration={notifications[key].duration}
            />
          );
        })}
      </div>
    </StateContext.Provider>
  );
};

const sidebarState = observable<boolean>(true);
const isOpenObservable = sidebarState.readOnly();

export const setIsSidebarOpen = (visible: boolean) => {
  sidebarState.set(visible);
};
