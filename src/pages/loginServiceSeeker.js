import React, { useState } from "react";
import { useRouter } from "next/router";
import { Box, Typography, Button, TextField, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../components/Footer";

function LoginServiceSeeker() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const styles = {
    loginServiceSeekerBox: {
      backgroundColor: "#e0e0e0",
      borderBottom: "1px solid #e0e0e0",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
    },
    navbar_box: {
      height: "8%",
      display: "flex",
      alignItems: "center",
      px: { xs: 2, md: 4 },
    },
    button_back: {
      border: "1px solid #020e20",
      backgroundColor: "#020e20",
      height: "35px",
      width: { xs: "45px", sm: "50px", md: "55px", lg: "60px", xl: "65px" },
    },
    form_parent_box: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      px: { xs: 2, md: 4 },
    },
    form_subparent_box: {
      display: "flex",
      flexDirection: "column",
      gap: "30px",
      width: { xs: "100%", sm: "80%", md: "60%", lg: "40%", xl: "30%" },
      p: { xs: 2, md: 4 },
      backgroundColor: "#f7f7f7",
      borderRadius: "8px",
      boxShadow: { xs: "none", md: "0px 4px 12px rgba(0,0,0,0.1)" },
    },
    button_login: {
      height: { xs: "50px", sm: "60px" },
      backgroundColor: "#4749df",
      borderRadius: "3px",
      display: "flex",
      justifyContent: "center",
      width: "80%",
      alignSelf: "center",
    },
    button_signup: {
      width: "80%",
      alignSelf: "center",
      textAlign: "center",
    },
  };

  const handleSignupButton = () => {
    router.push("/signupServiceSeeker");
  };
  const handleGoHomeButton = () => {
    router.push("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      // Reset form
      setEmail("");
      setPassword("");

      router.push("/chatbot");
    } catch (err) {
      setError("An unexpected error occurred");
      console.log("error", err);
    }
  };

  return (
    <Box sx={styles.loginServiceSeekerBox}>
      <Box sx={styles.navbar_box}>
        <Button sx={styles.button_back} onClick={handleGoHomeButton}>
          <ArrowBackIcon
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, color: "#f7f7f7" }}
          />
        </Button>
      </Box>

      <Box
        component="form"
        autoComplete="off"
        sx={styles.form_parent_box}
        onSubmit={handleSubmit}
      >
        <Box sx={styles.form_subparent_box}>
          <Typography
            sx={{
              borderBottom: "1px solid #0e3b7a",
              color: "#4749df",
              textAlign: "center",
              fontSize: { xs: "1.5rem", md: "2rem" },
            }}
          >
            Login | Client
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "80%", alignSelf: "center" }}>
              {error}
            </Alert>
          )}

          <TextField
            required
            value={email}
            label="Email"
            InputLabelProps={{
              shrink: true,
              style: { color: "#020e20" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { border: "2px solid #020e20" },
                "&.Mui-focused fieldset": { border: "2px solid #020e20" },
              },
              width: "80%",
              alignSelf: "center",
            }}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            required
            label="Password"
            type="password"
            value={password}
            InputLabelProps={{
              shrink: true,
              style: { color: "#020e20" },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { border: "2px solid #020e20" },
                "&.Mui-focused fieldset": { border: "2px solid #020e20" },
              },
              width: "80%",
              alignSelf: "center",
            }}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Box sx={styles.button_login}>
            <Button type="submit" sx={{ color: "#F7F7F7", width: "100%" }}>
              Login
            </Button>
          </Box>

          <Box sx={styles.button_signup}>
            <Typography>
              Don't have an account?{" "}
              <Button
                sx={{
                  color: "#020e20",
                  fontWeight: "bold",
                  "&:hover": { border: "solid #020e20 1px" },
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

export default LoginServiceSeeker;
