import React, { useContext, useEffect, useState } from "react";
import { createStyles, makeStyles, Theme, Button } from "@material-ui/core";
import { AOExpansionPanel } from "./AOExpansionPanel";
import { UserContext } from "../User";
import { StateContext } from "../State";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
    },
    text: {
      padding: "0 16px 0 16px",
      fontWeight: theme.typography.fontWeightRegular,
    },
    dataButton: {
      margin: "16px 16px 16px 16px",
      fontSize: 14,
    },
  })
);

const FieldContent = () => (
  <div>
    <p>This layer shows the field data you have imported from Vipu.</p>
  </div>
);

const UserContent = () => {
  const classes = useStyles({});
  const { isLoggedIn, userLayers }: any = useContext(UserContext);
  const { setProfileState, setIsProfileOpen }: any = useContext(StateContext);

  const [hasLayers, setHasLayers] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      for (const key in userLayers) {
        if (userLayers[key]) {
          !hasLayers && setHasLayers(true);
          return;
        }
      }
    }
    setHasLayers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userLayers]);

  const handleClick = () => {
    setProfileState("data");
    setIsProfileOpen("true");
  };

  return (
    <div className={classes.root}>
      <p className={classes.text}>
        This panel shows all your imported data.{" "}
        {!hasLayers && "You have not yet imported any data."}
      </p>
      {hasLayers && (
        <>
          {userLayers["fi-vipu-fields"] && (
            <AOExpansionPanel
              groupName={"fi-vipu-fields"}
              label={"Fields"}
              content={<FieldContent />}
            />
          )}
        </>
      )}
      <Button
        variant="contained"
        color="secondary"
        className={classes.dataButton}
        onClick={handleClick}
      >
        Manage data
      </Button>
    </div>
  );
};

export default UserContent;
