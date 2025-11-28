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
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

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
        success: false,
        error: err.response?.data?.error || "Something went wrong",
        details: err.response?.data?.details,
      });
    }

    setLoading(false);
  };

  const renderConflicts = (conflicts) => {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" color="error" gutterBottom>
          ⚠️ Schedule Conflicts Detected:
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
  };

  const renderSuccess = (data) => {
    return (
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
          <Typography variant="h6" color="success.main">
            {data.message}
          </Typography>
        </Box>

        {data.added && data.added.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Added Schedule Entries:
            </Typography>
            {data.added.map((entry, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Date Range:</strong>{" "}
                  {new Date(entry.start_date).toLocaleDateString()} -{" "}
                  {new Date(entry.end_date).toLocaleDateString()}
                </Typography>
                {entry.recurring && entry.recurring.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Recurring Schedule:</strong>
                    </Typography>
                    {entry.recurring.map((schedule, sIndex) => (
                      <Box key={sIndex} sx={{ ml: 2, mb: 1 }}>
                        <Chip
                          label={schedule.day}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 1, mb: 0.5 }}
                        />
                        {schedule.time_slots.map((slot, tIndex) => (
                          <Chip
                            key={tIndex}
                            label={`${slot.start} - ${slot.end}`}
                            size="small"
                            color="secondary"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                )}
              </Card>
            ))}
          </Box>
        )}

        {data.totalAvailabilityEntries && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Total availability entries:{" "}
            <strong>{data.totalAvailabilityEntries}</strong>
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#ad62d5", mb: 3 }}>
        Service Provider Dashboard
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Update Your Availability
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            multiline
            minRows={4}
            placeholder="Type your availability command...
Example: 'Make me available every Monday and Wednesday from 2pm to 4pm in January 2025'
Example: 'Set my availability daily from 9am to 5pm from 2025-01-01 to 2025-01-10'
Example: 'I'm available on Tuesdays and Thursdays from 10am to 3pm for the next month'"
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
              "Update Availability"
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
          ) : response.success === false ? (
            // Conflict case - show red notification
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {response.notification?.title || "Schedule Conflict"}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {response.notification?.message ||
                  "Unable to update availability due to conflicts"}
              </Typography>

              {response.conflicts && renderConflicts(response.conflicts)}

              <Typography variant="body2" sx={{ mt: 2, fontStyle: "italic" }}>
                No changes were made to your schedule. Please resolve the
                conflicts and try again.
              </Typography>
            </Alert>
          ) : response.success === true ? (
            // Success case
            <Alert severity="success" sx={{ mb: 2 }}>
              {renderSuccess(response)}
            </Alert>
          ) : (
            // Fallback for other responses
            <Card sx={{ backgroundColor: "#f8f5ff" }}>
              <CardContent>
                <Typography variant="h6" color="success.main" gutterBottom>
                  Booking Created Successfully!
                </Typography>
                <pre style={{ margin: 0, fontSize: "0.875rem" }}>
                  {JSON.stringify(response, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      <Box sx={{ mt: 4, p: 2, border: "1px dashed #ccc", borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Calendar Preview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your availability calendar will be displayed here
        </Typography>
      </Box>
    </Box>
  );
}

export default DashboardServiceProvider;
