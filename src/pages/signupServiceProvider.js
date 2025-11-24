import React, { useState } from "react";
import { useRouter } from "next/router";
import { Box, Typography, Button, TextField } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../components/Footer";

function signupServiceProvider() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const style = {
    signupServiceProviderBox: {
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
      //   border: "solid red 2px",
    },

    form_subparent_box: {
      display: "flex",
      flexDirection: "column",
      gap: "30px",
      //   border: "solid red 2px",
      // width changes for all screen sizes
      width: {
        xs: "90%",
        sm: "60%",
        md: "50%",
        lg: "35%",
        xl: "25%",
      },

      height: {
        xs: "auto",
        md: "80%",
        lg: "80%",
      },
    },

    button_signup: {
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

  const handleLoginButton = () => {
    router.push("/loginServiceProvider");
  };
  const handleGoHomeButton = () => {
    router.push("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log("eeeeeeee", e);
  };

  return (
    <Box sx={style.signupServiceProviderBox}>
      <Box sx={style.navbar_box}>
        <Button sx={style.button_back} onClick={handleGoHomeButton}>
          <ArrowBackIcon
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, color: "#f7f7f7" }}
          />
        </Button>
      </Box>

      <Box
        component="form"
        autoComplete="off"
        sx={style.form_parent_box}
        onSubmit={handleSubmit}
      >
        <Box sx={style.form_subparent_box}>
          <Typography
            sx={{ borderBottom: "1px solid #0e3b7a", color: "#B3001B" }}
          >
            Signup | Caregiver
          </Typography>

          <TextField
            required
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#B3001B" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": {
                  border: "2px solid #B3001B",
                },
                "&.Mui-focused fieldset": {
                  border: "2px solid #B3001B",
                },
              },
            }}
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#B3001B" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": {
                  border: "2px solid #B3001B",
                },
                "&.Mui-focused fieldset": {
                  border: "2px solid #B3001B",
                },
              },
            }}
          />

          <TextField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
              style: { color: "#B3001B" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": {
                  border: "2px solid #B3001B",
                },
                "&.Mui-focused fieldset": {
                  border: "2px solid #B3001B",
                },
              },
            }}
          />

          <Box sx={style.button_signup}>
            <Button
              type="submit"
              sx={{
                color: "#F7F7F7",
                width: "100%",
                "&:hover": { backgroundColor: "#990016" }, // slightly darker on hover
              }}
            >
              SignUp
            </Button>
          </Box>
          <Box>
            <Typography>
              Already have an account?
              <Button
                sx={{
                  color: "#0e3b7a",
                  fontWeight: "bold",
                  "&:hover": {
                    border: "solid #0e3b7a 1px",
                  },
                }}
                onClick={handleLoginButton}
              >
                Login
              </Button>
            </Typography>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

export default signupServiceProvider;
