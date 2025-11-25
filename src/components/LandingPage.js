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
      gap: 6,
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
      //   border: "solid green 2px",
      width: "70%",
      height: "45px",
      display: "flex",
      justifyContent: "space-between",
      alignSelf: "center",
    },
    button_client: {
      border: "2px solid #4749df",
      width: "40%",
      color: "#020e20",
      "&:hover": {
        backgroundColor: "#4749df",
        border: "1px solid #4749df",
        transition: "all 0.25s ease",
        color: "#f7f7f7",
        transform: "scale(1.08)",
      },
    },
    button_psw: {
      border: "1px solid #4749df",
      width: "40%",
      backgroundColor: "#4749df",
      transition: "all 0.25s ease",
      color: "#f7f7f7",
      "&:hover": {
        transform: "scale(1.08)",
      },
    },
  };

  const handleLoginButton = () => {
    router.push("/loginServiceProvider");
  };
  return (
    <Box sx={styles.landing_page_box}>
      <Box sx={styles.landingpage_info_box}>
        <Typography sx={styles.typo_heading}>
          <span
            style={{
              color: "#4749df",
              textShadow: `
      0 0 6px rgba(71, 73, 223, 0.6),
      0 0 12px rgba(71, 73, 223, 0.4),
      0 0 18px rgba(71, 73, 223, 0.25)
    `,
            }}
          >
            CareBridge
          </span>{" "}
          : Connecting{" "}
          <span
            style={{
              color: "#020e20",
              textShadow: `
      0 0 100px rgba(71, 73, 223, 0.6),
      0 0 100px rgba(71, 73, 223, 0.4),
      0 0 20px rgba(71, 73, 223, 0.25)
    `,
            }}
          >
            Caregivers
          </span>{" "}
          and{" "}
          <span
            style={{
              color: "#020e20",
              textShadow: `
           0 0 100px rgba(71, 73, 223, 0.6),
      0 0 100px rgba(71, 73, 223, 0.4),
      0 0 20px rgba(71, 73, 223, 0.25)
    `,
            }}
          >
            Clients
          </span>
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
