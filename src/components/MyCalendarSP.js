import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import weekday from "dayjs/plugin/weekday";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(utc);
dayjs.extend(weekday);
dayjs.extend(isSameOrBefore);

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import { Box, Typography, Badge, CircularProgress } from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import axios from "axios";

/* ===================== CONSTANTS ===================== */

const statusPriority = {
  Pending: { value: 2, color: "orange", label: "Pending" },
  Booked: { value: 1, color: "green", label: "Booked" },
  Confirmed: { value: 1, color: "green", label: "Confirmed" },
};

/* ===================== HELPERS ===================== */

// ✅ UTC‑safe date formatter (works globally)
const formatUTCDateOnly = (date) => {
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function StatusChip({ status }) {
  const isConfirmed = status === "Confirmed" || status === "Booked";
  const isPending = status === "Pending";

  return (
    <Box
      sx={{
        display: "inline-block",
        px: 1.5,
        py: 0.25,
        mt: 0.5,
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        bgcolor: isConfirmed ? "#E6F4EA" : isPending ? "#FFF4E5" : "#EEE",
        color: isConfirmed ? "#1E7F43" : isPending ? "#B54708" : "#555",
      }}
    >
      {status}
    </Box>
  );
}

/* ===================== CALENDAR DAY ===================== */

function BookingDay(props) {
  const { bookedDateMaps, day, outsideCurrentMonth, ...otherProps } = props;

  const dateStr = day.format("YYYY-MM-DD");
  const color = bookedDateMaps.colors[dateStr];

  if (!color || outsideCurrentMonth) {
    return <PickersDay {...otherProps} day={day} />;
  }

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
      }
    >
      <PickersDay
        {...otherProps}
        day={day}
        sx={{
          fontWeight: "bold",
          backgroundColor: `${color} !important`,
          "&.Mui-selected": {
            border: `2px solid ${color}`,
            backgroundColor: "transparent",
          },
        }}
      />
    </Badge>
  );
}

/* ===================== MAIN COMPONENT ===================== */

export default function MyCalendarSP() {
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [selectedDateFinal, setSelectedDateFinal] = React.useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seekers, setSeekers] = useState({});

  /* -------- Build booking color maps -------- */
  const bookedDateMaps = React.useMemo(() => {
    const colors = {};
    const statuses = {};
    const priorityMap = {};

    bookings.forEach((booking) => {
      const statusInfo = statusPriority[booking.status];
      if (!statusInfo || !booking.daily_bookings) return;

      booking.daily_bookings.forEach((day) => {
        const dateStr = dayjs.utc(day.date).format("YYYY-MM-DD");

        const prev = priorityMap[dateStr] || 0;
        if (statusInfo.value > prev) {
          priorityMap[dateStr] = statusInfo.value;
          colors[dateStr] = statusInfo.color;
          statuses[dateStr] = statusInfo.label;
        }
      });
    });

    return { colors, statuses };
  }, [bookings]);

  /* ================= FETCH BOOKINGS ================= */
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings/pendingoraccepted`
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
  console.log("2222", bookings);

  /* ================= FETCH SEEKERS ================= */
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

  /* -------- Selected Date -------- */
  React.useEffect(() => {
    if (selectedDate) {
      // ✅ Force UTC so the date never shifts
      setSelectedDateFinal(selectedDate.utc().format("YYYY-MM-DD"));
    }
  }, [selectedDate]);
  /* -------- Bookings for selected date -------- */
  const selectedDateBookings = React.useMemo(() => {
    if (!selectedDateFinal) return [];

    const dateStr = selectedDateFinal;

    return bookings.filter((booking) => {
      // ✅ 1. Daily bookings (YOUR CURRENT DATA)
      if (booking.daily_bookings?.length) {
        return booking.daily_bookings.some(
          (d) => dayjs.utc(d.date).format("YYYY-MM-DD") === dateStr
        );
      }

      // ✅ 2. Datetime range
      if (booking.start_datetime && booking.end_datetime) {
        const start = dayjs.utc(booking.start_datetime).format("YYYY-MM-DD");
        const end = dayjs.utc(booking.end_datetime).format("YYYY-MM-DD");
        return dateStr >= start && dateStr <= end;
      }

      // ✅ 3. Date-only range
      if (booking.start_date && booking.end_date) {
        const start = dayjs.utc(booking.start_date).format("YYYY-MM-DD");
        const end = dayjs.utc(booking.end_date).format("YYYY-MM-DD");
        return dateStr >= start && dateStr <= end;
      }

      return false;
    });
  }, [selectedDateFinal, bookings]);

  console.log("444", selectedDateFinal);
  console.log("555", bookings);
  console.log("333", selectedDateBookings);
  console.log("111", seekers);

  const selectedStatus =
    bookedDateMaps.statuses[selectedDateFinal] || "No Booking";

  /* ===================== RENDER ===================== */

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box
        sx={{
          maxWidth: 900,
          mx: "auto",
          p: 4,
          width: {
            xs: "100%", // mobile
            sm: "60%", // tablet
            md: "45%", // desktop
          },
        }}
      >
        {/* HEADER */}
        <Box>
          <Typography variant="h4" fontWeight={700} mb={1}>
            Calendar
          </Typography>
          <Typography color="text.secondary" mb={4}>
            Manage your bookings
          </Typography>

          {/* LOADING */}
          {loading && (
            <Box sx={{ textAlign: "center", mt: 6 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>

        <Box
          sx={{
            border: "solid #020e20 1px",
            borderRadius: 2,
            width: "fit-content",
          }}
        >
          {/* Calendar */}
          <Box sx={{ borderRadius: 2, p: 2 }}>
            <DateCalendar
              value={selectedDate}
              onChange={setSelectedDate}
              slots={{ day: BookingDay }}
              slotProps={{ day: { bookedDateMaps } }}
            />
            <Box
              sx={{
                display: "flex",
                // border: "solid red 2px",
                width: {
                  xs: "100%",
                  sm: "100%",
                  md: "80%",
                },
                justifyContent: "center",
                justifySelf: "center",
              }}
            >
              <Box sx={{ display: "flex", width: "40%" }}>
                <CircleIcon style={{ color: "green" }} />
                <Typography>Confirmed</Typography>
              </Box>
              <Box sx={{ display: "flex", width: "40%" }}>
                <CircleIcon style={{ color: "orange" }} />{" "}
                <Typography>Pending</Typography>
              </Box>
            </Box>
          </Box>

          {/* Side Panel */}
          <Box
            sx={{
              border: "1px solid #DDD",
              borderRadius: 2,
              p: 2,
              //   border: "solid green 2px",
            }}
          >
            {selectedDateBookings.length ? (
              <Box mt={2}>
                {selectedDateBookings.map((b, i) => (
                  <Box
                    key={i}
                    sx={{
                      border: "2px solid #4749df",
                      borderRadius: 2,
                      p: 1.5,
                      mb: 1,
                      width: {
                        xs: "100%",
                        sm: "80%",
                      },
                      justifySelf: "center",
                    }}
                  >
                    <Typography fontWeight={600} fontSize={14}>
                      {b.service_level}
                    </Typography>

                    <StatusChip status={b.status} />

                    {/* ✅ Daily bookings for selected date */}
                    {b.daily_bookings
                      .filter(
                        (d) =>
                          dayjs.utc(d.date).format("YYYY-MM-DD") ===
                          selectedDateFinal
                      )
                      .map((d, idx) => (
                        <Box key={idx} mt={1}>
                          {d.time_slots.map((slot, j) => (
                            <Typography
                              key={j}
                              fontSize={13}
                              color="text.secondary"
                            >
                              {slot.start} – {slot.end}
                            </Typography>
                          ))}
                        </Box>
                      ))}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography mt={2} color="text.secondary">
                No bookings on this date
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
