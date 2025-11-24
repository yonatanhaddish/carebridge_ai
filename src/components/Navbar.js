import React from "react";

import { useRouter } from "next/router";

import { Box, Typography, Button } from "@mui/material";
import ElderlyWomanIcon from "@mui/icons-material/ElderlyWoman";

function Navbar() {
  const router = useRouter();

  const styles = {
    navbar_box: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 4,
      width: "100%",
      height: "8%",
      backgroundColor: "#d9d9d9",
      borderBottom: "1px solid #e0e0e0",
    },
    navbar_logo_box: {
      display: "flex",
      alignItems: "center",
      gap: 1,
      color: "#0e3b7a",
      width: "200px",
      // border: '1px solid #0e3b7a',
    },
    navbar_button_box: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      // border: '1px solid #0e3b7a',
      width: "350px",
      justifyContent: "space-between",
    },
    navbar_logo_icon: {
      fontSize: 38,
      color: "#0e3b7a",
    },
    navbar_logo_text: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#0e3b7a",
    },
    button_login_client: {
      //   border: "1px solid #0e3b7a",
      width: "45%",
      backgroundColor: "#0e3b7a",
      color: "#f7f7f7",
    },
    button_login_provider: {
      //   border: "1px solid #0e3b7a",
      width: "45%",
      color: "#f7f7f7",
      backgroundColor: "#B3001B",
    },
  };

  const handleLoginButton = () => {
    router.push("/signupServiceProvider");
  };
  return (
    <Box sx={styles.navbar_box}>
      <Box sx={styles.navbar_logo_box}>
        <ElderlyWomanIcon sx={styles.navbar_logo_icon} />
        <Typography sx={styles.navbar_logo_text}>
          {" "}
          <span style={{ color: "#B3001B" }}>Care</span>Bridge
        </Typography>
      </Box>
      <Box sx={styles.navbar_button_box}>
        <Button sx={styles.button_login_client}>I need Care</Button>
        <Button sx={styles.button_login_provider} onClick={handleLoginButton}>
          I'm PSW
        </Button>
      </Box>
    </Box>
  );
}

export default Navbar;
