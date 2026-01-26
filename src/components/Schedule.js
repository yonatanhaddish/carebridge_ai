import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Chip,
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

export default function Schedule() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  // Track specific button loading state
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      // ✅ Correct Endpoint for Confirmed Bookings
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/get_confirmed_request`
      );
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId) => {
    // ⚠️ Critical Warning for Confirmed Jobs
    if (
      !confirm(
        "WARNING: cancelling a confirmed job might affect your rating. Are you sure?"
      )
    )
      return;

    setActionLoadingId(bookingId);
    try {
      // We will create this endpoint next
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/cancel_booking`,
        { booking_id: bookingId }
      );
      fetchBookings(); // Refresh list
    } catch (err) {
      alert("Failed to cancel booking.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        My Schedule
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your upcoming confirmed jobs.
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
                border: "1px solid #4caf50", // Green border for confirmed
                borderRadius: "12px",
                p: 3,
                mb: 3,
                backgroundColor: "#fff",
                boxShadow: "0 4px 12px rgba(76, 175, 80, 0.1)",
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
                <Box>
                  <Typography
                    sx={{
                      fontWeight: "700",
                      fontSize: "1.2rem",
                      color: "#2e7d32",
                    }}
                  >
                    ✅ Confirmed Job ({booking.service_level})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {booking.booking_id.substring(0, 8)}...
                  </Typography>
                </Box>
                <Chip
                  label={`$${booking.hourly_rate}/hr`}
                  color="success"
                  variant="outlined"
                />
              </Box>

              {/* --- DATES --- */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  WHEN
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  sx={{ fontSize: "1.1rem" }}
                >
                  {formatUTCtoLocalCalendarDate(
                    booking.start_date,
                    "EEEE, MMMM d, yyyy"
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Until{" "}
                  {formatUTCtoLocalCalendarDate(
                    booking.end_date,
                    "MMM d, yyyy"
                  )}
                </Typography>

                {/* Slots */}
                {booking.slots?.map((slot, i) => (
                  <Typography key={i} sx={{ mt: 1, fontWeight: 500 }}>
                    ⏰ {slot.startTime} - {slot.endTime}
                  </Typography>
                ))}
              </Box>

              {/* --- CLIENT INFO (UNLOCKED) 🔓 --- */}
              <Box sx={{ mb: 3, bgcolor: "#e8f5e9", p: 2, borderRadius: 2 }}>
                <Typography
                  variant="subtitle2"
                  color="success.main"
                  gutterBottom
                  sx={{ fontWeight: "bold" }}
                >
                  CLIENT DETAILS 🔓
                </Typography>

                <Typography>
                  <b>Name:</b> {booking.seeker_first_name}{" "}
                  {booking.seeker_last_name}
                </Typography>

                <Typography sx={{ mt: 1 }}>
                  <b>Address:</b> {booking.location?.address}
                </Typography>

                <Typography sx={{ mt: 1, fontSize: "1.1rem" }}>
                  <b>📞 Phone:</b>{" "}
                  <a
                    href={`tel:${booking.seeker_phone}`}
                    style={{ color: "#1b5e20", fontWeight: "bold" }}
                  >
                    {booking.seeker_phone || "N/A"}
                  </a>
                </Typography>
              </Box>

              {/* --- ACTIONS --- */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleCancelBooking(booking.booking_id)}
                  disabled={!!actionLoadingId}
                >
                  {actionLoadingId === booking.booking_id ? (
                    <CircularProgress size={20} />
                  ) : (
                    "Cancel Job"
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
                No upcoming jobs.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check your "Offers" tab for new requests!
              </Typography>
            </Paper>
          )}
    </Box>
  );
}
