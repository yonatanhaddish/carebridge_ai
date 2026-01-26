import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
} from "@mui/material";
import axios from "axios";
import { format, parseISO } from "date-fns";

// --- Helper Date Formatter ---
export function formatUTCtoLocalCalendarDate(
  utcDateStr,
  fmt = "yyyy-MM-dd HH:mm"
) {
  if (!utcDateStr) return "";
  const date =
    typeof utcDateStr === "string" ? parseISO(utcDateStr) : utcDateStr;
  return format(date, fmt);
}

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  // Track which specific button is loading
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/get_pending_request`
      );
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleRejectOffer = async (bookingId) => {
    if (!confirm("Are you sure you want to reject this booking?")) return;

    setActionLoadingId(bookingId);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/reject_request`,
        { booking_id: bookingId }
      );
      fetchBookings(); // Refresh list
    } catch (err) {
      alert("Failed to reject offer.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptOffer = async (bookingId) => {
    if (!confirm("Are you sure you want to accept this booking?")) return;

    setActionLoadingId(bookingId);
    try {
      // 👇 UPDATED CALL
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/accept_booking`,
        { booking_id: bookingId } // Send ID in body
      );

      alert("Booking Confirmed!"); // Simple success feedback
      fetchBookings(); // Refresh list to remove it (since list only shows Pending)
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to accept booking. It might conflict with another job."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        My Job Requests
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View and manage incoming booking requests.
      </Typography>

      {loading && (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {error && (
        <Paper sx={{ p: 2, bgcolor: "error.light", color: "white", mt: 3 }}>
          <Typography variant="h6">Error</Typography>
          <Typography>{error}</Typography>
        </Paper>
      )}

      {!loading && bookings.length > 0
        ? bookings.map((booking) => (
            <Box
              key={booking.booking_id}
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                p: 3,
                mb: 3,
                backgroundColor: "#F9FAFB",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              {/* --- HEADER --- */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #eee",
                  pb: 2,
                  mb: 2,
                }}
              >
                <Typography
                  sx={{ fontWeight: "700", fontSize: "1.2rem", color: "#333" }}
                >
                  {booking.service_level} Request
                </Typography>
                <Typography
                  sx={{
                    fontWeight: "700",
                    fontSize: "1.2rem",
                    color: "#1976d2",
                  }}
                >
                  ${booking.hourly_rate} / hr
                </Typography>
              </Box>

              {/* --- DATES --- */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  DATE & TIME
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {formatUTCtoLocalCalendarDate(
                    booking.start_date,
                    "EEE, MMM d, yyyy"
                  )}
                  {" — "}
                  {formatUTCtoLocalCalendarDate(
                    booking.end_date,
                    "EEE, MMM d, yyyy"
                  )}
                </Typography>

                {/* Show Time Slots */}
                {booking.slots &&
                  booking.slots.map((slot, idx) => (
                    <Typography key={idx} variant="body2" sx={{ mt: 0.5 }}>
                      🕒 {slot.startTime} - {slot.endTime}
                      {slot.crossesMidnight ? " (Next Day)" : ""}
                    </Typography>
                  ))}
              </Box>

              {/* --- CLIENT INFO --- */}
              <Box
                sx={{
                  mb: 3,
                  bgcolor: "#fff",
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #eee",
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  CLIENT DETAILS
                </Typography>

                <Typography sx={{ fontWeight: "600" }}>
                  Name:{" "}
                  <span style={{ fontWeight: "normal" }}>
                    {booking.seeker_first_name} {booking.seeker_last_name}
                  </span>
                </Typography>

                <Typography sx={{ fontWeight: "600", mt: 1 }}>
                  Location:{" "}
                  <span style={{ fontWeight: "normal" }}>
                    {booking.location?.address || "Location provided on map"}
                  </span>
                </Typography>

                <Typography sx={{ fontWeight: "600", mt: 1, color: "#888" }}>
                  Phone:{" "}
                  <span style={{ fontWeight: "normal", fontStyle: "italic" }}>
                    Hidden until Accepted -- coming soon!!!
                  </span>
                </Typography>

                {booking.notes && (
                  <Typography sx={{ fontWeight: "600", mt: 1 }}>
                    Notes:{" "}
                    <span style={{ fontWeight: "normal" }}>
                      {booking.notes}
                    </span>
                  </Typography>
                )}
              </Box>

              {/* --- ACTIONS --- */}
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleRejectOffer(booking.booking_id)}
                  disabled={!!actionLoadingId}
                >
                  {actionLoadingId === booking.booking_id
                    ? "Processing..."
                    : "Decline"}
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  onClick={() => handleAcceptOffer(booking.booking_id)}
                  disabled={!!actionLoadingId}
                  sx={{ px: 4 }}
                >
                  {actionLoadingId === booking.booking_id ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Accept Booking"
                  )}
                </Button>
              </Box>
            </Box>
          ))
        : !loading && (
            <Paper
              sx={{ p: 4, mt: 3, textAlign: "center", bgcolor: "#f5f5f5" }}
            >
              <Typography variant="h6" color="text.secondary">
                No pending requests.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enjoy your day off! ☀️
              </Typography>
            </Paper>
          )}
    </Box>
  );
}
