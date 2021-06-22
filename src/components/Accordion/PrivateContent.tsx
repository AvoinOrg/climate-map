import React, { useContext, useEffect, useState } from "react";
import { createStyles, makeStyles, Theme } from "@material-ui/core";
import { AOExpansionPanelLink } from "./AOExpansionPanel";
import { UserContext } from "../User";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
    },
    text: {
      padding: "0 16px 0 16px",
      fontWeight: theme.typography.fontWeightRegular,
    },
  })
);

const PrivateContent = () => {
  const classes = useStyles({});
  const { isLoggedIn, privateLayers }: any = useContext(UserContext);

  const [hasLayers, setHasLayers] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      for (const key in privateLayers) {
        if (privateLayers[key]) {
          !hasLayers && setHasLayers(true);
          return;
        }
      }
    }

    setHasLayers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, privateLayers]);

  return (
    <div className={classes.root}>
      <p className={classes.text}>
        This panel shows all the private data you have access to.{" "}
        {!hasLayers && "You don't currently have access to any private data."}
      </p>
      {hasLayers && (
        <>
          {privateLayers["valio-carbon-grass-fields"] && (
            <AOExpansionPanelLink
              href="/layers/valio-carbon-grass-fields"
              label={"Valio Carbon Grass Fields"}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PrivateContent;
