import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Divider,
  Stack,
} from "@mui/material";
import axios from "axios";

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [seekers, setSeekers] = useState({});

  /* ================= FETCH BOOKINGS ================= */
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/scheduled`
      );
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  console.log("1111111111111", bookings);
  // console.log("222222222", seekers);

  useEffect(() => {
    fetchBookings();
  }, []);

  /* ================= FETCH SEEKERS (BATCHED) ================= */
  useEffect(() => {
    if (!bookings.length) return;

    const fetchSeekers = async () => {
      const uniqueIds = [...new Set(bookings.map((b) => b.service_seeker_id))];

      try {
        const responses = await Promise.all(
          uniqueIds.map((id) =>
            axios.get(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_seeker/${id}`
            )
          )
        );

        const seekerMap = {};
        responses.forEach((res) => {
          seekerMap[res.data.seeker.service_seeker_id] = res.data.seeker;
        });

        setSeekers(seekerMap);
      } catch (err) {
        console.error("Failed to fetch seekers", err);
      }
    };

    fetchSeekers();
  }, [bookings]);

  /* ================= CANCEL ================= */
  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setCancelLoadingId(bookingId);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/cancel/${bookingId}`
      );
      fetchBookings();
    } catch (err) {
      alert("Failed to cancel booking");
    } finally {
      setCancelLoadingId(null);
    }
  };

  /* ================= DATE FORMAT ================= */
  const formatUTCDateOnly = (date) =>
    new Date(date).toLocaleDateString("en-CA", { timeZone: "UTC" });

  /* ================= RENDER ================= */
  return (
    <Box
      sx={{
        maxWidth: 900,
        mx: "auto",
        p: 4,
        width: {
          xs: "100%", // mobile
          sm: "80%", // tablet
          md: "60%", // desktop
        },
      }}
    >
      {" "}
      {/* HEADER */}
      <Box>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Schedule
        </Typography>
        <Typography color="text.secondary" mb={4}>
          Manage your confirmed bookings
        </Typography>

        {/* LOADING */}
        {loading && (
          <Box sx={{ textAlign: "center", mt: 6 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>
      {/* ERROR */}
      {error && (
        <Paper sx={{ p: 2, bgcolor: "error.light", color: "#fff", mb: 3 }}>
          <Typography fontWeight={600}>Error</Typography>
          <Typography>{error}</Typography>
        </Paper>
      )}
      {/* EMPTY */}
      {!loading && bookings.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography>No scheduled bookings found.</Typography>
        </Paper>
      )}
      {/* BOOKINGS */}
      <Stack spacing={3}>
        {bookings.map((booking) => {
          const seeker = seekers[booking.service_seeker_id];

          return (
            <Paper
              key={booking._id}
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                borderRadius: "14px",
                backgroundColor: "#EFEFFB",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "solid #020e20 1px",
              }}
            >
              {/* HEADER */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 2,
                  borderBottom: "1px solid #020e20",
                  pb: 1,
                }}
              >
                <Typography fontSize="1.2rem" fontWeight={700}>
                  {booking.service_level}
                </Typography>

                <Typography fontWeight={700}>
                  {booking.price} CAD / hr
                </Typography>
              </Box>

              {/* SCHEDULE */}
              <Box>
                {booking.daily_bookings.map((day, idx) => (
                  <Box key={idx} sx={{ ml: 1, mb: 1 }}>
                    <Typography fontWeight={600}>
                      {formatUTCDateOnly(day.date)}
                    </Typography>
                    <Typography color="text.secondary">
                      {day.time_slots
                        .map((s) => `${s.start} – ${s.end}`)
                        .join(", ")}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* CLIENT */}

              <Box sx={{ mt: 2 }}>
                <Typography fontWeight="600">
                  Client:{" "}
                  <span style={{ fontWeight: 400 }}>
                    {seeker?.first_name || "—"} {seeker?.last_name || ""}
                  </span>
                </Typography>
                <Typography fontWeight="600">
                  Address:{" "}
                  <span style={{ fontWeight: 400 }}>
                    {" "}
                    {seeker?.home_address || "—"}
                  </span>
                </Typography>
                <Typography fontWeight="600">
                  Phone:{" "}
                  <span style={{ fontWeight: 400 }}>
                    {" "}
                    {seeker?.phone_number || "—"}
                  </span>
                </Typography>
              </Box>

              {/* ACTIONS */}
              <Box
                sx={{
                  display: "flex",
                  width: {
                    xs: "90%",
                    sm: "70%",
                    md: "70%",
                  },
                  justifySelf: "center",
                  mt: 3,
                  minHeight: "45px",
                  // border: "solid red 2px",
                }}
              >
                <Button
                  variant="contained"
                  color="error"
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    width: "100%",
                    backgroundColor: "#4749df",
                  }}
                  onClick={() => handleCancel(booking.booking_id)}
                  disabled={cancelLoadingId === booking.booking_id}
                >
                  {cancelLoadingId === booking.booking_id ? (
                    <CircularProgress size={20} sx={{ color: "#fff" }} />
                  ) : (
                    "Cancel Booking"
                  )}
                </Button>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
