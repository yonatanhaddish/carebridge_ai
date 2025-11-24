import React from "react";
import { useRouter } from "next/router";
import { Box, Typography, Button, TextField } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../components/Footer";

function loginServiceProvider() {
  const router = useRouter();

  const style = {
    loginServiceProviderBox: {
      backgroundColor: "#e0e0e0",
      borderBottom: "1px solid #e0e0e0",
      height: "100vh",
    },

    navbar_box: {
      height: "8%",
      display: "flex",
    },

    button_back: {
      border: "1px solid #0e3b7a",
      alignSelf: "center",
      marginLeft: "3%",
      backgroundColor: "#FF9500",
      height: "40px",
      width: { xs: "45px", sm: "50px", md: "55px", lg: "60px", xl: "65px" },
    },

    form_parent_box: {
      height: "87%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },

    form_subparent_box: {
      display: "flex",
      flexDirection: "column",
      gap: "30px",
      width: {
        xs: "90%",
        sm: "60%",
        md: "50%",
        lg: "35%",
        xl: "25%",
      },
      height: {
        xs: "auto",
        md: "60%",
      },
    },

    button_login: {
      height: {
        xs: "60px",
        sm: "70px",
        md: "60px",
        lg: "60px",
        xl: "60px",
      },
      backgroundColor: "#0e3b7a",
      borderRadius: "3px",
      display: "flex",
      justifyContent: "center",
    },
  };

  return (
    <Box sx={style.loginServiceProviderBox}>
      <Box sx={style.navbar_box}>
        <Button sx={style.button_back}>
          <ArrowBackIcon
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, color: "#0e3b7a" }}
          />
        </Button>
      </Box>

      <Box component="form" autoComplete="off" sx={style.form_parent_box}>
        <Box sx={style.form_subparent_box}>
          <Typography
            sx={{ borderBottom: "1px solid #0e3b7a", color: "#0e3b7a" }}
          >
            Login | Caregiver
          </Typography>

          <TextField
            required
            label="Email"
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#0e3b7a" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { border: "2px solid #0e3b7a" },
                "&.Mui-focused fieldset": { border: "2px solid #0e3b7a" },
              },
            }}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#0e3b7a" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { border: "2px solid #0e3b7a" },
                "&.Mui-focused fieldset": { border: "2px solid #0e3b7a" },
              },
            }}
          />

          <Box sx={style.button_login}>
            <Button sx={{ color: "#F7F7F7" }}>Login</Button>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

export default loginServiceProvider;
