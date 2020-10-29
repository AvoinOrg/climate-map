import React, { useEffect, useRef, useState } from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { Button } from "@material-ui/core";
import AccountCircleIcon from "@material-ui/icons/AccountCircle";

import { UserContext } from "../User";
import { NextButton } from "./Signup";

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
    dataText: {
      margin: "10px 0 0 0",
    },
    separatorContainer: {
      padding: "0 8px 0 8px",
      width: "100%",
    },
    separator: {
      width: "100%",
      borderTop: "solid 3px " + theme.palette.grey[300],
    },
    pointer: {
      "&:hover": {
        cursor: "pointer",
      },
    },
    integrationContainer: {
      display: "flex",
      margin: "70px 0 70px 0",
      flexDirection: "row",
      justifyContent: "space-around",
    },
    integrationButton: {
      height: 120,
      width: 250,
      fontFamily: theme.typography.fontFamily[0],
      fontSize: "1rem",
      border: "1px solid gray",
      borderRadius: "4px",
      padding: "15px",
    },
    integrationTextContainer: {
      display: "flex",
      justifyContent: "space-around",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
    },
    integrationText: {
      margin: 0,
    },
    integrationTextSmall: {
      fontSize: "0.8rem",
      margin: 0,
    },
  })
);

const IntegrationButton = (props) => {
  const classes = useStyles({});
  return (
    <>
      {props.state === -1 && (
        <Button onClick={props.onClick} className={classes.integrationButton}>
          <div className={classes.integrationTextContainer}>
            <p className={classes.integrationText}>Something went wrong.</p>
            <p className={classes.integrationTextSmall}>
              You can click here to try again, or come back later.
            </p>
          </div>
        </Button>
      )}
      {props.state === 0 && (
        <Button onClick={props.onClick} className={classes.integrationButton}>
          Login to Vipu to retrieve your field data.
        </Button>
      )}
      {props.state === 1 && (
        <Button onClick={props.onClick} className={classes.integrationButton}>
          <div className={classes.integrationTextContainer}>
            <p className={classes.integrationText}>
              Waiting for Vipu authorization to complete...
            </p>
            <p className={classes.integrationTextSmall}>Click to cancel</p>
          </div>
        </Button>
      )}
      {props.state === 2 && (
        <Button className={classes.integrationButton}>
          Importing field data...
        </Button>
      )}
      {props.state === 3 && (
        <Button
          color="secondary"
          onClick={props.onClick}
          className={classes.integrationButton}
        >
          <div className={classes.integrationTextContainer}>
            <p className={classes.integrationText}>
              Fields succesfully imported!
            </p>
            <p className={classes.integrationTextSmall}>
              Click to remove all data from this app.
            </p>
          </div>
        </Button>
      )}
      {props.state === 4 && (
        <Button
          color="secondary"
          onClick={props.onClick}
          className={classes.integrationButton}
        >
          <div className={classes.integrationTextContainer}>
            <p className={classes.integrationText}>Deleting...</p>
          </div>
        </Button>
      )}
    </>
  );
};

const IntegrationForm = (props) => {
  const classes = useStyles({});
  const {
    userProfile,
    userIntegrations,
    fetchIntegrations,
    initDataAuth,
    fetchDataAuthStatus,
    updateIntegrations,
  }: any = React.useContext(UserContext);
  const [integrationStates, setIntegrationStates] = useState(null);
  const stateRef = useRef(integrationStates);
  stateRef.current = integrationStates;

  useEffect(() => {
    const newIntegrationStates = { ...integrationStates };

    for (const key in userIntegrations) {
      let val = 0;
      if (userIntegrations[key] === 1) {
        val = 3;
      }
      newIntegrationStates[key.substring(0, key.length - 6)] = val;
    }

    setIntegrationStates(newIntegrationStates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIntegrations]);

  const handleClickNext = async () => {
    fetchIntegrations();
    props.handleClickNext();
  };

  const onClickVipu = async () => {
    let val = 0;
    let newIntegrationStates = {};

    if (integrationStates["vipu"] === 0) {
      const link = await initDataAuth("vipu");
      openInNewTab(link);
      val = 1;
      pollStatus("vipu");
    } else if (integrationStates["vipu"] === 3) {
      newIntegrationStates = { ...integrationStates };
      newIntegrationStates["vipu"] = 4;
      setIntegrationStates(newIntegrationStates);

      await updateIntegrations({ vipu_state: 0 });
    }

    newIntegrationStates = { ...integrationStates };
    newIntegrationStates["vipu"] = val;
    setIntegrationStates(newIntegrationStates);
  };

  const pollStatus = async (integrationType) => {
    setTimeout(async () => {
      const status = await fetchDataAuthStatus(integrationType);
      if ([1, 2].includes(stateRef.current[integrationType])) {
        let val = 0;

        switch (status) {
          case -1:
            val = -1;
            break;
          case 0:
            pollStatus(integrationType);
            val = 1;
            break;
          case 1:
            pollStatus(integrationType);
            val = 2;
            break;
          case 2:
            val = 3;
            break;
        }

        const newIntegrationStates = { ...stateRef.current };
        newIntegrationStates[integrationType] = val;
        setIntegrationStates(newIntegrationStates);
      }
    }, 1000);
  };

  const openInNewTab = (url) => {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  };

  return integrationStates && userProfile ? (
    <div className={classes.root}>
      <AccountCircleIcon className={classes.profileIcon} />
      <p className={classes.userName}>
        {userProfile.name ? userProfile.name : userProfile.email}
      </p>
      <p className={classes.dataHeader}>Let's now fetch your private data.</p>
      <p className={classes.dataText}>
        This data will stay as private, until you give a permission to share.
      </p>
      <div className={classes.integrationContainer}>
        <IntegrationButton
          onClick={onClickVipu}
          state={integrationStates["vipu"]}
        />
      </div>
      {props.handleClickNext && (
        <>
          <div className={classes.separatorContainer}>
            <div className={classes.separator} />
          </div>
          {props.handleClickNext && <NextButton onClick={handleClickNext} />}
        </>
      )}
    </div>
  ) : (
    <></>
  );
};

export default IntegrationForm;
