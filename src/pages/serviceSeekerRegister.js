import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function RegisterServiceSeeker() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    home_address: "",
    postal_code: "",
    location_latitude: "",
    location_longitude: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/service_seeker/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // include cookie for auth
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Service Seeker created successfully!");
      setLoading(false);
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        home_address: "",
        postal_code: "",
        location_latitude: "",
        location_longitude: "",
      });
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Try again.");
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 500,
        mx: "auto",
        mt: 6,
        p: 4,
        borderRadius: 3,
        boxShadow: 3,
      }}
    >
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Register Service Seeker (Client)
      </Typography>

      {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
      {successMsg && <Alert severity="success">{successMsg}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          label="First Name"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Last Name"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Phone Number"
          name="phone_number"
          value={form.phone_number}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Home Address"
          name="home_address"
          value={form.home_address}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Postal Code"
          name="postal_code"
          value={form.postal_code}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Latitude"
          name="location_latitude"
          type="number"
          value={form.location_latitude}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Longitude"
          name="location_longitude"
          type="number"
          value={form.location_longitude}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={26} /> : "Create Service Seeker"}
        </Button>
      </form>
    </Box>
  );
}
