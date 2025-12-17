import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Divider,
  Grid,
} from "@mui/material";
import axios from "axios";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PersonIcon from "@mui/icons-material/Person";

// Proper date formatting
import { format, parseISO } from "date-fns";

/**
 * Convert UTC ISO string to local formatted string
 * @param {string|Date} utcDateStr - UTC ISO string
 * @param {string} fmt - optional date-fns format string
 */
export function formatUTCtoLocalCalendarDate(
  utcDateStr,
  fmt = "yyyy-MM-dd HH:mm"
) {
  if (!utcDateStr) return "";
  const date =
    typeof utcDateStr === "string" ? parseISO(utcDateStr) : utcDateStr;
  return format(date, fmt); // uses local timezone automatically
}

export default function MyBookingSS({ sendBookingDataToParent }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/bookings`
      );
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to load bookings."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    sendBookingDataToParent(bookings);
  }, [bookings, sendBookingDataToParent]);

  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    console.log("111", bookingId);

    setCancelLoadingId(bookingId);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/bookings/cancel/${bookingId}`
      );
      fetchBookings();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to cancel booking."
      );
    } finally {
      setCancelLoadingId(null);
    }
  };

  const formatUTCDateOnly = (date) => {
    return new Date(date).toLocaleDateString("en-CA", {
      timeZone: "UTC",
    });
  };

  console.log("333", bookings);

  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        My Bookings
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View, manage, and cancel your bookings.
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
              key={booking._id}
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                p: 3,
                mb: 3,
                backgroundColor: "#EFEFFB",
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                width: { sm: "100%", md: "70%" },
                mx: "auto",
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  pb: 2,
                  mb: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography sx={{ fontWeight: "700", fontSize: "1.25rem" }}>
                  {booking.service_level}
                </Typography>

                <Typography
                  sx={{
                    fontWeight: "700",
                    fontSize: "1.25rem",
                    color: "#1976d2",
                  }}
                >
                  <p>
                    Price: {parseFloat(booking.price.toString()).toFixed(2)}
                  </p>
                </Typography>
              </Box>

              {/* Schedule */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: "600", mb: 0.5 }}>
                  Schedule
                </Typography>

                {Array.isArray(booking.daily_bookings) &&
                  booking.daily_bookings.map((day, idx) => (
                    <Box key={idx} sx={{ ml: 1, mb: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {formatUTCDateOnly(day.date)}
                      </Typography>

                      <Typography sx={{ color: "#555" }}>
                        {day.time_slots
                          .map((slot) => `${slot.start} – ${slot.end}`)
                          .join(", ")}
                      </Typography>
                    </Box>
                  ))}
              </Box>

              {/* Provider & Status */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: "600" }}>
                  Provider:
                  <span style={{ fontWeight: "normal", marginLeft: "6px" }}>
                    {booking.provider?.name || "Unassigned"}
                  </span>
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                  <Typography sx={{ fontWeight: "600", mr: 1 }}>
                    Status:
                  </Typography>

                  <Chip
                    label={booking.status}
                    sx={{
                      fontWeight: "600",
                      borderRadius: "16px",
                      px: 1.5,
                      backgroundColor:
                        booking.status.toLowerCase() === "pending"
                          ? "#ffeeba"
                          : booking.status.toLowerCase().includes("cancel")
                          ? "#f8d7da"
                          : "#d4edda",
                      color:
                        booking.status.toLowerCase() === "pending"
                          ? "#856404"
                          : booking.status.toLowerCase().includes("cancel")
                          ? "#721c24"
                          : "#155724",
                    }}
                  />
                </Box>
              </Box>

              {/* Cancel Button */}
              <Box sx={{ mt: 2, textAlign: "right" }}>
                <Button
                  variant="contained"
                  color="error"
                  sx={{
                    textTransform: "none",
                    fontWeight: "600",
                    px: 3,
                    py: 1,
                    borderRadius: "10px",
                    width: "180px",
                  }}
                  onClick={() => handleCancel(booking.booking_id)}
                  disabled={cancelLoadingId === booking.booking_id}
                >
                  {cancelLoadingId === booking._id ? (
                    <CircularProgress size={20} sx={{ color: "white" }} />
                  ) : (
                    "Cancel Booking"
                  )}
                </Button>
              </Box>
            </Box>
          ))
        : !loading && (
            <Paper sx={{ p: 3, mt: 3, textAlign: "center" }}>
              <Typography>No bookings found.</Typography>
            </Paper>
          )}
    </Box>
  );
}
