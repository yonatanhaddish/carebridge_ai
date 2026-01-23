import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";

function SubNavbarSeeker({ sendDataToParent }) {
  const [tabName, setTabName] = useState("");

  const handleClick = (name) => {
    sendDataToParent(name);
  };

  const styles = {
    subnavbar_parent: {
      //   border: "solid green 2px",
      height: "50px",
      backgroundColor: "#4749df",
    },
    subnavbar_sub_parent: {
      //   border: "solid red 2px",
      width: "80%",
      height: "100%",
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
    },
    typo: {
      color: "#e0e0e0",
      //   fontWeight: "bold",
    },
  };
  return (
    <Box sx={styles.subnavbar_parent}>
      <Box sx={styles.subnavbar_sub_parent}>
        {/* <Box onClick={() => handleClick("dashboard")}>
          <Typography sx={styles.typo}>Dashboard</Typography>
        </Box> */}
        <Box onClick={() => handleClick("my_booking")}>
          <Typography sx={styles.typo}>My Booking</Typography>
        </Box>
        <Box onClick={() => handleClick("add_booking")}>
          <Typography sx={styles.typo}>Add Booking</Typography>
        </Box>
        <Box onClick={() => handleClick("calendar")}>
          <Typography sx={styles.typo}>Calendar</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default SubNavbarSeeker;
