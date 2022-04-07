import React, { useEffect, useRef, useState } from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { Button } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

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

const IntegrationButton = (props: {
  state: IntegrationState;
  onClick: any;
}) => {
  const classes = useStyles({});
  return (
    <>
      {props.state === "error" && (
        <Button onClick={props.onClick} className={classes.integrationButton}>
          <div className={classes.integrationTextContainer}>
            <p className={classes.integrationText}>Something went wrong.</p>
            <p className={classes.integrationTextSmall}>
              You can click here to try again, or come back later.
            </p>
          </div>
        </Button>
      )}
      {["initialized", "uninitialized"].includes(props.state) && (
        <Button onClick={props.onClick} className={classes.integrationButton}>
          Login to Vipu to retrieve your field data.
        </Button>
      )}
      {props.state === "authorizing" && (
        <Button onClick={props.onClick} className={classes.integrationButton}>
          <div className={classes.integrationTextContainer}>
            <p className={classes.integrationText}>
              Waiting for Vipu authorization to complete...
            </p>
            <p className={classes.integrationTextSmall}>Click to cancel</p>
          </div>
        </Button>
      )}
      {props.state === "importing" && (
        <Button className={classes.integrationButton}>
          Importing field data...
        </Button>
      )}
      {props.state === "done" && (
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
      {props.state === "deleting" && (
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
    createIntegration,
    deleteIntegration,
  }: any = React.useContext(UserContext);
  const [integrationStates, setIntegrationStates] = useState(null);
  const stateRef = useRef(integrationStates);
  stateRef.current = integrationStates;

  useEffect(() => {
    const newIntegrationStates = { ...integrationStates };

    for (const key in userIntegrations) {
      let val: IntegrationState = "initialized";
      if (
        userIntegrations[key] &&
        userIntegrations[key].integrationStatus === "integrated"
      ) {
        val = "done";
      }
      newIntegrationStates[key] = val;
    }

    if (!userIntegrations["vipu"]) {
      newIntegrationStates["vipu"] = "uninitialized";
    }

    setIntegrationStates(newIntegrationStates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIntegrations]);

  const handleClickNext = async () => {
    fetchIntegrations();
    props.handleClickNext();
  };

  const onClickVipu = async () => {
    let val: IntegrationState = "initialized";
    let newIntegrationStates = {};

    if (["initialized", "uninitialized"].includes(integrationStates["vipu"])) {
      if (integrationStates["vipu"] === "uninitialized") {
        await createIntegration("vipu");
      }

      const link = await initDataAuth("vipu");
      openInNewTab(link);
      val = "authorizing";
      pollStatus("vipu");
    } else if (integrationStates["vipu"] === "done") {
      newIntegrationStates = { ...integrationStates };
      newIntegrationStates["vipu"] = "deleting";
      setIntegrationStates(newIntegrationStates);

      await deleteIntegration("vipu");
    }

    newIntegrationStates = { ...integrationStates };
    newIntegrationStates["vipu"] = val;
    setIntegrationStates(newIntegrationStates);
  };

  const pollStatus = async (integrationType) => {
    setTimeout(async () => {
      const status = await fetchDataAuthStatus(integrationType);

      if (
        ["importing", "authorizing"].includes(stateRef.current[integrationType])
      ) {
        let val: IntegrationState = "initialized";

        switch (status) {
          case "error":
            val = "error";
            break;
          case "initialized":
            pollStatus(integrationType);
            val = "authorizing";
            break;
          case "authenticated":
            pollStatus(integrationType);
            val = "importing";
            break;
          case "imported":
            val = "done";
            fetchIntegrations();
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
      <p className={classes.dataHeader}>Let's fetch your private data.</p>
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

type IntegrationState =
  | "error"
  | "uninitialized"
  | "initialized"
  | "authorizing"
  | "importing"
  | "deleting"
  | "done";

export default IntegrationForm;
