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
import { Box, Typography, Badge } from "@mui/material";

/* ===================== CONSTANTS ===================== */

const statusPriority = {
  Pending: { value: 2, color: "orange", label: "Pending" },
  Booked: { value: 1, color: "green", label: "Booked" },
  Confirmed: { value: 1, color: "green", label: "Confirmed" },
};

const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/* ===================== HELPERS ===================== */

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

export default function MyCalendarSP({}) {
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [selectedDateFinal, setSelectedDateFinal] = React.useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* -------- Build booking color maps -------- */
  const bookedDateMaps = React.useMemo(() => {
    const colors = {};
    const statuses = {};
    const priorityMap = {};

    bookings.forEach((booking) => {
      const statusInfo = statusPriority[booking.status];
      if (!statusInfo) return;

      const applyDate = (dateStr) => {
        const prev = priorityMap[dateStr] || 0;
        if (statusInfo.value > prev) {
          priorityMap[dateStr] = statusInfo.value;
          colors[dateStr] = statusInfo.color;
          statuses[dateStr] = statusInfo.label;
        }
      };

      // One-time bookings
      if (booking.start_datetime && booking.end_datetime) {
        let cur = dayjs.utc(booking.start_datetime).startOf("day");
        const end = dayjs.utc(booking.end_datetime).startOf("day");

        while (cur.isSameOrBefore(end)) {
          applyDate(cur.format("YYYY-MM-DD"));
          cur = cur.add(1, "day");
        }
      }

      // Date range
      else if (booking.start_date && booking.end_date) {
        let cur = dayjs.utc(booking.start_date).startOf("day");
        const end = dayjs.utc(booking.end_date).startOf("day");

        while (cur.isSameOrBefore(end)) {
          applyDate(cur.format("YYYY-MM-DD"));
          cur = cur.add(1, "day");
        }
      }
    });

    return { colors, statuses };
  }, [bookings]);

  useEffect(() => {
    fetchBookings();
  }, [bookings]);
  console.log("111", bookings);

  const fetchBookings = async () => {
    console.log("here");
    setLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/bookings`
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

  /* -------- Selected Date -------- */
  React.useEffect(() => {
    if (selectedDate) {
      setSelectedDateFinal(selectedDate.format("YYYY-MM-DD"));
    }
  }, [selectedDate]);

  /* -------- Bookings for selected date -------- */
  const selectedDateBookings = React.useMemo(() => {
    if (!selectedDateFinal) return [];

    return bookings.filter((booking) => {
      const dateStr = selectedDateFinal;

      if (booking.start_datetime && booking.end_datetime) {
        const start = dayjs.utc(booking.start_datetime).format("YYYY-MM-DD");
        const end = dayjs.utc(booking.end_datetime).format("YYYY-MM-DD");
        return dateStr >= start && dateStr <= end;
      }

      if (booking.start_date && booking.end_date) {
        const start = dayjs.utc(booking.start_date).format("YYYY-MM-DD");
        const end = dayjs.utc(booking.end_date).format("YYYY-MM-DD");
        return dateStr >= start && dateStr <= end;
      }

      return false;
    });
  }, [selectedDateFinal, bookings]);

  const selectedStatus =
    bookedDateMaps.statuses[selectedDateFinal] || "No Booking";

  /* ===================== RENDER ===================== */

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" textAlign="center" fontWeight={700} mb={3}>
          My Bookings
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "auto 320px",
            gap: 4,
            justifyContent: "center",
          }}
        >
          {/* Calendar */}
          <Box sx={{ border: "1px solid #DDD", borderRadius: 2, p: 2 }}>
            <DateCalendar
              value={selectedDate}
              onChange={setSelectedDate}
              slots={{ day: BookingDay }}
              slotProps={{ day: { bookedDateMaps } }}
            />
          </Box>

          {/* Side Panel */}
          <Box sx={{ border: "1px solid #DDD", borderRadius: 2, p: 2 }}>
            {selectedDateFinal ? (
              <>
                <Typography fontWeight={700}>{selectedDateFinal}</Typography>

                <StatusChip status={selectedStatus} />

                {selectedDateBookings.length ? (
                  <Box mt={2}>
                    {selectedDateBookings.map((b, i) => (
                      <Box
                        key={i}
                        sx={{
                          border: "1px solid #EEE",
                          borderRadius: 2,
                          p: 1.5,
                          mb: 1,
                        }}
                      >
                        <Typography fontWeight={600} fontSize={14}>
                          {b.service_level}
                        </Typography>
                        <StatusChip status={b.status} />
                        {b.start_datetime && (
                          <Typography fontSize={13} color="text.secondary">
                            {dayjs.utc(b.start_datetime).format("HH:mm")} –{" "}
                            {dayjs.utc(b.end_datetime).format("HH:mm")}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography mt={2} color="text.secondary">
                    No bookings on this date
                  </Typography>
                )}
              </>
            ) : (
              <Typography color="text.secondary">Select a date</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
