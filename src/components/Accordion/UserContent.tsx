import React, { useContext, useEffect, useState } from "react";
import {
  createStyles,
  makeStyles,
  Theme,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@material-ui/core";
import { AOAccordion } from "./AOAccordion";
import { UserContext } from "../User";
import { StateContext } from "../State";
import { setFilter, addMapEventHandler, isSourceReady } from "../../map/map";
import { removeMapEventHandler } from "src/map/map";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
    },
    text: {
      padding: "0 16px 0 16px",
      fontWeight: theme.typography["regular"].fontWeight,
    },
    dataButton: {
      margin: "16px 16px 16px 16px",
      fontSize: 14,
    },
    formControl: {
      margin: "0 16px 16px 0",
      minWidth: 120,
    },
  })
);

const VipuContent = (props) => {
  const classes = useStyles({});
  const { fetchSource }: any = useContext(UserContext);

  const [filterFeatureList, setFilterFeatureList] = useState([]);
  const [filterValue, setFilterValue] = useState("");
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    fetchSource(props.sourceName + ".geojson").then((data) => {
      let vals: string[] = Array.from(
        new Set(data.features.map((item) => props.filterFunction(item)))
      );

      setItemCount(data.features.length);

      vals = vals.reverse();

      if (vals.length > 0) {
        setFilterValue(vals[0]);
        const handler = (data) => {
          if (
            data.sourceId === props.sourceLayer &&
            isSourceReady(props.sourceLayer)
          ) {
            setVipuFilter(props.sourceLayer, props.filterFeature, vals[0]);
            removeMapEventHandler("data", handler);
          }
        };

        addMapEventHandler("data", handler);
      }

      setFilterFeatureList(vals);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setVipuFilter = (sourceLayer, filterFeature, value) => {
    setFilter(`${sourceLayer}-fill`, ["in", filterFeature, value]);
  };

  const handleChange = (event) => {
    setFilterValue(event.target.value);
    setVipuFilter(props.sourceLayer, props.filterFeature, event.target.value);
  };

  return (
    <div>
      <FormControl variant="outlined" className={classes.formControl}>
        <InputLabel id="demo-simple-select-outlined-label">
          {props.filterFeatureName}
        </InputLabel>
        <Select
          labelId="demo-simple-select-outlined-label"
          id="demo-simple-select-outlined"
          value={filterValue}
          onChange={handleChange}
          label={props.filterFeatureName}
        >
          {filterFeatureList.map((item, key) => (
            <MenuItem key={key} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <p>{props.subText}</p>
      <p>{`Your data contains ${itemCount} ${props.countUnit}.`}</p>
    </div>
  );
};

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

  // const handleClickCarbon = () => {
  //   setProfileState("fieldCarbon");
  // };

  return (
    <div className={classes.root}>
      <p className={classes.text}>
        This panel shows all your imported data.{" "}
        {!isLoggedIn &&
          "You need to sign up or log in to view and manage your data."}
        {isLoggedIn && !hasLayers && "You have not yet imported any data."}
      </p>
      {hasLayers && (
        <>
          {userLayers["vipu"] && (
            <AOAccordion
              groupName={"vipu-fields"}
              label={"Fields"}
              content={
                <VipuContent
                  sourceName={"peltolohko"}
                  sourceLayer={"vipu-fields"}
                  filterFeature={"VUOSIVAIHE"}
                  filterFunction={(item) => item.properties.VUOSIVAIHE}
                  filterFeatureName={"Year phase"}
                  subText={
                    "This layer shows the field data you have imported from Vipu."
                  }
                  countUnit={"field blocks"}
                />
              }
            />
          )}
          {userLayers["vipu"] && (
            <AOAccordion
              groupName={"vipu-growth"}
              label={"Growth Blocks"}
              content={
                <VipuContent
                  sourceName={"kasvulohkogeometria"}
                  sourceLayer={"vipu-growth"}
                  filterFeature={"VUOSI"}
                  filterFeatureName={"Year"}
                  filterFunction={(item) => item.properties.VUOSI}
                  subText={
                    "This layer shows the growth block data you have imported from Vipu."
                  }
                  countUnit={"growth blocks"}
                />
              }
            />
          )}
        </>
      )}
      {/* <AOProfileAccordion
        label={"Field Carbon Emissions"}
        onClick={handleClickCarbon}
      /> */}
      {isLoggedIn && (
        <Button
          variant="contained"
          color="secondary"
          className={classes.dataButton}
          onClick={handleClick}
        >
          Manage data
        </Button>
      )}
    </div>
  );
};

export default UserContent;
