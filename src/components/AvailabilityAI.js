import React, { useState, useEffect } from "react";
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
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Error as ErrorIcon } from "@mui/icons-material";

/** ✅ SAFE DATE PARSER (NO TIMEZONE SHIFT) */
function safeDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 12); // Local noon prevents shift
}

function AvailabilityAI() {
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  /** ✅ Auto-hide only success messages after 5 seconds */
  useEffect(() => {
    if (response && response.success) {
      const timer = setTimeout(() => {
        setResponse(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [response]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/booking`,
        { command }
      );
      setResponse(res.data);
    } catch (err) {
      console.error("API Error:", err);
      setResponse({
        success: false,
        error:
          err.response?.data?.error || err.message || "Something went wrong",
        details: err.response?.data?.details,
      });
    }

    setLoading(false);
  };

  const renderConflicts = (conflicts) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" color="error" gutterBottom>
        ⚠️ Schedule Conflicts Detected
      </Typography>
      <List dense>
        {conflicts.map((conflict, index) => (
          <ListItem key={index} sx={{ alignItems: "flex-start" }}>
            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
              <ErrorIcon color="error" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography
                  variant="body2"
                  color="error.main"
                  fontWeight="medium"
                >
                  {conflict.message}
                </Typography>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {conflict.details}
                  </Typography>
                  {conflict.day && (
                    <Chip
                      label={`Day: ${conflict.day}`}
                      size="small"
                      variant="outlined"
                      color="error"
                      sx={{ mt: 0.5, mr: 1 }}
                    />
                  )}
                  {conflict.requestedTime && (
                    <Chip
                      label={`Your time: ${conflict.requestedTime}`}
                      size="small"
                      variant="outlined"
                      color="error"
                      sx={{ mt: 0.5, mr: 1 }}
                    />
                  )}
                  {conflict.existingTime && (
                    <Chip
                      label={`Conflicts with: ${conflict.existingTime}`}
                      size="small"
                      variant="outlined"
                      color="error"
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const renderSuccess = (data) => (
    <Box>
      {data.added && data.added.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            ✅ Calendar Updated
          </Typography>
          {data.added.map((entry, index) => (
            <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
              {/* ✅ FIXED DATE RANGE DISPLAY */}
              <Typography variant="body2" gutterBottom>
                <strong>Date Range:</strong>{" "}
                {safeDate(entry.start_date)?.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                -{" "}
                {safeDate(entry.end_date)?.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Typography>

              {entry.recurring && entry.recurring.length > 0 && (
                <>
                  <Typography variant="body2" gutterBottom>
                    <strong>Recurring Schedule:</strong>
                  </Typography>
                  <Box
                    sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 1 }}
                  >
                    {entry.recurring.map((schedule, sIndex) => (
                      <Box
                        key={sIndex}
                        sx={{
                          ml: 2,
                          mb: 1,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Chip
                          label={schedule.day}
                          size="small"
                          variant="outlined"
                          sx={{
                            mb: 0.5,
                            color: "#020e20",
                            border: "1px solid #020e20",
                          }}
                        />
                        {schedule.time_slots.map((slot, tIndex) => (
                          <Chip
                            key={tIndex}
                            label={`${slot.start} - ${slot.end}`}
                            size="small"
                            sx={{
                              mr: 0.5,
                              mb: 0.5,
                              backgroundColor: "#020e20",
                              color: "#e0e0e0",
                            }}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box>
      <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          AI Assistant
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Update Your Availability
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              multiline
              minRows={4}
              fullWidth
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Example: Set my availability from March 10 to March 14, 2030 from 11am to 4pm"
              sx={{
                mb: 2,
                backgroundColor: "white",
                borderRadius: 2,
              }}
              disabled={loading}
              aria-label="Availability command input"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !command.trim()}
              sx={{
                backgroundColor: "#4749df",
                ":hover": { backgroundColor: "#6B6DFF" },
                minWidth: 150,
              }}
              aria-label="Update availability"
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Update Availability"
              )}
            </Button>
          </form>
        </Paper>

        {response && (
          <Box mt={2}>
            {response.error ? (
              <Alert severity="error">
                <Typography variant="subtitle1">Error</Typography>
                {response.error}
                {response.details && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {response.details}
                  </Typography>
                )}
              </Alert>
            ) : response.success === false ? (
              <Alert severity="error">
                <Typography variant="subtitle1" gutterBottom>
                  Schedule Conflict
                </Typography>
                {response.conflicts && renderConflicts(response.conflicts)}
              </Alert>
            ) : (
              <Alert severity="success">{renderSuccess(response)}</Alert>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default AvailabilityAI;
