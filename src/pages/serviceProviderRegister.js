import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../components/Footer";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];

function ServiceProviderRegister() {
  const router = useRouter();

  // Form state
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [home_address, setHomeAddress] = useState("");
  const [postal_code, setPostalCode] = useState("");
  const [location_latitude, setLatitude] = useState("");
  const [location_longitude, setLongitude] = useState("");
  const [service_levels_offered, setServiceLevels] = useState([]);
  const [service_prices, setServicePrices] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const SERVICE_LEVEL_PRICES = {
    "Level 1": 25,
    "Level 2": 35,
    "Level 3": 50,
  };

  const style = {
    internal_style: {
      "& .MuiOutlinedInput-root": {
        //   border: "2px solid #4749df",
        "&:hover fieldset": {
          border: "2px solid #4749df",
        },
        "&.Mui-focused fieldset": {
          border: "2px solid #4749df", // keep same border on focus
        },
      },
    },
  };

  useEffect(() => {
    const prices = {};
    service_levels_offered.forEach((level) => {
      prices[level] = SERVICE_LEVEL_PRICES[level];
    });
    setServicePrices(prices);
  }, [service_levels_offered]);

  const handleGoBack = () => {
    router.push("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/service_provider/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name,
          last_name,
          email,
          phone_number,
          home_address,
          postal_code,
          location_latitude: parseFloat(location_latitude),
          location_longitude: parseFloat(location_longitude),
          service_levels_offered,
          service_prices,
          availability_calendar: [],
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!data.success) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Unexpected error occurred");
      setLoading(false);
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: "#e0e0e0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Navbar */}
      <Box
        sx={{
          height: "8%",
          display: "flex",
          alignItems: "center",
          px: { xs: 2, md: 4 },
        }}
      >
        <IconButton
          onClick={handleGoBack}
          sx={{
            border: "1px solid #020e20",
            backgroundColor: "#020e20",
            color: "#f7f7f7",
            "&:hover": { backgroundColor: "#333" },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }} />
        </IconButton>
        <Typography
          variant="h6"
          sx={{
            ml: 2,
            fontWeight: "bold",
            color: "#4749df",
            fontSize: { xs: "1.2rem", md: "1.5rem" },
          }}
        >
          Register | Service Provider
        </Typography>
      </Box>

      {/* Form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: { xs: 2, md: 4 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "25px",
            width: { xs: "100%", sm: "80%", md: "60%", lg: "40%", xl: "30%" },
            p: { xs: 2, md: 4 },
            backgroundColor: "#f7f7f7",
            borderRadius: "8px",
            boxShadow: { xs: "none", md: "0px 4px 12px rgba(0,0,0,0.1)" },
          }}
        >
          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          <TextField
            label="First Name"
            value={first_name}
            onChange={(e) => setFirstName(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Last Name"
            value={last_name}
            onChange={(e) => setLastName(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Phone Number"
            value={phone_number}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Home Address"
            value={home_address}
            onChange={(e) => setHomeAddress(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Postal Code"
            value={postal_code}
            onChange={(e) => setPostalCode(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Latitude"
            type="number"
            value={location_latitude}
            onChange={(e) => setLatitude(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />
          <TextField
            label="Longitude"
            type="number"
            value={location_longitude}
            onChange={(e) => setLongitude(e.target.value)}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          />

          {/* Service Levels */}
          <TextField
            select
            label="Service Levels Offered"
            value={service_levels_offered}
            onChange={(e) =>
              setServiceLevels(
                typeof e.target.value === "string"
                  ? e.target.value.split(",")
                  : e.target.value
              )
            }
            SelectProps={{ multiple: true }}
            required
            InputLabelProps={{
              shrink: true, // keep label on top
              style: { color: "#4749df" }, // label color
            }}
            sx={style.internal_style}
          >
            {serviceLevelsEnum.map((level) => (
              <MenuItem key={level} value={level}>
                {level}
              </MenuItem>
            ))}
          </TextField>

          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: "#4749df",
              color: "#f7f7f7",
              fontWeight: "bold",
              height: { xs: "50px", sm: "60px" },
              "&:hover": { backgroundColor: "#020e20" },
            }}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </Button>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

export default ServiceProviderRegister;
