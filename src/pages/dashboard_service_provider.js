import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Card,
  CardContent,
} from "@mui/material";

function DashboardServiceProvider() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/booking`,
        {
          command,
        }
      );

      setResponse(res.data);
    } catch (err) {
      console.error("API Error:", err);
      setResponse({
        error: err.response?.data?.error || "Something went wrong",
        details: err.response?.data?.details,
      });
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#ad62d5", mb: 3 }}>
        Service Provider Dashboard
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Create Booking with Natural Language
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            multiline
            minRows={4}
            placeholder="Type your booking command...
Example: 'Book me every Monday and Wednesday from 2pm to 4pm in January 2025'
Example: 'Schedule daily meetings from 9am to 5pm from 2025-01-01 to 2025-01-10'"
            fullWidth
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            sx={{
              mb: 2,
              backgroundColor: "white",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            disabled={loading}
          />

          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: "#ad62d5",
              ":hover": { backgroundColor: "#964ec0" },
              minWidth: 120,
            }}
            disabled={loading || !command.trim()}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create Booking"
            )}
          </Button>
        </form>
      </Paper>

      {response && (
        <Box mt={2}>
          {response.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle1">Error</Typography>
              {response.error}
              {response.details && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Details: {response.details}
                </Typography>
              )}
            </Alert>
          ) : (
            <Card sx={{ backgroundColor: "#f8f5ff" }}>
              <CardContent>
                <Typography variant="h6" color="success.main" gutterBottom>
                  Booking Created Successfully!
                </Typography>

                {response.user && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>User:</strong> {response.user.email}
                  </Typography>
                )}

                {response.parsed && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Parsed Schedule:
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{ p: 2, backgroundColor: "white" }}
                    >
                      <pre style={{ margin: 0, fontSize: "0.875rem" }}>
                        {JSON.stringify(response.parsed, null, 2)}
                      </pre>
                    </Paper>
                  </Box>
                )}

                {response.dates && (
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    <strong>Dates:</strong> {response.dates.join(", ")}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
}

export default DashboardServiceProvider;
