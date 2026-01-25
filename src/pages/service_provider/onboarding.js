import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Script from "next/script";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Footer from "../../components/Footer";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];

function OnboardingServiceProvider() {
  const router = useRouter();
  const addressRef = useRef(null);
  const autoCompleteRef = useRef(null); // Keep reference to listener to clean up

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
  });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // --- STYLES ---
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
      padding: "10px",
    },
    button_back: {
      border: "1px solid #020e20",
      backgroundColor: "#020e20",
      height: "35px",
      width: { xs: "45px", sm: "50px", md: "55px", lg: "60px", xl: "65px" },
      "&:hover": { backgroundColor: "#1a253a" },
    },
    form_parent_box: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    },
    form_subparent_box: {
      display: "flex",
      flexDirection: "column",
      gap: "25px",
      width: { xs: "100%", sm: "90%", md: "80%", lg: "60%", xl: "50%" },
      padding: { xs: 2, md: 4 },
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

  useEffect(() => {
    const fetchUserSession = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          // Auto-fill the email from the logged-in user
          if (data.user?.email) {
            setFormData((prev) => ({ ...prev, email: data.user.email }));
          }
        } else {
          // If not logged in, kick them out
          router.push("/auth/loginServiceProvider");
        }
      } catch (err) {
        console.error("Session check failed", err);
      }
    };

    fetchUserSession();
  }, [router]);

  // --- GOOGLE MAPS AUTOCOMPLETE ---
  useEffect(() => {
    let interval;

    const initAutocomplete = () => {
      if (window.google && addressRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressRef.current,
          {
            types: ["address"],
            fields: ["address_components", "geometry", "formatted_address"],
          }
        );

        autoCompleteRef.current = autocomplete;

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

          // Fallback to formatted_address if component lookup fails
          const streetAddress =
            streetNumber && route
              ? `${streetNumber.long_name} ${route.long_name}`
              : place.formatted_address.split(",")[0];

          const postal = place.address_components.find((c) =>
            c.types.includes("postal_code")
          );
          const countryComponent = place.address_components.find((c) =>
            c.types.includes("country")
          );

          setError("");
          setFormData((prev) => ({
            ...prev,
            homeAddress: streetAddress, // Ensure this matches what the user sees
            postalCode: postal ? postal.long_name : prev.postalCode,
            country: countryComponent
              ? countryComponent.long_name
              : prev.country,
            latitude: place.geometry.location.lat().toString(),
            longitude: place.geometry.location.lng().toString(),
          }));
        });

        return true; // Loaded successfully
      }
      return false; // Not loaded yet
    };

    // Try immediately
    if (!initAutocomplete()) {
      // If not loaded, check every 500ms (less aggressive than 100ms)
      interval = setInterval(() => {
        if (initAutocomplete()) {
          clearInterval(interval);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (autoCompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(
          autoCompleteRef.current
        );
      }
    };
  }, []);

  const handleInputChange = (field) => (e) => {
    const value = e.target.value;

    setFormData((prev) => {
      const newState = { ...prev, [field]: value };

      // CRITICAL FIX: If user edits address manually, invalidate coordinates
      if (field === "homeAddress") {
        newState.latitude = "";
        newState.longitude = "";
      }
      return newState;
    });
  };

  // Prevent "Enter" key on address field from submitting the form
  const handleAddressKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    if (!formData.latitude || !formData.longitude) {
      setError("Please select a valid address from the dropdown list.");
      setLoading(false);
      return;
    }

    // Rate Logic
    const SERVICE_LEVEL_PRICES = {
      "Level 1": 25,
      "Level 2": 35,
      "Level 3": 50,
    };

    // New Model Logic: We need a PRIMARY level (String).
    // If user selects multiple, we pick the first one as the primary "Role".
    const primaryLevel = formData.serviceLevels[0] || "Level 1";
    const hourlyRate = SERVICE_LEVEL_PRICES[primaryLevel] || 25;

    try {
      const res = await fetch("/api/service_provider/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Identity
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone_number: formData.phoneNumber,

          // GeoJSON Location (The Fix)
          location: {
            type: "Point",
            coordinates: [
              parseFloat(formData.longitude),
              parseFloat(formData.latitude),
            ], // [Lng, Lat]
            address_text: formData.homeAddress,
            postal_code: formData.postalCode,
          },

          // Business Logic (Strict Schema Match)
          service_level: primaryLevel,
          hourly_rate: hourlyRate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setSuccessMsg("Profile created successfully!");
      setTimeout(() => {
        router.push("/service_provider/dashboard");
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Unexpected error occurred");
      setLoading(false);
    }
  };
  return (
    <Box sx={styles.registerBox}>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="lazyOnload"
        onLoad={() => {
          console.log("Google Maps Script loaded successfully");
          // setScriptLoaded(true);
        }}
      />
      <Box sx={styles.navbar_box}>
        <Button sx={styles.button_back} onClick={() => router.push("/")}>
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
            Onboarding | Service Provider
          </Typography>

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
            sx={{
              display: "flex",
              gap: 2,
              width: "80%",
              alignSelf: "center",
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <TextField
              required
              label="First Name"
              value={formData.firstName}
              onChange={handleInputChange("firstName")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{
                flex: 1,
                ...styles.inputField,
                width: { xs: "100%", sm: "auto" },
              }}
            />
            <TextField
              required
              label="Last Name"
              value={formData.lastName}
              onChange={handleInputChange("lastName")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{
                flex: 1,
                ...styles.inputField,
                width: { xs: "100%", sm: "auto" },
              }}
            />
          </Box>

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

          {/* Address with Ref */}
          <TextField
            required
            label="Home Address"
            value={formData.homeAddress}
            onChange={handleInputChange("homeAddress")}
            inputRef={addressRef}
            onKeyDown={handleAddressKeyDown} // Prevent Enter key submit
            placeholder="Start typing your address..."
            InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
            sx={styles.inputField}
            // Visual helper to show if address is valid or not
            helperText={
              !formData.latitude && formData.homeAddress.length > 0
                ? "Please select from dropdown"
                : ""
            }
            error={!formData.latitude && formData.homeAddress.length > 0}
          />

          <Box
            sx={{
              display: "flex",
              gap: 2,
              width: "80%",
              alignSelf: "center",
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <TextField
              required
              label="Postal Code"
              value={formData.postalCode}
              onChange={handleInputChange("postalCode")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{
                flex: 1,
                ...styles.inputField,
                width: { xs: "100%", sm: "auto" },
              }}
            />
            <TextField
              required
              label="Country"
              value={formData.country}
              onChange={handleInputChange("country")}
              InputLabelProps={{ shrink: true, style: { color: "#020e20" } }}
              sx={{
                flex: 1,
                ...styles.inputField,
                width: { xs: "100%", sm: "auto" },
              }}
            />
          </Box>

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

          <Box sx={styles.button_register}>
            <Button
              type="submit"
              sx={{
                color: "#f7f7f7",
                width: "100%",
                fontWeight: "bold",
                height: "100%",
              }}
              disabled={loading}
            >
              {loading ? "Saving Profile..." : "Next: Set Schedule"}
            </Button>
          </Box>
        </Box>
      </Box>

      <Footer />
    </Box>
  );
}

export default OnboardingServiceProvider;
