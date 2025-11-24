import React from "react";

import { useRouter } from "next/router";

import { Box, Typography, Button, colors } from "@mui/material";

function LandingPage() {
  const router = useRouter();

  const styles = {
    landing_page_box: {
      height: "87%",
      backgroundColor: "#e0e0e0",
      display: "flex",
    },
    landingpage_info_box: {
      // border: "solid red 2px",
      height: "60%",
      width: "50%",
      alignSelf: "center",
      flexDirection: "column",
      display: "flex",
      gap: 4,
    },
    image_box: {
      // border: "solid green 2px",
      height: "80%",
      width: "45%",
      backgroundColor: "#4e4e4d",
      backgroundImage: "url('/images/landingpage_img.jpeg')",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      alignSelf: "center",
    },
    typo_heading: {
      // border: "solid red 2px",
      fontSize: "2.8rem",
      width: "80%",
      textAlign: "center",
      alignSelf: "center",
    },
    typo_description: {
      // border: "solid green 2px",
      width: "70%",
      alignSelf: "center",
    },
    button_box: {
      // border: "solid green 2px",
      width: "70%",
      display: "flex",
      justifyContent: "space-between",
      alignSelf: "center",
    },
    button_client: {
      border: "1px solid #0e3b7a",
      width: "40%",
      backgroundColor: "#0e3b7a",
      color: "#f7f7f7",
    },
    button_psw: {
      border: "1px solid #0e3b7a",
      width: "40%",
      color: "#020e20",
      backgroundColor: "#FF9500",
    },
  };

  const handleLoginButton = () => {
    router.push("/loginServiceProvider");
  };
  return (
    <Box sx={styles.landing_page_box}>
      <Box sx={styles.landingpage_info_box}>
        <Typography sx={styles.typo_heading}>
          CareBridge: Connecting{" "}
          <span style={{ color: "#FF9500" }}>Caregivers</span> and{" "}
          <span style={{ color: "#0e3b7a" }}>Clients</span>
        </Typography>
        <Typography sx={styles.typo_description}>
          A simple, secure platform where Personal Support Workers share
          availability and clients book trusted support — bridging care with
          convenience.
        </Typography>
        <Box sx={styles.button_box}>
          <Button sx={styles.button_client}>I need care</Button>
          <Button sx={styles.button_psw} onClick={handleLoginButton}>
            I am PSW
          </Button>
        </Box>
      </Box>
      <Box sx={styles.image_box}></Box>
    </Box>
  );
}

export default LandingPage;
