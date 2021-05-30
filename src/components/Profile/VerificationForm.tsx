import React, { useEffect, useContext, useRef, useState } from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { CircularProgress } from "@material-ui/core";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";
import Check from "@material-ui/icons/Check";

import { UserContext } from "../User";
import { NextButton } from "./Signup";
import { VerificationStatus } from "../Utils/types";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
    },
    profileIcon: {
      margin: "20px 0 0 0",
      fontSize: "2.5rem",
    },
    userName: {},
    dataHeader: {
      fontSize: "1.4rem",
      margin: "70px 0 0 0",
    },
    separatorContainer: {
      padding: "60px 8px 0 8px",
      width: "100%",
    },
    separator: {
      width: "100%",
      borderTop: "solid 3px " + theme.palette.grey[300],
    },
    selectionText: {
      margin: "30px 0 0 0",
      maxWidth: 600,
    },
    selectionContainer: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-around",
      margin: "10px 0 30px 0",
    },
    progressContainer: {
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      margin: "80px 0 0 0",
    },
    spinnerRow: {
      width: "100%",
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      margin: "0 0 20px 0",
    },
    spinnerText: {
      margin: "0 0 0 15px",
    },
    resendLink: {
      "&:hover": {
        cursor: "pointer",
      },
    },
  })
);

const VerificationForm = (props) => {
  const classes = useStyles({});

  const {
    userProfile,
    fetchProfile,
    updateProfile,
    verificationTimeout,
    sendEmailVerification,
    verificationStatus,
    isLoggedIn,
  }: any = useContext(UserContext);

  const [isButtonDisabled, setIsButtonDisabled] = useState(true);

  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfileRef;

  useEffect(() => {
    if (verificationStatus === "verified") {
      setIsButtonDisabled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationStatus]);

  const handleClickVerification = async () => {
    sendEmailVerification();
  };

  const handleClickNext = async () => {
    setIsButtonDisabled(true);
    updateProfile({ funnel_state: 3 });
    props.handleClickNext();
  };

  const pollUserProfile = async () => {
    setTimeout(async () => {
      const profile = await fetchProfile();
      if (profile.emailVerified === 0) {
        pollUserProfile();
      }
    }, 1000);
  };

  useEffect(() => {
    if (verificationStatus !== "verified" && isLoggedIn) {
      pollUserProfile();
    }
    if (verificationStatus === "unverified" && isLoggedIn) {
      sendEmailVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={classes.root}>
      {userProfile && userProfile.funnelState <= 1 ? (
        <>
          <AccountCircleIcon className={classes.profileIcon} />
          <p className={classes.userName}>
            {userProfile.name ? userProfile.name : userProfile.email}
          </p>
          <p className={classes.dataHeader}>
            Let's start with verifying your email address.
          </p>
          <p className={classes.selectionText}>
            A verification email has been sent to <b>{userProfile.email}</b>.
            Please click the link there to continue. If you cannot see our
            email, check your spam folder.
          </p>
          {/* <div className={classes.spinner}>
        <Spinner />
      </div> */}
          <div className={classes.progressContainer}>
            <div className={classes.spinnerRow}>
              {verificationStatus !== "verified" && (
                <CircularProgress color="secondary" />
              )}
              {verificationStatus === "verified" && (
                <Check color="secondary" fontSize="large" />
              )}
              <h3 className={classes.spinnerText}>
                {verificationStatus === "verified" &&
                  "Email address succesfully verified!"}
                {verificationStatus !== "verified" &&
                  "Waiting for verification..."}
              </h3>
            </div>
            {verificationStatus === "emailSent" && (
              <>
                {verificationTimeout > 0 && (
                  <p>
                    Verification sent to your inbox. You can send it again in{" "}
                    {verificationTimeout} seconds.
                  </p>
                )}
                {verificationTimeout === 0 && (
                  <p
                    className={classes.resendLink}
                    onClick={handleClickVerification}
                  >
                    <u>
                      Click here to resend verification email to your inbox.
                    </u>
                  </p>
                )}
              </>
            )}
            {verificationStatus === "emailErrored" && (
              <p
                className={classes.resendLink}
                onClick={handleClickVerification}
              >
                <u>
                  Something went wrong sending the email. Click here to try
                  again, or come back later.
                </u>
              </p>
            )}
            {verificationStatus === "errored" && (
              <p
                className={classes.resendLink}
                onClick={handleClickVerification}
              >
                <u>
                  Sorry, your verification link has expired or something else
                  went wrong. Click here to send a new verification email, or
                  come back later.
                </u>
              </p>
            )}
            {}
          </div>
          <div className={classes.separatorContainer}>
            <div className={classes.separator} />
          </div>
          <NextButton onClick={handleClickNext} disabled={isButtonDisabled} />
        </>
      ) : (
        <div className={classes.progressContainer}>
          <div className={classes.spinnerRow}>
            {verificationStatus !== "verified" && (
              <CircularProgress color="secondary" />
            )}
            {verificationStatus === "verified" && (
              <Check color="secondary" fontSize="large" />
            )}
            <h3 className={classes.spinnerText}>
              {verificationStatus === "verified" &&
                "Email address succesfully verified!"}
              {verificationStatus !== "verified" &&
                "Waiting for verification..."}
            </h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationForm;
