import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

export default function BookingAI() {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/booking`,
        { command }
      );
      setResult(response.data);
    } catch (err) {
      console.error(
        "Booking failed:",
        err.response ? err.response.data : err.message
      );
      setError(
        err.response
          ? err.response.data.message ||
              err.response.data.error ||
              "An unknown error occurred."
          : "Network error."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{ p: 4, maxWidth: 800, margin: "auto", backgroundColor: "#e0e0e0" }}
    >
      <Typography variant="h4" gutterBottom sx={{ color: "#020e20" }}>
        CareBridge AI Booking
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Enter your service request (e.g., "I need a Level 2 PSW every Wednesday
        next month from 10 AM to 2 PM at 123 Main St, Toronto.").
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, mb: 4 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Type your booking request here"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          variant="outlined"
          required
          disabled={loading}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": {
              "&:hover fieldset": { border: "2px solid #020e20" },
              "&.Mui-focused fieldset": { border: "2px solid #020e20" },
            },
            backgroundColor: "#EFEFFB",
          }}
          InputLabelProps={{
            style: { color: "#020e20" },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{
            backgroundColor: "#4749df",
            ":hover": { backgroundColor: "#6B6DFF" },
            mt: 2,
          }}
          disabled={loading || command.trim() === ""}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Find & Book Care"
          )}
        </Button>
      </Box>

      {error && (
        <Paper sx={{ p: 2, bgcolor: "error.light", color: "white" }}>
          <Typography variant="h6">Error:</Typography>
          <Typography>{error}</Typography>
        </Paper>
      )}

      {result && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography
            variant="h5"
            color={result.success ? "success.main" : "warning.main"}
            gutterBottom
          >
            {result.message}
          </Typography>

          {/* <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
            Bookings Created (Pending): {result.summary.totalBookingsCreated}
          </Typography> */}

          {/* {result.results.successful.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">
                Successful Requests ({result.results.successful.length}):
              </Typography>
              {result.results.successful.map((item, index) => (
                <Paper
                  key={index}
                  sx={{ p: 1.5, mt: 1, borderLeft: "5px solid green" }}
                >
                  <Typography variant="body2">
                    {item.entry.service_level} with {item.provider.name} (
                    {item.totalBookings} slots)
                  </Typography>
                </Paper>
              ))}
            </Box>
          )} */}

          {/* {result.results.failed.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" color="error.main">
                Failed Requests ({result.results.failed.length}):
              </Typography>
              {result.results.failed.map((item, index) => (
                <Typography key={index} color="error.main" variant="body2">
                  - {item.entry.service_level} on {item.entry.start_date}:{" "}
                  {item.reason}
                </Typography>
              ))}
            </Box>
          )} */}
        </Paper>
      )}
    </Box>
  );
}
