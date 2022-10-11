import React from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { Button } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

import { UserStateContext } from 'Components/State'

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
    finishButton: {
      alignSelf: "center",
      margin: "60px 8px 0 8px",
    },
  })
);

const Finish = (props) => {
  const classes = useStyles({});
  const { userProfile }: any = React.useContext(UserStateContext);

  return (
    <div className={classes.root}>
      <AccountCircleIcon className={classes.profileIcon} />
      <p className={classes.userName}>
        {userProfile.name ? userProfile.name : userProfile.email}
      </p>
      <p className={classes.dataHeader}>All done!</p>
      <p className={classes.dataText}>
        You can now close this panel and view your imported data from the
        sidebar.
      </p>
      <Button
        variant={"contained"}
        disableElevation
        className={classes.finishButton}
        onClick={props.handleClickNext}
        disabled={props.disabled}
      >
        Close
      </Button>
    </div>
  );
};

export default Finish;
