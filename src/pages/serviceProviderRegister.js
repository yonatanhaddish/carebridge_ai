import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../components/Footer";
import ServiceProvider from "@/models/ServiceProvider";

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

  // Styles
  const style = {
    formBox: {
      backgroundColor: "#e0e0e0",
      minHeight: "100vh",
      paddingTop: "2rem",
    },
    navbar: {
      display: "flex",
      alignItems: "center",
      padding: "0 1rem",
    },
    formContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      maxWidth: "600px",
      margin: "2rem auto",
      padding: "2rem",
      backgroundColor: "#f7f7f7",
      borderRadius: "8px",
      boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
    },
    button: {
      backgroundColor: "#4749df",
      color: "#fff",
      "&:hover": { backgroundColor: "#3b3fcc" },
    },
  };

  const SERVICE_LEVEL_PRICES = {
    "Level 1": 25,
    "Level 2": 35,
    "Level 3": 50,
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
          availability_calendar: [], // you can expand this later with date ranges
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!data.success) {
        setError(data.error || "Registration failed");
        return;
      }

      // Redirect after success
      router.push("/dashboard"); // change to your dashboard route
    } catch (err) {
      setError("Unexpected error occurred");
      setLoading(false);
      console.error(err);
    }
  };

  return (
    <Box sx={style.formBox}>
      <Box sx={style.navbar}>
        <IconButton onClick={handleGoBack}>
          <ArrowBackIcon fontSize="large" />
        </IconButton>
        <Typography variant="h5" sx={{ marginLeft: "1rem" }}>
          Register | Service Provider
        </Typography>
      </Box>

      <Box component="form" sx={style.formContainer} onSubmit={handleSubmit}>
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}

        <TextField
          label="First Name"
          value={first_name}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <TextField
          label="Last Name"
          value={last_name}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Phone Number"
          value={phone_number}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <TextField
          label="Home Address"
          value={home_address}
          onChange={(e) => setHomeAddress(e.target.value)}
          required
        />
        <TextField
          label="Postal Code"
          value={postal_code}
          onChange={(e) => setPostalCode(e.target.value)}
          required
        />
        <TextField
          label="Latitude"
          type="number"
          value={location_latitude}
          onChange={(e) => setLatitude(e.target.value)}
          required
        />
        <TextField
          label="Longitude"
          type="number"
          value={location_longitude}
          onChange={(e) => setLongitude(e.target.value)}
          required
        />
        {/* Service Levels (Multi-Select) */}
        <TextField
          select
          label="Service Levels Offered"
          value={service_levels_offered}
          onChange={(e) => setServiceLevels(e.target.value)}
          SelectProps={{
            multiple: true,
          }}
          required
        >
          {serviceLevelsEnum.map((level) => (
            <MenuItem key={level} value={level}>
              {level}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Price for Selected Level"
          type="number"
          value={service_prices[service_levels_offered[0]] || ""}
          onChange={(e) =>
            setServicePrices({
              ...service_prices,
              [service_levels_offered[0]]: parseFloat(e.target.value),
            })
          }
          required
        />

        <Button
          type="submit"
          variant="contained"
          sx={style.button}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </Button>
      </Box>

      <Footer />
    </Box>
  );
}

export default ServiceProviderRegister;
