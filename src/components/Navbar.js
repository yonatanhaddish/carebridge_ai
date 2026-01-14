import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { Box, Typography, Button } from "@mui/material";
import ElderlyWomanIcon from "@mui/icons-material/ElderlyWoman";

function Navbar() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setLoggedIn(data.isAuthenticated);
          setLoggedInUser(data.user);
        } else {
          setLoggedIn(false);
        }
      } catch (e) {
        setLoggedIn(false);
      }
    }
    checkAuth();
  }, [router.asPath]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setLoggedInUser(null);
      setLoggedIn(false);
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const styles = {
    navbar_box: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      px: { xs: 2, md: 4 },
      py: 2,
      width: "100%",
      backgroundColor: "#d9d9d9",
      borderBottom: "1px solid #e0e0e0",
      // flexDirection: { xs: "column", sm: "row" },
      gap: { xs: 2, sm: 0 },
      // border: "solid red 1px",
    },
    navbar_logo_box: {
      display: "flex",
      alignItems: "center",
      gap: 1,
      color: "#4749df",
      width: { xs: "40%", sm: "200px" },
      justifyContent: { xs: "center", sm: "flex-start" },
      cursor: "pointer",
      // border: "solid red 1px",
    },
    navbar_button_box: {
      display: "flex",
      alignItems: "center",
      gap: { xs: 2, sm: 2 },
      width: { xs: "40%", sm: "350px" },
      justifyContent: { xs: "center", sm: "space-between" },
      flexDirection: { xs: "column", sm: "row" },
      pb: { xs: 3, sm: 0 },
    },
    navbar_logo_icon: {
      fontSize: { xs: 28, md: 38 },
      color: "#4749df",
    },
    navbar_logo_text: {
      fontSize: { xs: 18, md: 20 },
      fontWeight: "bold",
      color: "#4749df",
    },
    button_outline: {
      border: "2px solid #4749df",
      width: { xs: "100%", sm: "45%" },
      color: "#020e20",
      "&:hover": {
        backgroundColor: "#e0e0e0",
        border: "2px solid #4749df",
      },
    },
    button_filled: {
      border: "1px solid #4749df",
      width: { xs: "100%", sm: "45%" },
      color: "#f7f7f7",
      backgroundColor: "#4749df",
      "&:hover": {
        "&:hover": {
          transform: "scale(1.05)",
        },
      },
    },
  };

  return (
    <Box sx={styles.navbar_box}>
      {/* LOGO */}
      <Box sx={styles.navbar_logo_box} onClick={() => router.push("/")}>
        <ElderlyWomanIcon sx={styles.navbar_logo_icon} />
        <Typography sx={styles.navbar_logo_text}>CareBridge</Typography>
      </Box>

      {/* BUTTONS BASED ON AUTH */}
      <Box sx={styles.navbar_button_box}>
        {!loggedIn ? (
          <>
            <Button
              sx={styles.button_outline}
              onClick={() => router.push("/auth/loginServiceSeeker")}
            >
              I need Care
            </Button>

            <Button
              sx={styles.button_filled}
              onClick={() => router.push("/auth/loginServiceProvider")}
            >
              I'm PSW
            </Button>
          </>
        ) : (
          <>
            <Button
              sx={{
                ...styles.button_outline,
                border: "none",
                "&:hover": {
                  border: "none",
                },
              }}
            ></Button>

            <Button sx={styles.button_filled} onClick={handleLogout}>
              Logout
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}

export default Navbar;
