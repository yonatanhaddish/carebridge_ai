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
  console.log("activeBookings", activeBookings);
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
    // 1. If database has the total, use it directly
    if (booking.total_estimated_cost) {
      return booking.total_estimated_cost.toFixed(2);
    }

    // 2. Fallback: Calculate manually from slots
    if (booking.slots && booking.slots.length > 0) {
      const slot = booking.slots[0];

      // Extract hours (e.g. "14:00" -> 14)
      const startHour = parseInt(slot.startTime.split(":")[0], 10);
      const endHour = parseInt(slot.endTime.split(":")[0], 10);

      // Calculate duration (Minimum 1 hour to avoid $0 on errors)
      let duration = endHour - startHour;
      if (duration <= 0) duration = 1; // Safety fallback

      return (duration * booking.hourly_rate).toFixed(2);
    }

    // 3. Last Resort: Just return the hourly rate
    return booking.hourly_rate.toFixed(2);
  };
  // Reusable Card Component to avoid code duplication
  const BookingCard = ({ booking, isPast = false }) => (
    <Box
      key={booking.booking_id}
      sx={{
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        p: 3,
        mb: 3,
        backgroundColor: isPast ? "#f5f5f5" : "#fff",
        opacity: isPast ? 0.8 : 1,
        boxShadow: isPast ? "none" : "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography sx={{ fontWeight: "700", fontSize: "1.1rem" }}>
          {booking.service_level} Service
        </Typography>
        <Chip
          label={booking.status}
          color={
            booking.status === "Confirmed"
              ? "success"
              : booking.status === "Pending"
              ? "warning"
              : booking.status === "Cancelled"
              ? "error"
              : "default"
          }
          variant={booking.status === "Confirmed" ? "filled" : "outlined"}
          size="small"
        />
      </Box>

      {/* Dates */}
      <Typography sx={{ mb: 1, color: "#555" }}>
        <b>📅 Date:</b>{" "}
        {formatUTCtoLocalCalendarDate(booking.start_date, "MMM dd, yyyy")}
      </Typography>
      <Typography sx={{ mb: 2, color: "#555", fontSize: "0.9rem" }}>
        ⏰ {booking.slots?.[0]?.startTime} - {booking.slots?.[0]?.endTime}
      </Typography>

      {/* Provider Info */}
      <Typography sx={{ fontWeight: "600" }}>
        Provider:{" "}
        <span style={{ fontWeight: "normal" }}>
          {booking.provider_first_name}{" "}
          {booking.provider_last_name || "Waiting for match..."}
        </span>
      </Typography>

      {/* Phone Number (Privacy Logic) */}
      {booking.provider_phone ? (
        <Typography sx={{ mt: 1, color: "green", fontWeight: "bold" }}>
          📞{" "}
          <a href={`tel:${booking.provider_phone}`}>{booking.provider_phone}</a>
        </Typography>
      ) : (
        !isPast && (
          <Typography
            sx={{
              mt: 1,
              fontStyle: "italic",
              fontSize: "0.85rem",
              color: "#888",
            }}
          >
            (Phone number hidden until confirmed)
          </Typography>
        )
      )}

      {/* Action Buttons (Only for Active/Pending) */}
      {!isPast && (
        <Box sx={{ mt: 3, textAlign: "right" }}>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={() => handleCancel(booking.booking_id)}
            disabled={cancelLoadingId === booking.booking_id}
          >
            {cancelLoadingId === booking.booking_id ? (
              <CircularProgress size={16} />
            ) : (
              "Cancel Request"
            )}
          </Button>
        </Box>
      )}
    </Box>
  );
  console.log("status", showListStatus);
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
                      PSW:{" "}
                      <span style={{ fontWeight: "normal" }}>
                        {booking.provider_first_name}{" "}
                        {booking.provider_last_name || "Waiting for match..."}
                      </span>
                    </Typography>
                    <Typography>
                      Rate: {booking.hourly_rate} CAD per hour
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      mt: 3,
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
