import React from "react";
import { useRouter } from "next/router";
import { Box, Typography, Button } from "@mui/material";

function LandingPage() {
  const router = useRouter();

  const styles = {
    landing_page_box: {
      // border: "solid red 2px",
      height: "87%",
      backgroundColor: "#e0e0e0",
      display: "flex",
      flexDirection: { xs: "column-reverse", md: "row" }, // stack on mobile, side-by-side on desktop
      justifyContent: {
        xs: "space-evenly",
      },
    },
    landingpage_info_box: {
      height: { xs: "auto", md: "70%" },
      width: { xs: "100%", sm: "80%", md: "50%" },
      alignSelf: "center",
      flexDirection: "column",
      display: "flex",
      gap: 3,
      p: { xs: 2, md: 4 },
      // border: "solid green 2px",
    },
    image_box: {
      height: { xs: "250px", md: "80%" },
      width: { xs: "100%", md: "45%", sm: "80%" },
      backgroundColor: "#4e4e4d",
      backgroundImage: "url('/images/landingpage_img.jpeg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      alignSelf: "center",
      borderRadius: { xs: "8px", md: "0" },
    },
    typo_heading: {
      fontSize: { xs: "1.8rem", sm: "2.2rem", md: "2.8rem" },
      width: "100%",
      textAlign: "center",
      alignSelf: "center",
    },
    typo_description: {
      width: { xs: "90%", md: "70%", sm: "70%" },
      alignSelf: "center",
      fontSize: { xs: "0.9rem", md: "1rem" },
      textAlign: "center",
    },
    button_box: {
      width: { xs: "100%", md: "70%", sm: "80%" },
      flexDirection: { xs: "column", sm: "row" },
      gap: { xs: 2, sm: 0 },
      height: "auto",
      display: "flex",
      justifyContent: "space-between",
      alignSelf: "center",
      // border: "solid red 2px",
    },
    button_client: {
      border: "2px solid #4749df",
      width: { xs: "100%", sm: "40%" },
      color: "#020e20",
      "&:hover": {
        // backgroundColor: "#4749df",
        border: "2px solid #4749df",
        transition: "all 0.25s ease",
        color: "#020e20",
        transform: "scale(1.05)",
      },
    },
    button_psw: {
      border: "1px solid #4749df",
      width: { xs: "100%", sm: "40%" },
      backgroundColor: "#4749df",
      transition: "all 0.25s ease",
      color: "#f7f7f7",
      "&:hover": {
        transform: "scale(1.05)",
      },
    },
  };

  const handleLoginServiceProvider = () => {
    router.push("/loginServiceProvider");
  };
  const handleLoginServiceSeeker = () => {
    router.push("/signupServiceSeeker");
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
          </span>
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
          <Button sx={styles.button_client} onClick={handleLoginServiceSeeker}>
            I need care
          </Button>
          <Button sx={styles.button_psw} onClick={handleLoginServiceProvider}>
            I am PSW
          </Button>
        </Box>
      </Box>
      <Box sx={styles.image_box}></Box>
    </Box>
  );
}

export default LandingPage;
