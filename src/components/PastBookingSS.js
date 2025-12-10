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
  // console.log("777", bookings);
  // // console.log("888", selectedDate);
  // console.log("999", selectedDateFinal);

  const bookedDateMaps = React.useMemo(() => {
    const finalColorMap = {};
    const finalStatusMap = {};
    const priorityValueMap = {};

    bookings.forEach((booking) => {
      const statusInfo = statusPriority[booking.status];
      if (!statusInfo) return;
      if (!booking.recurring || booking.recurring.length === 0) return;

      const weekdays = booking.recurring.map((r) => dayMap[r.day]);
      const start = dayjs.utc(booking.start_date).startOf("day");
      const end = dayjs.utc(booking.end_date).startOf("day");

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
    });

    return { colors: finalColorMap, statuses: finalStatusMap };
  }, [bookings]);
  console.log("booking_map", bookedDateMaps);
  console.log("selected_date", selectedDateFinal);
  console.log("booking", bookings);

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
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
           {" "}
      <Box
        sx={
          {
            // border: "solid red 2px"
          }
        }
      >
               {" "}
        <Typography
          variant="h6"
          sx={{ mb: 2, textAlign: "center", fontWeight: "bold" }}
        >
                    My Bookings Calendar        {" "}
        </Typography>
               {" "}
        <Box
          sx={{
            // border: "solid blue 2px",
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
            // 1. Use slots to specify the custom day component
            slots={{
              day: BookingDay,
            }}
            // 2. Use slotProps to pass the booking data to the custom day component
            slotProps={{
              day: {
                bookedDateMaps: bookedDateMaps,
              },
            }}
            // NOTE: renderDay is no longer needed
            // renderDay={(day, selectedDates, pickersDayProps) => { ... }}
          />
          {/* Legend */}     
          <Box
            sx={{
              // mt: 2,
              textAlign: "center",
              // border: "solid green 2px",
            }}
          >
                 
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
                          <LegendDot color="green" label="Booked" />
                          <LegendDot color="orange" label="Pending" />       
            </Box>{" "}
                 
          </Box>
        </Box>
        <Box>selected</Box>
      </Box>
         
    </LocalizationProvider>
  );
}

function LegendDot({ color, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
           {" "}
      <Box
        sx={{
          width: 20,
          height: 12,
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
            <Typography variant="body2">{label}</Typography>   {" "}
    </Box>
  );
}
