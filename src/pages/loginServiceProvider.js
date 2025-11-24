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
      backgroundColor: "#0e3b7a",
      height: "35px",
      width: { xs: "45px", sm: "50px", md: "55px", lg: "60px", xl: "65px" },
    },

    form_parent_box: {
      height: "87%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      // border: "solid green 2px",
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
        lg: "80%",
      },
      // border: "solid green 2px",
    },

    button_login: {
      height: {
        xs: "60px",
        sm: "70px",
        md: "60px",
        lg: "60px",
        xl: "60px",
      },
      backgroundColor: "#B3001B",
      borderRadius: "3px",
      display: "flex",
      justifyContent: "center",
    },
  };

  const handleSignupButton = () => {
    router.push("/signupServiceProvider");
  };
  const handleGoHomeButton = () => {
    router.push("/");
  };

  return (
    <Box sx={style.loginServiceProviderBox}>
      <Box sx={style.navbar_box}>
        <Button sx={style.button_back} onClick={handleGoHomeButton}>
          <ArrowBackIcon
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, color: "#f7f7f7" }}
          />
        </Button>
      </Box>

      <Box component="form" autoComplete="off" sx={style.form_parent_box}>
        <Box sx={style.form_subparent_box}>
          <Typography
            sx={{ borderBottom: "1px solid #0e3b7a", color: "#B3001B" }}
          >
            Login | Caregiver
          </Typography>

          <TextField
            required
            label="Email"
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#B3001B" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { border: "2px solid #B3001B" },
                "&.Mui-focused fieldset": { border: "2px solid #B3001B" },
              },
            }}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#B3001B" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { border: "2px solid #B3001B" },
                "&.Mui-focused fieldset": { border: "2px solid #B3001B" },
              },
            }}
          />

          <Box sx={style.button_login}>
            <Button sx={{ color: "#F7F7F7" }}>Login</Button>
          </Box>
          <Box>
            <Typography>
              Don't have an account?{" "}
              <Button
                sx={{
                  color: "#0e3b7a",
                  fontWeight: "bold",
                  "&:hover": {
                    border: "solid #0e3b7a 1px",
                  },
                }}
                onClick={handleSignupButton}
              >
                SignUp
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

export default loginServiceProvider;
