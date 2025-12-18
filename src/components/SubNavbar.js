import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";

function SubNavbar({ sendDataToParent }) {
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
        <Box onClick={() => handleClick("availability_ai")}>
          <Typography sx={styles.typo}>Availability AI</Typography>
        </Box>
        <Box onClick={() => handleClick("availability_calendar")}>
          <Typography sx={styles.typo}>Availability Calendar</Typography>
        </Box>
        <Box onClick={() => handleClick("offers")}>
          <Typography sx={styles.typo}>Offers</Typography>
        </Box>
        <Box onClick={() => handleClick("schedule")}>
          <Typography sx={styles.typo}>Schedule</Typography>
        </Box>
        <Box onClick={() => handleClick("my_calendar")}>
          <Typography sx={styles.typo}>My Calendar</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default SubNavbar;
