import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];

function RegisterServiceProvider() {
  const router = useRouter();
  const addressRef = useRef(null);

  // -----------------------------
  // FORM STATE (same structure as Service Seeker)
  // -----------------------------
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    homeAddress: "",
    postalCode: "",
    country: "",
    latitude: "",
    longitude: "",
    serviceLevels: [],
    servicePrices: {},
  });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // STYLE SYSTEM (same structure)
  // -----------------------------
  const styles = {
    registerBox: {
      backgroundColor: "#e0e0e0",
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
      py: 2,
    },
    form_subparent_box: {
      display: "flex",
      flexDirection: "column",
      gap: "25px",
      width: { xs: "100%", sm: "90%", md: "80%", lg: "60%", xl: "50%" },
      p: { xs: 2, md: 4 },
      backgroundColor: "#f7f7f7",
      borderRadius: "8px",
      boxShadow: { xs: "none", md: "0px 4px 12px rgba(0,0,0,0.1)" },
    },
    button_register: {
      height: { xs: "50px", sm: "60px" },
      backgroundColor: "#4749df",
      borderRadius: "3px",
      display: "flex",
      justifyContent: "center",
      width: "80%",
      alignSelf: "center",
    },
    inputField: {
      "& .MuiOutlinedInput-root": {
        "&:hover fieldset": { border: "2px solid #020e20" },
        "&.Mui-focused fieldset": { border: "2px solid #020e20" },
      },
      width: "80%",
      alignSelf: "center",
    },
  };

  // -----------------------------
  // Google Places Autocomplete
  // -----------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.google && addressRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressRef.current,
          {
            types: ["address"],
            fields: ["address_components", "geometry", "formatted_address"],
          }
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (!place.geometry) {
            setError("Please select a valid address from the dropdown");
            return;
          }

          const streetNumber = place.address_components.find((c) =>
            c.types.includes("street_number")
          );
          const route = place.address_components.find((c) =>
            c.types.includes("route")
          );

          const streetAddress = [
            streetNumber ? streetNumber.long_name : "",
            route ? route.long_name : "",
          ]
            .filter(Boolean)
            .join(" ");

          const postal = place.address_components.find((c) =>
            c.types.includes("postal_code")
          );
          const countryComponent = place.address_components.find((c) =>
            c.types.includes("country")
          );

          setError("");
          setFormData((prev) => ({
            ...prev,
            homeAddress: streetAddress,
            postalCode: postal ? postal.long_name : "",
            country: countryComponent ? countryComponent.long_name : "",
            latitude: place.geometry.location.lat().toString(),
            longitude: place.geometry.location.lng().toString(),
          }));
        });

        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // Universal input handler
  // -----------------------------
  const handleInputChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // -----------------------------
  // Form submission
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (!formData.latitude || !formData.longitude) {
      setError("Please select a valid address from the dropdown");
      setLoading(false);
      return;
    }

    // Build price map automatically
    const SERVICE_LEVEL_PRICES = {
      "Level 1": 25,
      "Level 2": 35,
      "Level 3": 50,
    };

    const priceMap = {};
    formData.serviceLevels.forEach((lvl) => {
      priceMap[lvl] = SERVICE_LEVEL_PRICES[lvl];
    });

    try {
      const res = await fetch("/api/service_provider/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone_number: formData.phoneNumber,
          home_address: formData.homeAddress,
          postal_code: formData.postalCode,
          country: formData.country,
          location_latitude: parseFloat(formData.latitude),
          location_longitude: parseFloat(formData.longitude),
          service_levels_offered: formData.serviceLevels,
          service_prices: priceMap,
          availability_calendar: [],
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!data.success) {
        setError(data.error || "Registration failed");
        return;
      }

      setSuccessMsg("Service Provider created successfully!");
      router.push("/dashboard_service_provider");
    } catch (err) {
      console.error(err);
      setError("Unexpected error occurred");
      setLoading(false);
    }
  };

  // -----------------------------
  return (
    <Box sx={styles.registerBox}>
      {/* Navbar */}
      <Box sx={styles.navbar_box}>
        <Button sx={styles.button_back} onClick={() => router.push("/")}>
          <ArrowBackIcon
            sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, color: "#f7f7f7" }}
          />
        </Button>
      </Box>

      {/* Form */}
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
            Register | Service Provider
          </Typography>

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ width: "80%", alignSelf: "center" }}>
              {error}
            </Alert>
          )}
          {successMsg && (
            <Alert
              severity="success"
              sx={{ width: "80%", alignSelf: "center" }}
            >
              {successMsg}
            </Alert>
          )}

          {/* Name Fields */}
          <Box
            sx={{ display: "flex", gap: 2, width: "80%", alignSelf: "center" }}
          >
            <TextField
              required
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange("firstName")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{ flex: 1, ...styles.inputField }}
            />
            <TextField
              required
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange("lastName")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{ flex: 1, ...styles.inputField }}
            />
          </Box>

          {/* Contact Fields */}
          <TextField
            required
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleInputChange("email")}
            InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
            sx={styles.inputField}
          />
          <TextField
            required
            label="Phone Number"
            value={formData.phoneNumber}
            onChange={handleInputChange("phoneNumber")}
            InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
            sx={styles.inputField}
          />

          {/* Address Field */}
          <TextField
            required
            label="Home Address"
            value={formData.homeAddress}
            onChange={handleInputChange("homeAddress")}
            inputRef={addressRef}
            placeholder="Start typing your address..."
            InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
            sx={styles.inputField}
          />

          {/* Postal + Country */}
          <Box
            sx={{ display: "flex", gap: 2, width: "80%", alignSelf: "center" }}
          >
            <TextField
              required
              label="Postal Code"
              value={formData.postalCode}
              onChange={handleInputChange("postalCode")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{ flex: 1, ...styles.inputField }}
            />
            <TextField
              required
              label="Country"
              value={formData.country}
              onChange={handleInputChange("country")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{ flex: 1, ...styles.inputField }}
            />
          </Box>

          {/* Service Levels */}
          <TextField
            select
            required
            label="Service Levels Offered"
            value={formData.serviceLevels}
            SelectProps={{ multiple: true }}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                serviceLevels:
                  typeof e.target.value === "string"
                    ? e.target.value.split(",")
                    : e.target.value,
              }))
            }
            InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
            sx={styles.inputField}
          >
            {serviceLevelsEnum.map((lvl) => (
              <MenuItem key={lvl} value={lvl}>
                {lvl}
              </MenuItem>
            ))}
          </TextField>

          {/* Submit Button */}
          <Box sx={styles.button_register}>
            <Button
              type="submit"
              sx={{ color: "#f7f7f7", width: "100%", fontWeight: "bold" }}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default RegisterServiceProvider;
