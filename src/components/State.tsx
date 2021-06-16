import React, { useState, useEffect, useRef } from "react";
import { observable } from "micro-observables";
import { useObservable } from "micro-observables";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { Snackbar } from "@material-ui/core";
import MuiAlert from "@material-ui/lab/Alert";

import { ProfileState } from "./Utils/types";

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
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileState, setProfileState] = useState<ProfileState>("none");
  // const [profileMessage, setProfileMessage] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [signupFunnelStep, setSignupFunnelStep] = useState(0);
  const [notifications, setNotifications] = useState({});

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  useEffect(() => {
    if (isSignupOpen || isLoginOpen || isProfileOpen) {
      setIsSidebarDisabled(true);
    } else {
      setIsSidebarDisabled(false);
    }
    if (isSignupOpen || isLoginOpen) {
      setIsProfileOpen(false);
    }
  }, [isSignupOpen, isProfileOpen, isLoginOpen]);

  useEffect(() => {
    if (isSignupOpen || isLoginOpen || isProfileOpen) {
      setIsSidebarDisabled(true);
    } else {
      setIsSidebarDisabled(false);
    }
    if (isSignupOpen || isLoginOpen) {
      setIsProfileOpen(false);
    }
  }, [isSignupOpen, isProfileOpen, isLoginOpen]);

  const notify = (message, severity, duration = 6000) => {
    const newNotification = {};
    const index = new Date().getTime()

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
