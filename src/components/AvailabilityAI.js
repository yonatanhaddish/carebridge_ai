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
  Snackbar,
} from "@mui/material";
import {
  EventRepeat as RecurringIcon,
  Event as OneTimeIcon,
  CheckCircle as SuccessIcon,
  Warning as ConflictIcon,
} from "@mui/icons-material";

export function formatUTCtoLocalCalendarDate(utcDateStr, fmt = "yyyy-MM-dd") {
  if (!utcDateStr) return "";

  // 1. If it's a full ISO string (e.g., "2026-03-09T00:00:00.000Z"),
  //    we slice off the "T..." part to get just "2026-03-09".
  const dateOnlyString =
    typeof utcDateStr === "string" ? utcDateStr.split("T")[0] : utcDateStr;

  // 2. parseISO("2026-03-09") creates a date at LOCAL midnight (00:00 EST),
  //    keeping the day as the 9th.
  const date = parseISO(dateOnlyString);

  // 3. Format it
  return format(date, fmt);
}
function AvailabilityAI() {
  const [command, setCommand] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [conflictObject, setConflictObject] = useState(null);
  const [successUpdate, setSuccessUpdated] = useState(false);

  // --- STEP 1: ANALYZE TEXT ---
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!command.trim()) return;

    setLoading(true);
    setParsedData(null);
    setError(null);
    setConflicts(null);

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
  console.log("aiData", parsedData);
  // --- STEP 2: SAVE TO DATABASE ---
  const handleSave = async () => {
    if (!parsedData) return;

    setSaving(true);
    setConflicts(null); // Clear previous conflicts
    setError(null); // Clear previous errors

    try {
      const res = await axios.post(
        "/api/service_provider/update_availability",
        { schedules: parsedData.schedules, mode: "append" },
        { withCredentials: true }
      );

      // Success Path
      if (res.statusText === "OK") {
        setCommand("");
        setParsedData(null);
        setSuccessUpdated(true);
        setOpenSuccess(true);
        setTimeout(() => {
          const timer = setTimeout(() => {
            setSuccessUpdated(false);
          }, 4000);
          return () => clearTimeout(timer);
        });
      } else {
        setSuccessUpdated(false);
      }
    } catch (err) {
      // 1. Log it for debugging (this causes the stack trace in console, which is fine)
      console.log("Save request finished.");

      // 2. Check for Conflict (409)
      if (err.response && err.response.status === 409) {
        setConflicts(err.response.data.dataConflict);
        setConflictObject(err.response.data.dataConflict);
      } else {
        console.error("Critical Error:", err);
        setError(err.response?.data?.error || "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSuccess = (event, reason) => {
    if (reason === "clickaway") return;
    setOpenSuccess(false);
  };
  console.log({
    command,
    parsedData,
    successUpdate,
  });

  // --- RENDER HELPERS ---
  const renderPreview = (data) => {
    const schedules = data?.schedules || [];

    if (schedules.length === 0)
      return <Typography>No schedules found.</Typography>;

    return (
      <Box>
        <List dense sx={{}}>
          {schedules.map((item, index) => {
            const DAYS_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            return (
              <React.Fragment key={index}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: "block" }}>
                        {/* ROW 1: The "When" (Days or Date) */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 0.5,
                            // border: "solid blue 1px",
                          }}
                        >
                          <Typography
                            variant="body2"
                            component="span"
                            sx={{ fontWeight: 600 }}
                          >
                            {item.type === "recurring" && (
                              // RECURRING: "Every Wed, Sat"
                              <span>
                                Every{" "}
                                {item.daysOfWeek
                                  .map((d) => DAYS_MAP[d])
                                  .join(", ")}
                              </span>
                            )}
                            {item.type === "specific_date" &&
                              item.startDate === item.endDate && (
                                // SPECIFIC: "Fri, Mar 12"
                                <span>
                                  {formatUTCtoLocalCalendarDate(
                                    item.startDate,
                                    "MMM d, yyyy"
                                  )}
                                </span>
                              )}
                          </Typography>
                        </Box>

                        {/* ROW 2: The Date Range (Only show for Recurring or if start!=end) */}
                        {(item.type === "recurring" ||
                          item.startDate !== item.endDate) && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              // border: "solid red 1px",
                            }}
                          >
                            {/* ml: 3.5 aligns it under the text, skipping the icon */}
                            <Typography
                              sx={{
                                fontWeight: "400",
                                color: "#020e20",
                              }}
                            >
                              <b>📅</b> {/* Start Date */}
                              {formatUTCtoLocalCalendarDate(
                                item.startDate,
                                "MMM d, yyyy"
                              )}
                              <span style={{ margin: "0 4px" }}>—</span>
                              {/* End Date */}
                              {formatUTCtoLocalCalendarDate(
                                item.endDate,
                                "MMM d, yyyy"
                              )}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box component="span">
                        {/* ⏰ BOTTOM LINE: Time Slots */}
                        <Typography
                          component="div"
                          sx={{ mb: 2, color: "#555", fontSize: "0.9rem" }}
                        >
                          {item.slots?.map((slot, index) => (
                            <div key={index}>
                              ⏰ {slot.startTime} - {slot.endTime}
                            </div>
                          ))}
                        </Typography>
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
  // console.log("parsedData", parsedData);
  // ✅ NEW: CONFLICT RENDERER
  const renderConflicts = () => {
    if (!conflictObject || conflictObject.length === 0) return null;

    return (
      <Alert severity="error" icon={false} sx={{}}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ConflictIcon sx={{ mr: 1, fontSize: 20 }} />
          Schedule Conflicts Detected
        </Typography>
        <List dense>
          {conflictObject.map((c, i) => (
            <ListItem key={i} sx={{ py: 0 }}>
              <ListItemText
                primary={
                  <span style={{ fontWeight: 600, color: "#d32f2f" }}>
                    {c.message}
                  </span>
                }
                secondary={
                  <>
                    <span style={{ fontWeight: 600 }}>
                      Requested: {c.requestedTime}
                    </span>
                    <br />
                    <span style={{ fontWeight: 600 }}>
                      Existing: {c.existingTime}
                    </span>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "flex-start",
            mt: 2,
            // width: "100%",
            // border: "solid blue 2px",
          }}
        >
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setParsedData(null), setConflictObject(null);
            }}
            disabled={saving}
          >
            Discard
          </Button>
        </Box>
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
      {parsedData && !conflictObject && !successUpdate && (
        <Alert
          severity="success"
          icon={false}
          sx={{ border: "1px solid #c8e6c9" }}
        >
          {renderPreview(parsedData)}
        </Alert>
      )}
      {/* --- PREVIEW SECTION --- */}
      {conflictObject && (
        <Alert
          severity="error"
          icon={false}
          sx={{
            border: "1px solid #ffcdd2",
          }}
        >
          {renderConflicts()}
        </Alert>
      )}
      {successUpdate && (
        <Box sx={{ border: "solid #efeffb 1px", width: "100%" }}>
          <Alert
            icon={false}
            sx={{
              width: "100%",
              textAlign: "center",
              justifyContent: "center",
              color: "#020e20",
              fontSize: "1.1rem",
              fontWeight: 500,
            }}
          >
            Update availability action was successful.
          </Alert>
        </Box>
      )}
    </Box>
  );
}

export default AvailabilityAI;
//  {renderConflicts()}
