import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import axios from "axios";
import { format, parseISO } from "date-fns";

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

export default function MyBookingSS({ sendBookingDataToParent }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [showListStatus, setShowListStatus] = useState("Accepted");

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/get_my_booking`
      );
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError("Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (sendBookingDataToParent) {
      sendBookingDataToParent(bookings);
    }
  }, [bookings, sendBookingDataToParent]);

  // --- 1. FILTERING LOGIC: Separate into 3 Groups ---
  const pendingBookings = bookings.filter((b) => b.status === "Pending");

  // "Active" includes Confirmed AND Awaiting Review (Provider finished, needs check)
  const activeBookings = bookings.filter((b) =>
    ["Confirmed"].includes(b.status)
  );

  const pastBookings = bookings.filter((b) => ["Completed"].includes(b.status));
  console.log("pendingBookings", pendingBookings);
  console.log("acceptedBookings", activeBookings);
  console.log("historyBooking", pastBookings);
  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelLoadingId(bookingId);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/cancel_request`,
        {
          booking_id: bookingId,
        }
      );
      fetchBookings();
    } catch (err) {
      alert("Failed to cancel booking.");
    } finally {
      setCancelLoadingId(null);
    }
  };

  const handleShowStatus = (status) => {
    setShowListStatus(status);
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

  console.log("pendingBookings", pendingBookings);
  return (
    <Box sx={{ p: 4, maxWidth: 900, margin: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
        My Bookings
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage your upcoming and past appointments.
      </Typography>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-around",
          width: "60%",
          mb: 3,
        }}
      >
        <Typography
          sx={{ borderBottom: "1px solid #000" }}
          onClick={() => {
            handleShowStatus("Accepted");
          }}
        >
          Accepted
        </Typography>
        <Typography
          sx={{ borderBottom: "1px solid #000" }}
          onClick={() => {
            handleShowStatus("Pending");
          }}
        >
          Pending
        </Typography>
        <Typography
          sx={{ borderBottom: "1px solid #000" }}
          onClick={() => {
            handleShowStatus("History");
          }}
        >
          History
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <CircularProgress size={40} />
        </Box>
      )}

      {error && (
        <Paper sx={{ p: 2, bgcolor: "error.light", color: "white", mt: 3 }}>
          <Typography>{error}</Typography>
        </Paper>
      )}

      {!loading && (
        <>
          {/* SECTION 1: ACTIVE (Confirmed) */}
          {showListStatus === "Accepted" && activeBookings.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                // border: "solid green 2px",
              }}
            >
              {activeBookings.map((booking) => (
                // <BookingCard key={booking.booking_id} booking={booking} />
                <Box
                  sx={{
                    border: "solid #000 2px",
                    width: "90%",
                    borderRadius: 2,
                    backgroundColor: "#fff",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                      // width: "100%",
                      margin: "0 auto",
                      backgroundColor: "#4749df",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        backgroundColor: "#4749df",
                        color: "#fff",
                        padding: "4px 8px",
                        width: "120px",
                        textAlign: "center",
                      }}
                    >
                      {booking.service_level}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        padding: "4px 8px",
                        backgroundColor: "#4749df",
                        color: "#fff",
                        width: "150px",
                        textAlign: "center",
                      }}
                    >
                      CAD {calculateTotal(booking)}
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: "#fff", p: 2 }}>
                    <Typography
                      sx={{
                        mb: 1,
                        backgroundColor: "#efeffb",
                        width: "fit-content",
                        borderRadius: "8px",
                        width: "100px",
                        color: "#020e20",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      {booking.status}
                    </Typography>
                    <Typography sx={{ mb: 1, color: "#555" }}>
                      <b>📅 Date:</b>{" "}
                      {formatUTCtoLocalCalendarDate(
                        booking.start_date,
                        "MMM dd, yyyy"
                      )}
                    </Typography>
                    <Typography
                      sx={{ mb: 2, color: "#555", fontSize: "0.9rem" }}
                    >
                      ⏰ {booking.slots?.[0]?.startTime} -{" "}
                      {booking.slots?.[0]?.endTime}
                    </Typography>

                    <Typography sx={{ fontWeight: "600" }}>
                      👨{" "}
                      <span style={{ fontWeight: "600" }}>
                        {booking.provider_first_name}{" "}
                        {booking.provider_last_name || "Waiting for match..."}
                      </span>
                    </Typography>
                    <Typography sx={{ color: "green", fontWeight: "bold" }}>
                      📞{" "}
                      <a href={`tel:${booking.provider_phone}`}>
                        {booking.provider_phone}
                      </a>
                    </Typography>
                    <Typography>
                      💲 {booking.hourly_rate} CAD per hour
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      mt: 1,
                      width: "250px",
                      ml: 3,
                      mb: 2,
                    }}
                  >
                    <Button
                      variant="contained"
                      color="error"
                      sx={{ width: "100%" }}
                      onClick={() => handleCancel(booking.booking_id)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {showListStatus === "Accepted" && activeBookings.length === 0 && (
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#fafafa" }}>
              <Typography color="text.secondary">
                No accepted bookings found.
              </Typography>
            </Paper>
          )}

          {/* SECTION 2: PENDING (Waiting) */}
          {showListStatus === "Pending" && pendingBookings.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                // border: "solid green 2px",
              }}
            >
              {pendingBookings.map((booking) => (
                // <BookingCard key={booking.booking_id} booking={booking} />
                <Box
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
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      pt: 2,
                      width: "94%",
                      margin: "0 auto",
                      // border: "solid red 2px",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        color: "#4749df",
                        padding: "4px 8px",
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
                      {booking.status}
                    </Typography>
                  </Box>
                  <Box sx={{ width: "96%", margin: "0 auto" }}>
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
                    <Typography
                      sx={{ mb: 2, color: "#555", fontSize: "0.9rem" }}
                    >
                      ⏰ {booking.slots?.[0]?.startTime} -{" "}
                      {booking.slots?.[0]?.endTime}
                    </Typography>
                    <Typography sx={{ mt: -1 }}>
                      💲 {calculateTotal(booking)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: "96%", margin: "0 auto" }}>
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
                        {booking.provider_first_name}{" "}
                        {booking.provider_last_name}
                      </span>
                    </Typography>
                    <Typography sx={{ fontWeight: "600", color: "#888" }}>
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
                      <span
                        style={{ fontWeight: "normal", fontStyle: "italic" }}
                      >
                        (Once accepted phone number will be visible)
                      </span>
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      pb: 2,
                      width: "40%",
                      // border: "solid red 2px",
                      justifyContent: "center",
                      alignSelf: "start",
                    }}
                  >
                    <Button
                      variant="outlined"
                      color="error"
                      sx={{
                        border: "solid 2px #4749df",
                        color: "#020e20",
                        width: "80%",
                      }}
                      onClick={() => handleCancel(booking.booking_id)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {showListStatus === "Pending" && pendingBookings.length === 0 && (
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#fafafa" }}>
              <Typography color="text.secondary">
                No pending bookings found.
              </Typography>
            </Paper>
          )}

          {/* SECTION 3: PAST (History) */}
          {showListStatus === "History" && pastBookings.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                // border: "solid green 2px",
              }}
            >
              {pastBookings.map((booking) => (
                // <BookingCard key={booking.booking_id} booking={booking} />
                <Box
                  sx={{
                    border: "solid #000 2px",
                    width: "90%",
                    borderRadius: 2,
                    backgroundColor: "#fff",
                    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 2,
                      // width: "100%",
                      margin: "0 auto",
                      backgroundColor: "#4749df",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        backgroundColor: "#4749df",
                        color: "#fff",
                        padding: "4px 8px",
                        width: "120px",
                        textAlign: "center",
                      }}
                    >
                      {booking.service_level}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        padding: "4px 8px",
                        backgroundColor: "#4749df",
                        color: "#fff",
                        width: "150px",
                        textAlign: "center",
                      }}
                    >
                      CAD {calculateTotal(booking)}
                    </Typography>
                  </Box>
                  <Box sx={{ backgroundColor: "#fff", p: 2 }}>
                    <Typography
                      sx={{
                        mb: 1,
                        backgroundColor: "#efeffb",
                        width: "fit-content",
                        borderRadius: "8px",
                        width: "100px",
                        color: "#020e20",
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      {booking.status}
                    </Typography>
                    <Typography sx={{ mb: 1, color: "#555" }}>
                      <b>📅 Date:</b>{" "}
                      {formatUTCtoLocalCalendarDate(
                        booking.start_date,
                        "MMM dd, yyyy"
                      )}
                    </Typography>
                    <Typography
                      sx={{ mb: 2, color: "#555", fontSize: "0.9rem" }}
                    >
                      ⏰ {booking.slots?.[0]?.startTime} -{" "}
                      {booking.slots?.[0]?.endTime}
                    </Typography>

                    <Typography sx={{ fontWeight: "600" }}>
                      👨{" "}
                      <span style={{ fontWeight: "600" }}>
                        {booking.provider_first_name}{" "}
                        {booking.provider_last_name || "Waiting for match..."}
                      </span>
                    </Typography>
                    <Typography sx={{ color: "green", fontWeight: "bold" }}>
                      📞{" "}
                      <a href={`tel:${booking.provider_phone}`}>
                        {booking.provider_phone}
                      </a>
                    </Typography>
                    <Typography>
                      💲 {booking.hourly_rate} CAD per hour
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      mt: 1,
                      width: "250px",
                      ml: 3,
                      mb: 2,
                    }}
                  >
                    <Button
                      variant="contained"
                      color="error"
                      sx={{ width: "100%" }}
                      onClick={() => handleCancel(booking.booking_id)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {showListStatus === "History" && pastBookings.length === 0 && (
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#fafafa" }}>
              <Typography color="text.secondary">
                No history bookings found.
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
