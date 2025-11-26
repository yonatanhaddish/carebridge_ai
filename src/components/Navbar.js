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
      px: { xs: 2, md: 4 }, // smaller padding on mobile
      py: 2,
      width: "100%",
      backgroundColor: "#d9d9d9",
      borderBottom: "1px solid #e0e0e0",
      flexDirection: { xs: "column", sm: "row" }, // stack on mobile
      gap: { xs: 2, sm: 0 },
    },
    navbar_logo_box: {
      display: "flex",
      alignItems: "center",
      gap: 1,
      color: "#4749df",
      width: { xs: "100%", sm: "200px" },
      justifyContent: { xs: "center", sm: "flex-start" },
    },
    navbar_button_box: {
      display: "flex",
      alignItems: "center",
      gap: { xs: 2, sm: 2 },
      width: { xs: "100%", sm: "350px" },
      justifyContent: { xs: "center", sm: "space-between" },
      flexDirection: { xs: "column", sm: "row" }, // stack buttons on mobile
    },
    navbar_logo_icon: {
      fontSize: { xs: 28, md: 38 },
      color: "#4749df",
    },
    navbar_logo_text: {
      fontSize: { xs: 16, md: 18 },
      fontWeight: "bold",
      color: "#4749df",
    },
    button_login_client: {
      border: "2px solid #4749df",
      width: { xs: "100%", sm: "45%" },
      color: "#020e20",
      "&:hover": {
        backgroundColor: "#4749df",
        color: "#f7f7f7",
      },
    },
    button_login_provider: {
      border: "1px solid #4749df",
      width: { xs: "100%", sm: "45%" },
      color: "#f7f7f7",
      backgroundColor: "#4749df",
      "&:hover": {
        backgroundColor: "#020e20",
      },
    },
  };

  const handleLoginServiceProvider = () => {
    router.push("/signupServiceProvider");
  };
  const handleLoginServiceSeeker = () => {
    router.push("/signupServiceSeeker");
  };

  return (
    <Box sx={styles.navbar_box}>
      <Box sx={styles.navbar_logo_box}>
        <ElderlyWomanIcon sx={styles.navbar_logo_icon} />
        <Typography sx={styles.navbar_logo_text}>CareBridge</Typography>
      </Box>
      <Box sx={styles.navbar_button_box}>
        <Button
          sx={styles.button_login_client}
          onClick={handleLoginServiceSeeker}
        >
          I need Care
        </Button>
        <Button
          sx={styles.button_login_provider}
          onClick={handleLoginServiceProvider}
        >
          I'm PSW
        </Button>
      </Box>
    </Box>
  );
}

export default Navbar;
