import * as React from "react";
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

// Define status priority and corresponding colors
const statusPriority = {
  Pending: { value: 2, color: "orange", status: "Pending" },
  Booked: { value: 1, color: "green", status: "Booked" },
  Confirmed: { value: 1, color: "green", status: "Confirmed" }, // Added Confirmed status
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

// --- NEW CUSTOM DAY COMPONENT (equivalent to ServerDay) ---
function BookingDay(props) {
  // Destructure custom props (passed via slotProps) and standard PickersDay props
  const { bookedDateMaps, day, outsideCurrentMonth, ...otherProps } = props;

  const dateStr = day.format("YYYY-MM-DD");
  const color = bookedDateMaps.colors[dateStr];

  // If no color (no booking) OR if day is outside the current month, return the standard day
  if (!color || outsideCurrentMonth) {
    // Return the standard PickersDay (no badge, no custom styling)
    return (
      <PickersDay
        {...otherProps}
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
      />
    );
  }

  // Booked/Pending Day: Apply Badge and custom text color
  return (
    <Badge
      key={day.toString()}
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      // Colored dot badge content
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
        outsideCurrentMonth={outsideCurrentMonth}
        day={day}
        sx={{
          // Apply status color to the text number
          // color: `${color} !important`,
          fontWeight: "bold",
          // backgroundColor: "transparent !important",
          backgroundColor: `${color} !important`,

          // Override 'today' styles
          "&.MuiPickersDay-today": {
            color: `${color} !important`,
            border: "none",
          },

          // Override 'selected' styles
          "&.Mui-selected": {
            backgroundColor: "rgba(0, 0, 0, 0.1) !important",
            opacity: 1,
            color: `${color} !important`,
            border: `2px solid ${color} !important`,
          },

          // Override hover state
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04) !important",
            opacity: 1,
            color: `${color} !important`,
          },
        }}
      />
    </Badge>
  );
}
// -------------------------------------------------------------------

export default function PastBookingSS({ bookings = [] }) {
  const [selectedDate, setSelectedDate] = React.useState(null);
  const [selectedDateFinal, setSelectedDateFinal] = React.useState(null);

  const bookedDateMaps = React.useMemo(() => {
    const finalColorMap = {};
    const finalStatusMap = {};
    const priorityValueMap = {};

    bookings.forEach((booking) => {
      const statusInfo = statusPriority[booking.status];
      if (!statusInfo) return;

      // Handle recurring bookings
      if (
        booking.recurring_booking &&
        booking.recurring_booking.recurring &&
        booking.recurring_booking.recurring.length > 0
      ) {
        const weekdays = booking.recurring_booking.recurring.map(
          (r) => dayMap[r.day]
        );
        const start = dayjs
          .utc(booking.recurring_booking.start_date)
          .startOf("day");
        const end = dayjs
          .utc(booking.recurring_booking.end_date)
          .startOf("day");

        let current = start.clone();

        while (current.isSameOrBefore(end)) {
          if (weekdays.includes(current.weekday())) {
            const dateString = current.format("YYYY-MM-DD");
            const currentPriority = priorityValueMap[dateString] || 0;

            if (statusInfo.value > currentPriority) {
              priorityValueMap[dateString] = statusInfo.value;
              finalColorMap[dateString] = statusInfo.color;
              finalStatusMap[dateString] = statusInfo.status;
            }
          }
          current = current.add(1, "day");
        }
      }
      // Handle one-time bookings (with start_datetime/end_datetime)
      else if (booking.start_datetime && booking.end_datetime) {
        const start = dayjs.utc(booking.start_datetime).startOf("day");
        const end = dayjs.utc(booking.end_datetime).startOf("day");

        // For single-day bookings
        if (start.isSame(end, "day")) {
          const dateString = start.format("YYYY-MM-DD");
          const currentPriority = priorityValueMap[dateString] || 0;

          if (statusInfo.value > currentPriority) {
            priorityValueMap[dateString] = statusInfo.value;
            finalColorMap[dateString] = statusInfo.color;
            finalStatusMap[dateString] = statusInfo.status;
          }
        }
        // For multi-day bookings
        else {
          let current = start.clone();
          while (current.isSameOrBefore(end)) {
            const dateString = current.format("YYYY-MM-DD");
            const currentPriority = priorityValueMap[dateString] || 0;

            if (statusInfo.value > currentPriority) {
              priorityValueMap[dateString] = statusInfo.value;
              finalColorMap[dateString] = statusInfo.color;
              finalStatusMap[dateString] = statusInfo.status;
            }
            current = current.add(1, "day");
          }
        }
      }
      // Handle bookings with just start_date and end_date
      else if (booking.start_date && booking.end_date) {
        const start = dayjs.utc(booking.start_date).startOf("day");
        const end = dayjs.utc(booking.end_date).startOf("day");

        let current = start.clone();
        while (current.isSameOrBefore(end)) {
          const dateString = current.format("YYYY-MM-DD");
          const currentPriority = priorityValueMap[dateString] || 0;

          if (statusInfo.value > currentPriority) {
            priorityValueMap[dateString] = statusInfo.value;
            finalColorMap[dateString] = statusInfo.color;
            finalStatusMap[dateString] = statusInfo.status;
          }
          current = current.add(1, "day");
        }
      }
    });

    console.log("Generated date maps:", {
      colors: Object.keys(finalColorMap).length,
      statuses: Object.keys(finalStatusMap).length,
      sampleColors: Object.entries(finalColorMap).slice(0, 5),
    });

    return { colors: finalColorMap, statuses: finalStatusMap };
  }, [bookings]);

  const selectedDateColorAndStatus = React.useMemo(() => {
    if (!selectedDate) return { status: null, color: "text.secondary" };

    const dateStr = selectedDate.format("YYYY-MM-DD");
    const status = bookedDateMaps.statuses[dateStr];
    const color = bookedDateMaps.colors[dateStr];

    if (status) {
      return { status, color };
    }

    return { status: "No Booking", color: "text.secondary" };
  }, [selectedDate, bookedDateMaps.statuses, bookedDateMaps.colors]);

  React.useEffect(() => {
    if (selectedDate) {
      setSelectedDateFinal(`${selectedDate.format("YYYY-MM-DD")}`);
    }
  }, [selectedDate]);

  // Get bookings for selected date
  const selectedDateBookings = React.useMemo(() => {
    if (!selectedDateFinal) return [];

    return bookings.filter((booking) => {
      const dateStr = selectedDateFinal;

      // Check one-time bookings
      if (booking.start_datetime && booking.end_datetime) {
        const start = dayjs.utc(booking.start_datetime).format("YYYY-MM-DD");
        const end = dayjs.utc(booking.end_datetime).format("YYYY-MM-DD");
        return dateStr >= start && dateStr <= end;
      }

      // Check recurring bookings
      if (booking.recurring_booking && booking.recurring_booking.recurring) {
        const start = dayjs
          .utc(booking.recurring_booking.start_date)
          .format("YYYY-MM-DD");
        const end = dayjs
          .utc(booking.recurring_booking.end_date)
          .format("YYYY-MM-DD");

        if (dateStr >= start && dateStr <= end) {
          const selectedDayOfWeek = dayjs(dateStr).day();
          const recurringDays = booking.recurring_booking.recurring.map(
            (r) => dayMap[r.day]
          );
          return recurringDays.includes(selectedDayOfWeek);
        }
      }

      // Check simple date range bookings
      if (booking.start_date && booking.end_date) {
        const start = dayjs.utc(booking.start_date).format("YYYY-MM-DD");
        const end = dayjs.utc(booking.end_date).format("YYYY-MM-DD");
        return dateStr >= start && dateStr <= end;
      }

      return false;
    });
  }, [selectedDateFinal, bookings]);

  console.log("Selected date bookings:", selectedDateBookings);
  console.log("Selected date:", selectedDateFinal);
  console.log("Total bookings:", bookings.length);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography
          variant="h6"
          sx={{ mb: 2, textAlign: "center", fontWeight: "bold" }}
        >
          My Bookings Calendar
        </Typography>
        <Box
          sx={{
            display: "flex",
            mx: "auto",
            justifyContent: "center",
            alignItems: "center",
            gap: 4,
            width: "fit-content",
          }}
        >
          <DateCalendar
            defaultValue={dayjs()}
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            sx={{ border: "solid #020e20 1px", backgroundColor: "#efeffb" }}
            slots={{
              day: BookingDay,
            }}
            slotProps={{
              day: {
                bookedDateMaps: bookedDateMaps,
              },
            }}
          />
          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                backgroundColor: "#EFEFFB",
                p: 2,
                border: "solid #020e20 1px",
              }}
            >
              <LegendDot color="green" label="Booked/Confirmed" />
              <LegendDot color="orange" label="Pending" />
            </Box>

            {/* Selected Date Info */}
            {selectedDateFinal && (
              <Box
                sx={{
                  mt: 2,
                  backgroundColor: "#EFEFFB",
                  p: 2,
                  border: "solid #020e20 1px",
                  minWidth: 200,
                  border:
                    selectedDateColorAndStatus.status === "Pending"
                      ? "solid orange 1px"
                      : selectedDateColorAndStatus.status === "Confirmed"
                      ? "solid green 1px"
                      : "solid #020e20 1px",
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {selectedDateFinal}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Status: {selectedDateColorAndStatus.status}
                </Typography>

                {selectedDateBookings.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Bookings on this date:
                    </Typography>
                    {selectedDateBookings.map((booking, index) => (
                      <Box key={index} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" display="block">
                          • {booking.service_level}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                        >
                          Status: {booking.status}
                        </Typography>
                        {booking.start_datetime && booking.end_datetime && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            Time:{" "}
                            {dayjs(booking.start_datetime).format("HH:mm")} -{" "}
                            {dayjs(booking.end_datetime).format("HH:mm")}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

function LegendDot({ color, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 20,
          height: 12,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}
