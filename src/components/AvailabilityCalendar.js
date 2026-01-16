// pages/dashboard_service_provider_cal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Card,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";

export default function AvailabiltiyCalendar() {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [startTime, setStartTime] = useState(dayjs().hour(9).minute(0));
  const [endTime, setEndTime] = useState(dayjs().hour(17).minute(0));
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showCalendarUpdate, setShowCalendarUpdate] = useState(false);

  useEffect(() => {
    if (availability.length > 0) {
      setShowCalendarUpdate(true);

      const timer = setTimeout(() => {
        setShowCalendarUpdate(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [availability]);

  // --- Local conflict check ---
  const localConflictCheck = (newSlot) =>
    selectedSlots.some((slot) => {
      if (slot.date !== newSlot.date) return false;
      const newStart = parseInt(newSlot.start.replace(":", ""), 10);
      const newEnd = parseInt(newSlot.end.replace(":", ""), 10);
      const existStart = parseInt(slot.start.replace(":", ""), 10);
      const existEnd = parseInt(slot.end.replace(":", ""), 10);
      return !(newEnd <= existStart || newStart >= existEnd);
    });

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

  // --- Submit slots to server ---
  const handleSubmitSlots = async () => {
    if (!selectedSlots.length) {
      setNotification({ type: "error", message: "No slots selected!" });
      return;
    }
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
          message: response.data.message || "Conflicts detected",
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

  const handleRemoveSlot = (index) =>
    setSelectedSlots((prev) => prev.filter((_, i) => i !== index));

  const handleCloseNotification = () => setNotification(null);

  // --- Group slots by date ---
  const groupSlotsByDate = (slots) => {
    return slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  };

  const groupedSelected = groupSlotsByDate(selectedSlots);
  const groupedAvailability = groupSlotsByDate(availability);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
          Availability Calendar
        </Typography>

        {/* Add Slot */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add Time Slot
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
            <DatePicker
              label="Date"
              value={selectedDate}
              onChange={setSelectedDate}
            />
            <TimePicker
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
            />
            <TimePicker
              label="End Time"
              value={endTime}
              onChange={setEndTime}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddSlot}
              sx={{
                backgroundColor: "#4749df",
                "&:hover": { backgroundColor: "#6B6DFF" },
              }}
            >
              Add Slot
            </Button>
          </Box>
        </Paper>

        {/* Selected Slots */}
        {selectedSlots.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Slots (Local Check)
            </Typography>
            {Object.entries(groupedSelected).map(([date, slots]) => (
              <Card key={date} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {date}
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}
                  >
                    {slots.map((slot, idx) => (
                      <Chip
                        key={idx}
                        label={`${slot.start} - ${slot.end}`}
                        onDelete={() =>
                          handleRemoveSlot(selectedSlots.indexOf(slot))
                        }
                        deleteIcon={<DeleteIcon />}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="contained"
              onClick={handleSubmitSlots}
              disabled={loading}
              sx={{
                mt: 2,
                backgroundColor: "#4749df",
                "&:hover": { backgroundColor: "#6B6DFF" },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Submit All Slots"
              )}
            </Button>
          </Paper>
        )}

        {/* Already Added Availability */}
        {showCalendarUpdate && availability.length > 0 && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Calendar Updated
            </Typography>
            {Object.entries(groupedAvailability).map(([date, slots]) => (
              <Card key={date} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {date}
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}
                  >
                    {slots.map((slot, idx) => (
                      <Chip
                        key={idx}
                        label={`${slot.start} - ${slot.end}`}
                        color="success"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
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
            {notification?.conflicts && (
              <Box sx={{ mt: 1 }}>
                {notification.conflicts.map((conflict, idx) => (
                  <Typography key={idx} variant="body2" color="error">
                    • {conflict.message}: {conflict.requestedTime} conflicts
                    with {conflict.existingTime}
                  </Typography>
                ))}
              </Box>
            )}
          </Alert>
        </Snackbar>
      </Box>
    </LocalizationProvider>
  );
}
