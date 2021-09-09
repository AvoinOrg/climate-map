import React, { useEffect, useRef, useState } from "react";
import { createStyles, Theme, makeStyles } from "@material-ui/core/styles";
import { Button } from "@material-ui/core";
import { Bar } from "react-chartjs-2";

import { UserContext } from "../User";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      width: "100%",
    },
    buttonRow: {
      margin: "0 0 0 0",
      flexDirection: "row",
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
    chartContainer: {},
    downloadButton: {
      margin: "16px 16px 16px 0",
      fontSize: 14,
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

const FieldCarbon = (props) => {
  const classes = useStyles({});
  const { userProfile }: any = React.useContext(UserContext);

  const handleClickSheet = () => {
    window.location.href =
      "https://server.avoin.org/data/files/farm_carbon_calculation_form.xlsx";
  };

  const handleClickForm = () => {
    window.location.href =
      "https://server.avoin.org/data/files/farm_carbon_calculation_doc.docx";
  };

  const data = {
    labels: ["1", "2", "3", "4", "5", "6"],
    datasets: [
      {
        label: "# of Red Votes",
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: "rgb(255, 99, 132)",
      },
      {
        label: "# of Blue Votes",
        data: [2, 3, 20, 5, 1, 4],
        backgroundColor: "rgb(54, 162, 235)",
      },
      {
        label: "# of Green Votes",
        data: [3, 10, 13, 15, 22, 30],
        backgroundColor: "rgb(75, 192, 192)",
      },
    ],
  };

  const options = {
    scales: {
      yAxes: [
        {
          stacked: true,
          ticks: {
            beginAtZero: true,
          },
        },
      ],
      xAxes: [
        {
          stacked: true,
        },
      ],
    },
  };

  return (
    <div className={classes.root}>
      <h2>Total environmental footprint</h2>
      <div className={classes.buttonRow}>
        <Button
          className={classes.downloadButton}
          variant="contained"
          color="secondary"
          onClick={handleClickSheet}
        >
          Download calculation sheet
        </Button>
        <Button
          className={classes.downloadButton}
          variant="contained"
          color="secondary"
          onClick={handleClickForm}
        >
          Download contact form
        </Button>
      </div>
      <div className={classes.chartContainer}>
        <Bar data={data}></Bar>
      </div>
    </div>
  );
};

export default FieldCarbon;
