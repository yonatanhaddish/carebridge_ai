import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];
const bookingStatusEnum = ["Pending", "Confirmed", "Rejected", "Cancelled"];

/**
 * Time slot schema (same as provider)
 */
const TimeSlotSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // HH:mm
    end: { type: String, required: true }, // HH:mm
  },
  { _id: false }
);

/**
 * Booking for a single day
 */
const DailyBookingSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    time_slots: { type: [TimeSlotSchema], required: true },
  },
  { _id: false }
);

/**
 * Main Booking schema
 */
const BookingSchema = new mongoose.Schema({
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

  // ✅ Concrete daily bookings
  daily_bookings: [DailyBookingSchema],

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

/**
 * Auto-update timestamps
 */
BookingSchema.pre("save", function (next) {
  if (!this.request_created_at) this.request_created_at = new Date();
  next();
});

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
