import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  List,
} from "@mui/material";
import axios from "axios";
import { format, parseISO } from "date-fns";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BoltIcon from "@mui/icons-material/Bolt";
import SuccessIcon from "@mui/icons-material/CheckCircleOutline";
import EventIcon from "@mui/icons-material/Event";

export default function BookingAI() {
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);

  // Stages: 'input' -> 'review' -> 'results' (for list) OR 'success' (for book)
  const [stage, setStage] = useState("input");

  const [aiData, setAiData] = useState(null);
  const [providers, setProviders] = useState([]); // For LIST intent
  const [bookedDetails, setBookedDetails] = useState(null); // For BOOK intent
  const [error, setError] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [saving, setSaving] = useState(false);

  // --- STEP 1: ANALYZE ---
  const handleAnalyze = async (e) => {
    e.preventDefault();

    if (!command.trim()) return;

    setLoading(true);
    setError(null);
    setAiData(null);

    try {
      const res = await axios.post("/api/ai/parseServiceSeekerCommand", {
        command,
      });
      const data = res.data.data;

      if (data.error) throw new Error(data.error);

      setAiData(data);
      setStage("review");
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(
        err.response?.data?.error || "Could not understand your request."
      );
    } finally {
      setLoading(false);
    }
  };
  console.log("aiData:", aiData);
  console.log("stage:", stage);
  // --- STEP 2: EXECUTE (The Branching Logic) ---
  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setSaving(true);

    try {
      if (aiData.intent === "book") {
        // --- BRANCH A: AUTO-BOOK ---
        const res = await axios.post("/api/service_seeker/auto_book", aiData);
        setBookedDetails(res.data);
        setStage("success"); // Show success screen
      } else {
        // --- BRANCH B: SEARCH / LIST ---
        const res = await axios.post("/api/service_seeker/search", {
          service_level: aiData.service_level,
          max_distance_km: aiData.max_distance_km,
        });
        setProviders(res.data.results);
        setStage("results"); // Show list screen
      }
    } catch (err) {
      console.error("Execution failed:", err);
      setError(err.response?.data?.error || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStage("input");
    setAiData(null);
    setProviders([]);
    setBookedDetails(null);
    setError(null);
  };

  const handleDiscardButton = () => {
    setAiData(null);
    setStage("input");
  };

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: "auto",
        p: 3,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        AI Booking
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
            placeholder={
              "Example:\n" +
              "• Book a Level 2 caregiver for next Tuesday from 10am to 2pm at 20 Eglinton Ave. West.\n" +
              "• Show me Level 1 caregivers within 15km that are available from June 10th to June 28th from 4pm to 10pm."
            }
            sx={{ mb: 2, backgroundColor: "#f8f9fa" }}
            disabled={loading || aiData !== null}
          />

          {!aiData && (
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !command.trim()}
              sx={{ backgroundColor: "#4749df", minWidth: 150 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Analyze Booking"
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

      {/* --- STAGE 1: INPUT --- */}
      {/* {stage === "input" && (
        <Box component="form" onSubmit={handleAnalyze}>
          <Typography color="text.secondary" paragraph>
            Type "List" to browse or "Book" to reserve instantly. <br />
            <i>
              Ex: "Book a Level 2 nurse for next Tuesday" vs "Show me Level 2
              nurses"
            </i>
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="How can we help?"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={loading}
            sx={{ mb: 2, bgcolor: "white" }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !command.trim()}
            sx={{ width: "100%", bgcolor: "#4749df", py: 1.5 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Analyze Request"
            )}
          </Button>
        </Box>
      )} */}

      {/* --- STAGE: REVIEW AND Intent: Book --- */}
      {stage === "review" && aiData.intent === "book" && (
        <Alert
          severity="success"
          icon={false}
          sx={{ border: "1px solid #c8e6c9" }}
        >
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
            <Box sx={{ mt: 1, mb: 1, ml: 4 }}>
              <Typography variant="body2">
                Booking: <b>{aiData.service_level} PSW</b>
              </Typography>
              <Typography variant="body2">
                Address:{" "}
                <b>{aiData.location_query || "Your profile address"}</b>
              </Typography>
            </Box>
            <List>
              {aiData.schedules.map((sch, i) => {
                // 1. Format Dates
                const start = format(parseISO(sch.startDate), "MMM do");
                const end = sch.endDate
                  ? format(parseISO(sch.endDate), "MMM do, yyyy")
                  : null;
                const isRange = sch.endDate && sch.startDate !== sch.endDate;

                // 2. Get Location (Fallback to profile if null)
                const locationText =
                  aiData.location_query || "your profile address";

                return (
                  <React.Fragment key={i}>
                    {/* 3. Map through SLOTS to get the time */}
                    {sch.slots.map((slot, k) => (
                      <Typography variant="body2" key={k} sx={{ mt: 0, ml: 3 }}>
                        <b>{isRange ? `${start} - ${end}` : start}</b> from{" "}
                        <b>{slot.startTime}</b> to <b>{slot.endTime}</b>
                      </Typography>
                    ))}
                  </React.Fragment>
                );
              })}
            </List>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "space-around",
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => handleDiscardButton()}
                disabled={saving}
              >
                Discard
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleExecute}
                disabled={saving}
              >
                {saving ? "Booking..." : "Confirm & Book"}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
      {/* --- STAGE: REVIEW AND Intent: List --- */}
      {stage === "review" && aiData.intent === "list" && (
        <Alert
          severity="success"
          icon={false}
          sx={{ border: "1px solid #c8e6c9" }}
        >
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
            <Box sx={{ mt: 1, mb: 1, ml: 4 }}>
              <Typography variant="body2">
                List: <b>{aiData.service_level} PSW</b>
              </Typography>
              <Typography variant="body2">
                Address:{" "}
                <b>{aiData.location_query || "Your profile address"}</b>
              </Typography>
            </Box>
            <List>
              {aiData.schedules.map((sch, i) => {
                // 1. Format Dates
                const start = format(parseISO(sch.startDate), "MMM do");
                const end = sch.endDate
                  ? format(parseISO(sch.endDate), "MMM do, yyyy")
                  : null;
                const isRange = sch.endDate && sch.startDate !== sch.endDate;

                // 2. Get Location (Fallback to profile if null)
                const locationText =
                  aiData.location_query || "your profile address";

                return (
                  <React.Fragment key={i}>
                    {/* 3. Map through SLOTS to get the time */}
                    {sch.slots.map((slot, k) => (
                      <Typography variant="body2" key={k} sx={{ mt: 0, ml: 3 }}>
                        <b>{isRange ? `${start} - ${end}` : start}</b> from{" "}
                        <b>{slot.startTime}</b> to <b>{slot.endTime}</b>
                      </Typography>
                    ))}
                  </React.Fragment>
                );
              })}
            </List>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: "space-around",
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                color="inherit"
                onClick={() => handleDiscardButton()}
                disabled={saving}
              >
                Discard
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleExecute}
                disabled={saving}
              >
                {saving ? "Booking..." : "Confirm & List"}
              </Button>
            </Box>
          </Box>
        </Alert>
      )}
      {/* --- STAGE 3A: LIST RESULTS --- */}
      {stage === "results" && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h6">
              Found {providers.length} Providers
            </Typography>
            <Button size="small" onClick={handleReset}>
              New Search
            </Button>
          </Box>

          {providers.map((provider) => (
            <Card
              key={provider._id}
              sx={{ mb: 2, borderLeft: "5px solid #4749df" }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold">
                  {provider.first_name} {provider.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {provider.service_level} • ${provider.hourly_rate}/hr
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2, bgcolor: "#020e20" }}
                >
                  Select
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* --- STAGE 3B: BOOK SUCCESS --- */}
      {stage === "success" && bookedDetails && (
        <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#e8f5e9" }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: "green", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Booking Request Sent!
          </Typography>
          <Typography variant="body1">
            We have sent your request to <b>{bookedDetails.provider_name}</b>.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Status: {bookedDetails.booking.status}
          </Typography>
          <Button variant="outlined" onClick={handleReset} sx={{ mt: 3 }}>
            Book Another
          </Button>
        </Paper>
      )}
    </Box>
  );
}

// {stage === "review" && aiData && (
//         <Box>
//           <Typography
//             variant="subtitle1"
//             sx={{
//               fontWeight: "bold",
//               display: "flex",
//               alignItems: "center",
//               gap: 1,
//               color: "#2e7d32",
//             }}
//           >
//             <SuccessIcon fontSize="small" /> AI Understood:
//           </Typography>

//           <Paper
//             variant="outlined"
//             sx={{ p: 3, mb: 3, bgcolor: "white", borderColor: "#4749df" }}
//           >
//             <Stack spacing={2}>
//               <Box display="flex" justifyContent="space-between">
//                 <Box>
//                   <Typography variant="caption" color="text.secondary">
//                     INTENT
//                   </Typography>
//                   <Chip
//                     label={aiData.intent.toUpperCase()}
//                     color={aiData.intent === "book" ? "error" : "primary"}
//                     size="small"
//                     sx={{ ml: 1, fontWeight: "bold" }}
//                   />
//                 </Box>
//                 <Box>
//                   <Typography variant="caption" color="text.secondary">
//                     LEVEL
//                   </Typography>
//                   <Typography variant="body1" fontWeight="bold">
//                     {aiData.service_level}
//                   </Typography>
//                 </Box>
//               </Box>

//               <Divider />

//               <Box>
//                 <Typography variant="caption" color="text.secondary">
//                   SCHEDULE
//                 </Typography>
//                 {aiData.schedules && aiData.schedules.length > 0 ? (
//                   aiData.schedules.map((sch, i) => (
//                     <Box key={i} sx={{ mt: 1 }}>
//                       <Typography variant="body2">
//                         {sch.type === "specific_date"
//                           ? `${sch.startDate} - ${sch.endDate}`
//                           : "Recurring"}
//                       </Typography>
//                     </Box>
//                   ))
//                 ) : (
//                   <Typography sx={{ fontStyle: "italic", mt: 1 }}>
//                     No specific time (General)
//                   </Typography>
//                 )}
//               </Box>
//             </Stack>
//           </Paper>

//           <Stack direction="row" spacing={2}>
//             <Button
//               variant="outlined"
//               onClick={handleReset}
//               startIcon={<ArrowBackIcon />}
//               fullWidth
//             >
//               Cancel
//             </Button>
//             <Button
//               variant="contained"
//               onClick={handleExecute}
//               fullWidth
//               sx={{ bgcolor: aiData.intent === "book" ? "#d32f2f" : "#4749df" }}
//               startIcon={
//                 loading ? (
//                   <CircularProgress size={20} color="inherit" />
//                 ) : aiData.intent === "book" ? (
//                   <BoltIcon />
//                 ) : (
//                   <SearchIcon />
//                 )
//               }
//               disabled={loading}
//             >
//               {aiData.intent === "book"
//                 ? "Confirm & Auto-Book"
//                 : "Search Results"}
//             </Button>
//           </Stack>
//         </Box>
//       )}
