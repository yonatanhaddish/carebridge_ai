import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];
const bookingStatusEnum = ["Pending", "Confirmed", "Rejected", "Cancelled"];

// Time slot schema (same as provider)
const timeSlotSchema = new mongoose.Schema({
  start: { type: String, required: true }, // "HH:mm"
  end: { type: String, required: true }, // "HH:mm"
});

// Recurring day schema (same as provider)
const recurringDaySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    required: true,
  },
  time_slots: [timeSlotSchema],
});

// Recurring booking block (same idea as provider)
const recurringBookingSchema = new mongoose.Schema({
  recurring: [recurringDaySchema],
});

// Main Booking Schema
const bookingSchema = new mongoose.Schema({
  booking_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  },

  service_seeker_id: {
    type: String,
    required: true,
    ref: "ServiceSeeker",
  },

  service_provider_id: {
    type: String,
    required: true,
    ref: "ServiceProvider",
  },

  service_level: {
    type: String,
    enum: serviceLevelsEnum,
    required: true,
  },

  price: { type: Number, required: true },

  // For one-time bookings
  start_date: { type: Date },
  end_date: { type: Date },

  // For recurring bookings
  recurring: [recurringDaySchema], // OPTIONAL

  status: {
    type: String,
    enum: bookingStatusEnum,
    default: "Pending",
  },

  request_created_at: { type: Date, default: Date.now },

  confirmation_deadline: { type: Date },

  confirmed_at: { type: Date },
  cancelled_at: { type: Date },

  notes: { type: String },

  // Optional location override
  location_address: { type: String },
  location_postal_code: { type: String },
  location_latitude: { type: Number },
  location_longitude: { type: Number },
});

// Automatically update last_updated_at on save
bookingSchema.pre("save", function (next) {
  this.last_updated_at = new Date();
  next();
});

// Export
export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
