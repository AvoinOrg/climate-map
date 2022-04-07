import React from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { CircularProgress } from "@mui/material";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      padding: "64px 10px 200px 10px",
      zIndex: theme.zIndex.modal + 1,
      backgroundColor: "white",
      overflowY: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    pane: {},
  })
);

const LoadingModal = () => {
  const classes = useStyles({});

  return (
    <div className={classes.root}>
      <CircularProgress color="secondary" size={200} />
    </div>
  );
};

export default LoadingModal;
