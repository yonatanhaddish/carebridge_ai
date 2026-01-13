import React, { useState } from "react";
import { useRouter } from "next/router";
import { Box, Typography, Button, TextField } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// FIXED: Import Footer from the correct components folder
import Footer from "../../components/Footer";

// FIXED: Component name must be Capitalized
function SignupServiceProvider() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const style = {
    signupServiceProviderBox: {
      backgroundColor: "#e0e0e0",
      borderBottom: "1px solid #e0e0e0",
      minHeight: "100vh", // Better for varying screen heights
      display: "flex",
      flexDirection: "column",
    },

    navbar_box: {
      height: "8%",
      display: "flex",
      padding: "10px",
    },

    button_back: {
      border: "1px solid #020e20",
      alignSelf: "center",
      marginLeft: "3%",
      backgroundColor: "#020e20",
      height: "35px",
      minWidth: "45px", // improved responsiveness
      "&:hover": {
        backgroundColor: "#1a253a",
      },
    },

    form_parent_box: {
      flexGrow: 1, // Takes up remaining space
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 0",
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
    },

    button_signup: {
      height: { xs: "50px", md: "60px" },
      backgroundColor: "#4749df",
      borderRadius: "3px",
      display: "flex",
      justifyContent: "center",
      width: "80%",
      alignSelf: "center",
    },
    button_login: {
      width: "80%",
      alignSelf: "center",
      textAlign: "center",
    },
  };

  const handleLoginButton = () => {
    router.push("/auth/loginServiceProvider");
  };
  const handleGoHomeButton = () => {
    router.push("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "service_provider" }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check HTTP status, not just data.success
        setError(data.error || "Signup failed");
        alert(data.error || "Signup failed"); // Simple alert for now
        return;
      }

      // Success!
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", email);
      router.push("/service_provider/onboarding");
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred");
    }
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
            sx={{ borderBottom: "1px solid #0e3b7a", color: "#4749df" }}
          >
            <span style={{ fontSize: "2rem", color: "#020e20" }}>Signup</span> |
            PSW
          </Typography>

          <TextField
            required
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
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
          />

          <TextField
            required
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
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
          />

          <TextField
            required
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
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
          />

          <Box sx={style.button_signup}>
            <Button
              type="submit"
              sx={{
                color: "#F7F7F7",
                width: "100%",
                height: "100%",
                fontSize: "1.1rem",
              }}
            >
              Sign Up
            </Button>
          </Box>

          <Box sx={style.button_login}>
            <Typography>
              Already have an account?{" "}
              <Button
                sx={{
                  color: "#020e20",
                  fontWeight: "bold",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "transparent",
                    textDecoration: "underline",
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

export default SignupServiceProvider;
