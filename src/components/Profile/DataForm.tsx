import React, { useEffect, useContext, useState } from "react";
import { Theme } from "@mui/material/styles";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import {
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Modal,
} from "@mui/material";
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
    separatorContainer: {
      padding: "0 8px 0 8px",
      width: "100%",
    },
    separator: {
      width: "100%",
      borderTop: "solid 3px " + theme.palette.grey[300],
    },
    locationInputContainer: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      margin: "30px 0 40px 0",
    },
    locationInput: {
      height: "40px",
      padding: 0,
    },
    locationInputText: {
      padding: "0 15px 0 0",
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
    checkboxContainer: {
      display: "flex",
      flexDirection: "row",
      width: 170,
      alignItems: "center",
      margin: "20px 0 0 0",
    },
    checkboxText: {},
    termsContainer: {
      display: "flex",
      flexDirection: "row",
      width: "100%",
      justifyContent: "center",
      margin: "20px 0 0 0",
    },
    pointer: {
      "&:hover": {
        cursor: "pointer",
      },
    },
    modal: {
      position: "absolute",
      left: 0,
      right: 0,
      margin: "0 auto",
      top: 100,
      bottom: 50,
      maxWidth: 500,
      padding: theme.spacing(2, 4, 3),
      border: "none",
      background: theme.palette.background.paper,
      overflowY: "auto",
    },
    modalTitle: {},
    modalText: {},
  })
);

const DataForm = (props) => {
  const classes = useStyles({});

  const { userProfile, userIntegrations }: any = useContext(
    UserContext
  );

  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [values, setValues] = useState({
    location: "Finland",
    forestOwner: false,
    farmOwner: true,
    propertyOwner: false,
    termsAgreed: false,
  });

  const [disabled, setDisabled] = useState({
    forestOwner: true,
    farmOwner: false,
    propertyOwner: true,
    termsAgreed: false,
  });

  useEffect(() => {
    if (userIntegrations) {
      const newDisabled = { ...disabled };
      // if (
      //   userIntegrations.vipu &&
      //   userIntegrations.vipu.integration_status === "integrated"
      // ) {
      //   newDisabled["farm_owner"] = true;
      //   newDisabled["terms_agreed"] = true;
      // } else {
      //   newDisabled["farm_owner"] = false;
      //   newDisabled["terms_agreed"] = false;
      // }
      newDisabled["farmOwner"] = false;
      newDisabled["termsAgreed"] = false;
      setDisabled(newDisabled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIntegrations]);

  const handleValueChange = (event) => {
    const newValues = { ...values };
    const id = event.target.id;
    const value = event.target.value
      ? event.target.value
      : event.target.checked;
    newValues[id] = value;

    if (id === "termsAgreed") {
      setIsButtonDisabled(!value);
    }

    setValues(newValues);
  };

  const handleClickNext = async () => {
    setIsButtonDisabled(true);
    props.handleClickNext();
  };

  const handleModalOpen = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
  };

  return userProfile ? (
    <div className={classes.root}>
      <AccountCircleIcon className={classes.profileIcon} />
      <p className={classes.userName}>
        {userProfile.name ? userProfile.name : userProfile.email}
      </p>
      <p className={classes.dataHeader}>
        Let's specify your data.
      </p>
      <div className={classes.locationInputContainer}>
        <InputLabel className={classes.locationInputText}>Location</InputLabel>
        <FormControl variant="outlined">
          <Select
            labelId="location-select-label"
            id="location"
            value={values.location}
            onChange={handleValueChange}
            className={classes.locationInput}
          >
            <MenuItem value={"Finland"}>Finland</MenuItem>
          </Select>
        </FormControl>
      </div>

      <div className={classes.separatorContainer}>
        <div className={classes.separator} />
      </div>
      <p className={classes.selectionText}>
        You can choose multiple options to get private access to all your data.
        You can edit choices later or delete profile with easy settings.
      </p>
      <div className={classes.selectionContainer}>
        <div className={classes.checkboxContainer}>
          <Checkbox
            checked={values.farmOwner}
            onChange={handleValueChange}
            id="farmOwner"
            inputProps={{ "aria-label": "primary checkbox" }}
            disabled={disabled["farmOwner"]}
          />
          <InputLabel className={classes.checkboxText}>Farm owner</InputLabel>
        </div>
        <div className={classes.checkboxContainer}>
          <Checkbox
            checked={values.forestOwner}
            onChange={handleValueChange}
            id="forestOwner"
            disabled={disabled["forestOwner"]}
            inputProps={{ "aria-label": "primary checkbox" }}
          />
          <InputLabel className={classes.checkboxText} disabled={true}>
            Forest owner
          </InputLabel>
        </div>
        <div className={classes.checkboxContainer}>
          <Checkbox
            checked={values.propertyOwner}
            onChange={handleValueChange}
            id="propertyOwner"
            disabled={disabled["propertyOwner"]}
            inputProps={{ "aria-label": "primary checkbox" }}
          />
          <InputLabel className={classes.checkboxText} disabled={true}>
            Property owner
          </InputLabel>
        </div>
      </div>
      <div className={classes.separatorContainer}>
        <div className={classes.separator} />
      </div>
      <div className={classes.termsContainer}>
        <Checkbox
          checked={values.termsAgreed}
          onChange={handleValueChange}
          id="termsAgreed"
          inputProps={{ "aria-label": "primary checkbox" }}
          disabled={disabled["termsAgreed"]}
        />
        <p>
          I have read and agree on{" "}
          <u className={classes.pointer} onClick={handleModalOpen}>
            the terms of use.
          </u>
        </p>
        <Modal open={modalOpen} onClose={handleModalClose}>
          <div className={classes.modal}>
            <h2 className={classes.modalTitle}>Terms of Use</h2>
            <p className={classes.modalText}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem
              accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
              quae ab illo inventore veritatis et quasi architecto beatae vitae
              dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit
              aspernatur aut odit aut fugit, sed quia consequuntur magni dolores
              eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam
              est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
              velit, sed quia non numquam eius modi tempora incidunt ut labore
              et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima
              veniam, quis nostrum exercitationem ullam corporis suscipit
              laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem
              vel eum iure reprehenderit qui in ea voluptate velit esse quam
              nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo
              voluptas nulla pariatur?
            </p>
          </div>
        </Modal>
      </div>
      <NextButton onClick={handleClickNext} disabled={isButtonDisabled} />
    </div>
  ) : (
    <></>
  );
};

export default DataForm;
