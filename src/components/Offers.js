import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
} from "@mui/material";
import axios from "axios";

/* ================= UTIL ================= */

const formatUTCDateOnly = (date) =>
  new Date(date).toLocaleDateString("en-CA", { timeZone: "UTC" });

/* ================= COMPONENT ================= */

export default function Offers() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [seekers, setSeekers] = useState({});

  /* ================= FETCH BOOKINGS ================= */

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/pending`
      );
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  };

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

  /* ================= ACTIONS ================= */

  const handleAccept = async (bookingId) => {
    if (!confirm("Accept this booking?")) return;

    setActionLoadingId(bookingId);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/accept/${bookingId}`
      );
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to accept booking");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId) => {
    if (!confirm("Reject this booking?")) return;

    setActionLoadingId(bookingId);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/reject/${bookingId}`
      );
      fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reject booking");
    } finally {
      setActionLoadingId(null);
    }
  };

  /* ================= UI ================= */

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 900,
        mx: "auto",
        width: {
          xs: "100%", // mobile
          sm: "80%", // tablet
          md: "60%", // desktop
        },
      }}
    >
      <Typography variant="h4" fontWeight="bold">
        My Offers
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Review and manage incoming booking offers
      </Typography>

      {loading && (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Paper sx={{ p: 2, mt: 3, bgcolor: "error.light", color: "#fff" }}>
          {error}
        </Paper>
      )}

      {!loading && bookings.length === 0 && (
        <Paper sx={{ p: 3, mt: 3, textAlign: "center" }}>
          No pending offers found.
        </Paper>
      )}

      {bookings.map((booking) => {
        const seeker = seekers[booking.service_seeker_id];

        return (
          <Box
            key={booking.booking_id}
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
              <Typography fontWeight="700" fontSize="1.2rem">
                {booking.service_level}
              </Typography>
              <Typography fontWeight="700">{booking.price} CAD / hr</Typography>
            </Box>

            {/* DATES */}
            {booking.daily_bookings?.map((day, idx) => (
              <Box key={idx} sx={{ mb: 1 }}>
                <Typography fontWeight="600">
                  {formatUTCDateOnly(day.date)}
                </Typography>
                <Typography color="text.secondary">
                  {day.time_slots
                    .map((s) => `${s.start} – ${s.end}`)
                    .join(", ")}
                </Typography>
              </Box>
            ))}

            {/* CLIENT */}
            {seeker && (
              <Box sx={{ mt: 2 }}>
                <Typography fontWeight="600">
                  Client:{" "}
                  <span style={{ fontWeight: 400 }}>
                    {seeker.first_name} {seeker.last_name}
                  </span>
                </Typography>
                <Typography fontWeight="600">
                  Address:{" "}
                  <span style={{ fontWeight: 400 }}>{seeker.home_address}</span>
                </Typography>
                <Typography fontWeight="600">
                  Phone:{" "}
                  <span style={{ fontWeight: 400 }}>{seeker.phone_number}</span>
                </Typography>
              </Box>
            )}

            {/* ACTIONS */}
            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                sx={{ backgroundColor: "#4749df" }}
                disabled={actionLoadingId === booking.booking_id}
                onClick={() => handleAccept(booking.booking_id)}
              >
                {actionLoadingId === booking.booking_id ? (
                  <CircularProgress size={20} sx={{ color: "#fff" }} />
                ) : (
                  "Accept"
                )}
              </Button>

              <Button
                fullWidth
                sx={{
                  backgroundColor: "#efeffb",
                  color: "#020e20",
                  border: "solid #4749df 2px",
                }}
                disabled={actionLoadingId === booking.booking_id}
                onClick={() => handleReject(booking.booking_id)}
              >
                {actionLoadingId === booking.booking_id ? (
                  <CircularProgress size={20} sx={{ color: "#fff" }} />
                ) : (
                  "Reject"
                )}
              </Button>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
