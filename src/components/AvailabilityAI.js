import React, { useState } from "react";
import axios from "axios";
import { format, parseISO } from "date-fns";
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  EventRepeat as RecurringIcon,
  Event as OneTimeIcon,
  CheckCircle as SuccessIcon,
  Warning as ConflictIcon,
} from "@mui/icons-material";

// Helper: Convert Schema Numbers [0-6] to "Sun, Mon..."
const mapWeekdays = (days) => {
  if (!days || days.length === 0) return "";
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  // Handle if AI returns strings "MO" by mistake, or numbers 1
  return days.map((d) => (typeof d === "number" ? map[d] : d)).join(", ");
};

function AvailabilityAI() {
  const [command, setCommand] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  // ✅ STATE FOR CONFLICTS
  const [conflicts, setConflicts] = useState(null);

  // --- STEP 1: ANALYZE TEXT ---
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setParsedData(null);
    setError(null);
    setConflicts(null); // Clear previous conflicts

    try {
      const res = await axios.post(
        "/api/ai/parseServiceProviderCommand",
        { command },
        { withCredentials: true }
      );
      setParsedData(res.data.data);
    } catch (err) {
      console.error("AI Error:", err);
      setError(err.response?.data?.error || "Failed to analyze schedule.");
    } finally {
      setLoading(false);
    }
  };

  // --- STEP 2: SAVE TO DATABASE ---
  const handleSave = async () => {
    if (!parsedData) return;

    setSaving(true);
    setConflicts(null); // Clear previous conflicts
    setError(null); // Clear previous errors

    try {
      await axios.post(
        "/api/service_provider/update_availability",
        { schedules: parsedData.schedules, mode: "append" },
        { withCredentials: true }
      );

      // Success Path
      alert("Success! Your availability is live.");
      setCommand("");
      setParsedData(null);
    } catch (err) {
      // 1. Log it for debugging (this causes the stack trace in console, which is fine)
      console.log("Save request finished.");

      // 2. Check for Conflict (409)
      if (err.response && err.response.status === 409) {
        // ✅ ONLY show the Yellow Box
        setConflicts(err.response.data.conflicts);

        // ❌ DO NOT set the Red Error box.
        // We leave setError(null) so the UI stays clean.
      } else {
        // 3. Real Crash (Database down, 500, etc)
        // NOW we show the Red Box
        console.error("Critical Error:", err);
        setError(err.response?.data?.error || "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };
  // --- RENDER HELPERS ---
  const renderPreview = (data) => {
    const schedules = data?.schedules || [];
    if (schedules.length === 0)
      return <Typography>No schedules found.</Typography>;

    return (
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#2e7d32",
          }}
        >
          <SuccessIcon fontSize="small" /> AI Understood:
        </Typography>

        <List dense sx={{ mb: 2 }}>
          {schedules.map((item, index) => {
            const start = format(parseISO(item.startDate), "MMM do");
            const end = item.endDate
              ? format(parseISO(item.endDate), "MMM do, yyyy")
              : null;
            const fullStart = format(parseISO(item.startDate), "MMM do, yyyy");

            const isRange = item.endDate && item.startDate !== item.endDate;

            return (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box
                        component="span"
                        sx={{ fontWeight: "bold", fontSize: "1.1rem" }}
                      >
                        {item.slots
                          .map((s) => `${s.startTime}-${s.endTime}`)
                          .join(", ")}
                      </Box>
                    }
                    secondary={
                      <Box component="span" sx={{ display: "block", mt: 1 }}>
                        {item.type === "recurring" && (
                          <Chip
                            icon={<RecurringIcon sx={{ fontSize: 16 }} />}
                            label={`Every ${mapWeekdays(item.daysOfWeek)}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 1, mb: 1 }}
                          />
                        )}
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <OneTimeIcon
                            sx={{ fontSize: 18, color: "text.secondary" }}
                          />
                          <Typography variant="body2" component="span">
                            {isRange ? (
                              <span style={{ fontWeight: 600 }}>
                                {start}{" "}
                                <span style={{ color: "#aaa" }}>to</span> {end}
                              </span>
                            ) : (
                              <span style={{ fontWeight: 600 }}>
                                {fullStart}
                              </span>
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < schedules.length - 1 && <Divider component="li" />}
              </React.Fragment>
            );
          })}
        </List>
        <Box
          sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setParsedData(null)}
            disabled={saving}
          >
            Discard
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Publishing..." : "Confirm & Publish"}
          </Button>
        </Box>
      </Box>
    );
  };

  // ✅ NEW: CONFLICT RENDERER
  const renderConflicts = () => {
    if (!conflicts || conflicts.length === 0) return null;

    return (
      <Alert severity="warning" sx={{ mt: 2, border: "1px solid #ff9800" }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", display: "flex", alignItems: "center" }}
        >
          <ConflictIcon sx={{ mr: 1, fontSize: 20 }} />
          Schedule Conflicts Detected
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          The following times overlap with your existing schedule:
        </Typography>
        <List dense>
          {conflicts.map((c, i) => (
            <ListItem key={i} sx={{ py: 0 }}>
              <ListItemText
                primary={
                  <span style={{ fontWeight: 600, color: "#d32f2f" }}>
                    {c.date}: {c.newTime}
                  </span>
                }
                secondary={`Overlaps with existing: ${c.existingTime}`}
              />
            </ListItem>
          ))}
        </List>
      </Alert>
    );
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        AI Assistant
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Update Your Availability
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Type your schedule naturally (e.g., "I work every Mon and Wed from 9am
          to 5pm").
        </Typography>

        <form onSubmit={handleAnalyze}>
          <TextField
            multiline
            minRows={4}
            fullWidth
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Example: Set my availability for next week only, Mon-Fri 10am to 6pm"
            sx={{ mb: 2, backgroundColor: "#f8f9fa" }}
            disabled={loading || parsedData !== null}
          />

          {!parsedData && (
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !command.trim()}
              sx={{ backgroundColor: "#4749df", minWidth: 150 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Analyze Schedule"
              )}
            </Button>
          )}
        </form>
      </Paper>

      {/* --- ERROR MESSAGE --- */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* --- PREVIEW SECTION --- */}
      {parsedData && (
        <Alert
          severity="success"
          icon={false}
          sx={{ border: "1px solid #c8e6c9" }}
        >
          {renderPreview(parsedData)}

          {/* ✅ SHOW CONFLICTS HERE */}
          {renderConflicts()}
        </Alert>
      )}
    </Box>
  );
}

export default AvailabilityAI;
