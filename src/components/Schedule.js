import React, { use, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
} from "@mui/material";
import axios from "axios";

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

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [seeker, setSeeker] = useState({});

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/scheduled`
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
    if (bookings.length > 0) {
      bookings.forEach(async (booking) => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/${booking.service_seeker_id}`
          );
          setSeeker((prev) => ({
            ...prev,
            [booking.service_seeker_id]: response.data.seeker,
          }));
        } catch (err) {
          console.error("Failed to fetch seeker data:", err);
        }
      });
    }
  }, [bookings]);
  // console.log("555", seeker);

  const handleCancelOffer = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    // console.log("111", bookingId);

    setCancelLoadingId(bookingId);

    console.log("bookingId", bookingId);
    console.log("cancelLoadingId", cancelLoadingId);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/cancel/${bookingId}`
      );
      fetchBookings();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to cancel offer."
      );
    }
  };

  const statusColor = (status) => {
    const value = status?.toLowerCase();
    if (value === "pending") return "warning";
    if (value === "confirmed" || value === "approved") return "success";
    if (value === "Cancelled" || value === "cancelled") return "error";
    return "default";
  };

  const renderRecurringSchedule = (recurring) => {
    if (!recurring?.length) return "No recurring schedule.";
    return (
      <Box component="ul" sx={{ ml: 2, mt: 0 }}>
        {recurring.map((r, i) => (
          <Typography key={i} component="li" variant="body2">
            <b>{r.day}:</b>{" "}
            {r.time_slots.map((s) => `${s.start}–${s.end}`).join(", ")}
          </Typography>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        My Offers
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        View, manage, and cancel your offers.
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
                  {booking.price} CAD / hr
                </Typography>
              </Box>

              {/* Dates */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: "600", mb: 0.5 }}>
                  Dates
                </Typography>
                <Typography sx={{ color: "#555" }}>
                  {formatUTCtoLocalCalendarDate(
                    booking.start_datetime,
                    "yyyy-MM-dd"
                  )}{" "}
                  →{" "}
                  {formatUTCtoLocalCalendarDate(
                    booking.end_datetime,
                    "yyyy-MM-dd"
                  )}
                </Typography>
                <Typography sx={{ color: "#555" }}>
                  {formatUTCtoLocalCalendarDate(
                    booking.start_datetime,
                    "HH:mm"
                  )}{" "}
                  →{" "}
                  {formatUTCtoLocalCalendarDate(booking.end_datetime, "HH:mm")}
                </Typography>
              </Box>

              {/* Recurring */}
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    pl: 1,
                    color: "#555",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                  }}
                >
                  {renderRecurringSchedule(booking.recurring)}
                </Box>
              </Box>

              {/* Provider & Status */}
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: "600" }}>
                  Client:
                  <span style={{ fontWeight: "normal", marginLeft: "6px" }}>
                    {seeker[booking.service_seeker_id]?.first_name}{" "}
                    {seeker[booking.service_seeker_id]?.last_name}
                  </span>
                </Typography>
                <Typography sx={{ fontWeight: "600" }}>
                  Address:
                  <span style={{ fontWeight: "normal", marginLeft: "6px" }}>
                    {seeker[booking.service_seeker_id]?.home_address}
                  </span>
                </Typography>
                <Typography sx={{ fontWeight: "600" }}>
                  Phone Number:
                  <span style={{ fontWeight: "normal", marginLeft: "6px" }}>
                    {seeker[booking.service_seeker_id]?.phone_number}
                  </span>
                </Typography>
              </Box>
              {/* Cancel Button */}
              <Box
                sx={{ mt: 2, display: "flex", justifyContent: "space-around" }}
              >
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
                  onClick={() => handleCancelOffer(booking.booking_id)}
                  disabled={cancelLoadingId === booking.booking_id}
                >
                  {cancelLoadingId === booking._id ? (
                    <CircularProgress size={20} sx={{ color: "white" }} />
                  ) : (
                    "Cancel Offer"
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
