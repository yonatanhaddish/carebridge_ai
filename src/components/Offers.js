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

  // console.log("bookings", bookings);

  const handleRejectOffer = async (bookingId) => {
    if (!confirm("Are you sure you want to reject this booking?")) return;

    setActionLoadingId(bookingId);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/reject_booking`,
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

  const calculateTotal = (booking) => {
    // 1. If database has the total, use it directly (Best Case)
    if (booking.total_estimated_cost) {
      return booking.total_estimated_cost.toFixed(2);
    }

    // 2. Fallback: Calculate manually (Slots × Days × Rate)
    if (booking.slots && booking.slots.length > 0) {
      const slot = booking.slots[0];

      // --- A. Calculate Hours Per Day ---
      const startHour = parseInt(slot.startTime.split(":")[0], 10);
      const endHour = parseInt(slot.endTime.split(":")[0], 10);

      let dailyHours = endHour - startHour;
      if (dailyHours <= 0) dailyHours = 1; // Minimum 1 hour safety

      // --- B. Calculate Number of Days ---
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);

      // Normalize to midnight to ignore time differences
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      // Get difference in time (milliseconds)
      const diffTime = Math.abs(endDate - startDate);
      // Convert to days + 1 (because May 12 to May 12 is 1 day, not 0)
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // --- C. Final Total ---
      return (dailyHours * totalDays * booking.hourly_rate).toFixed(2);
    }

    // 3. Last Resort: Just return the hourly rate
    return booking.hourly_rate.toFixed(2);
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
                border: "solid #000 2px",
                borderRadius: 2,
                backgroundColor: "#fff",
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {/* --- HEADER --- */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  margin: "0 auto",
                  pt: 2,
                  width: "94%",
                  // border: "solid red 2px",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: "600",
                    fontSize: "1.1rem",
                    // backgroundColor: "#4749df",
                    color: "#4749df",
                    textAlign: "center",
                  }}
                >
                  {booking.service_level} ↔ ${booking.hourly_rate} / hr
                </Typography>
                <Typography
                  sx={{
                    mb: 1,
                    backgroundColor: "#efeffb",
                    width: "150px",
                    textAlign: "center",
                    borderRadius: "60px",
                    alignSelf: "center",
                    border: "solid 1px #4749df",
                  }}
                >
                  Pending
                </Typography>
              </Box>

              {/* --- DATES --- */}
              <Box
                sx={{
                  // border: "solid red 2px",
                  width: "96%",
                  margin: "0 auto",
                  // mt: 1,
                  // p: 2,
                  // border: "solid red 2px",
                }}
              >
                <Typography sx={{ mb: 1, color: "#555" }}>
                  <b>📅</b>{" "}
                  {formatUTCtoLocalCalendarDate(
                    booking.start_date,
                    "MMM dd, yyyy"
                  )}{" "}
                  to{" "}
                  {formatUTCtoLocalCalendarDate(
                    booking.end_date,
                    "MMM dd, yyyy"
                  )}
                </Typography>

                {/* Show Time Slots */}
                {booking.slots &&
                  booking.slots.map((slot, idx) => (
                    <Typography
                      sx={{ mb: 2, color: "#555", fontSize: "0.9rem" }}
                      key={{ idx }}
                    >
                      ⏰ {booking.slots?.[0]?.startTime} -{" "}
                      {booking.slots?.[0]?.endTime}
                    </Typography>
                  ))}
                <Typography sx={{ mt: -1 }}>
                  💲 {calculateTotal(booking)}
                </Typography>
              </Box>

              {/* --- CLIENT INFO --- */}
              <Box
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 2,
                  // border: "solid red 2px",
                  width: "96%",
                  margin: "0 auto",
                  // p: 2,
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
                  👨{" "}
                  <span style={{ fontWeight: "600" }}>
                    {booking.seeker_first_name} {booking.seeker_last_name}
                  </span>
                </Typography>
                <Typography sx={{ fontWeight: "600", mt: 1 }}>
                  🏠{" "}
                  <span style={{ fontWeight: "normal" }}>
                    {booking.location?.address || "Location provided on map"}
                  </span>
                </Typography>
                <Typography sx={{ fontWeight: "600", mt: 1, color: "#888" }}>
                  📞{" "}
                  <span
                    style={{
                      fontWeight: "normal",
                      fontStyle: "italic",
                      backgroundColor: "#000",
                      color: "#000",
                    }}
                  >
                    111-222-3333
                  </span>
                  <span style={{ fontWeight: "normal", fontStyle: "italic" }}>
                    (Once accepted phone number will be visible)
                  </span>
                </Typography>
              </Box>

              {/* --- ACTIONS --- */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "space-around",
                  alignSelf: "end",
                  // border: "solid red 2px",
                  width: "60%",
                  pb: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => handleRejectOffer(booking.booking_id)}
                  disabled={!!actionLoadingId}
                  sx={{
                    width: "40%",
                    border: "solid 2px #4749df",
                    color: "#020e20",
                  }}
                >
                  {actionLoadingId === booking.booking_id
                    ? "Processing..."
                    : "Reject"}
                </Button>

                <Button
                  variant="contained"
                  onClick={() => handleAcceptOffer(booking.booking_id)}
                  disabled={!!actionLoadingId}
                  sx={{ width: "40%", backgroundColor: "#4749fd" }}
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
