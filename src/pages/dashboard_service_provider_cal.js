import React, { useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";

export default function DashboardServiceProviderCal() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [startTime, setStartTime] = useState(dayjs().hour(9).minute(0));
  const [endTime, setEndTime] = useState(dayjs().hour(17).minute(0));
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Local conflict check ---
  const localConflictCheck = (newSlot) => {
    return selectedSlots.some((slot) => {
      if (slot.date !== newSlot.date) return false;
      const newStart = parseInt(newSlot.start.replace(":", ""), 10);
      const newEnd = parseInt(newSlot.end.replace(":", ""), 10);
      const existStart = parseInt(slot.start.replace(":", ""), 10);
      const existEnd = parseInt(slot.end.replace(":", ""), 10);
      return !(newEnd <= existStart || newStart >= existEnd);
    });
  };

  // --- Add slot locally ---
  const handleAddSlot = () => {
    const newSlot = {
      date: selectedDate.format("YYYY-MM-DD"),
      start: startTime.format("HH:mm"),
      end: endTime.format("HH:mm"),
      day: selectedDate.format("dddd"),
    };

    if (localConflictCheck(newSlot)) {
      setNotification({
        type: "error",
        message: "Slot conflicts with current selection!",
      });
      return;
    }

    setSelectedSlots((prev) => [...prev, newSlot]);
  };

  // --- Submit all selected slots to server ---
  const handleSubmitSlots = async () => {
    if (selectedSlots.length === 0)
      return setNotification({ type: "error", message: "No slots selected!" });
    setLoading(true);

    try {
      const bookingData = selectedSlots.map((slot) => ({
        start_date: slot.date,
        end_date: slot.date,
        booking_type: "availability",
        status: "available",
        recurring: [
          { day: slot.day, time_slots: [{ start: slot.start, end: slot.end }] },
        ],
      }));

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/service_provider/booking_calendar`,
        { action: "add", bookingData }
      );

      if (response.data.success) {
        setAvailability((prev) => [...prev, ...selectedSlots]);
        setSelectedSlots([]);
        setNotification({ type: "success", message: response.data.message });
      } else {
        setNotification({
          type: "error",
          message: response.data.message,
          conflicts: response.data.conflicts,
        });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Failed to submit slots" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSlot = (index) => {
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCloseNotification = () => setNotification(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 4, maxWidth: 900, mx: "auto" }}>
        <Typography variant="h4" gutterBottom>
          Availability Calendar
        </Typography>

        {/* Add Slot Form */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <DatePicker
            label="Date"
            value={selectedDate}
            onChange={setSelectedDate}
          />
          <TimePicker
            label="Start"
            value={startTime}
            onChange={setStartTime}
            sx={{ ml: 2 }}
          />
          <TimePicker
            label="End"
            value={endTime}
            onChange={setEndTime}
            sx={{ ml: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSlot}
            sx={{ ml: 2, mt: 1 }}
          >
            Add Slot
          </Button>
        </Paper>

        {/* Selected Slots Preview */}
        {selectedSlots.length > 0 && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1">
              Selected Slots (local check)
            </Typography>
            {selectedSlots.map((slot, index) => (
              <Chip
                key={index}
                label={`${slot.date} ${slot.start}-${slot.end}`}
                onDelete={() => handleRemoveSlot(index)}
                deleteIcon={<DeleteIcon />}
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
            <Button
              variant="contained"
              onClick={handleSubmitSlots}
              sx={{ mt: 2 }}
            >
              Submit All Slots
            </Button>
          </Paper>
        )}

        {/* Already Added Availability */}
        {availability.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1">Added Availability</Typography>
            {availability.map((slot, idx) => (
              <Chip
                key={idx}
                label={`${slot.date} ${slot.start}-${slot.end}`}
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Paper>
        )}

        {/* Notifications */}
        <Snackbar
          open={!!notification}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification?.type || "info"}
            sx={{ width: "100%" }}
          >
            {notification?.message}
            {notification?.conflicts &&
              notification.conflicts.map((c, i) => (
                <div key={i}>
                  • {c.message}: {c.requestedTime} conflicts with{" "}
                  {c.existingTime}
                </div>
              ))}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
