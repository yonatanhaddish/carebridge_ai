import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Enums matching your business logic
const SERVICE_LEVELS = ["Level 1", "Level 2", "Level 3"];
const STATUS_ENUM = [
  "Pending",
  "Confirmed",
  "Rejected",
  "Cancelled",
  "Completed",
];
const BOOKING_TYPES = ["specific_date", "recurring"];

// --- 1. Sub-Schema: Time Slots (Matches AI Parser) ---
const timeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true }, // "HH:mm" (24h)
    endTime: { type: String, required: true }, // "HH:mm" (24h)

    // 🌙 The Midnight Rule: Vital for overnight shifts (10pm - 4am)
    crossesMidnight: { type: Boolean, default: false },
  },
  { _id: false }
);

// --- 2. Main Booking Schema ---
const bookingSchema = new mongoose.Schema({
  booking_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  },

  // --- PARTICIPANTS ---
  service_seeker_id: {
    type: String,
    required: true,
    ref: "ServiceSeeker", // Reference to the Client
    index: true,
  },
  service_provider_id: {
    type: String,
    required: true,
    ref: "ServiceProvider", // Reference to the Worker
    index: true,
  },

  // --- DETAILS ---
  service_level: {
    type: String,
    enum: SERVICE_LEVELS,
    required: true,
  },
  status: {
    type: String,
    enum: STATUS_ENUM,
    default: "Pending",
    index: true,
  },

  // --- FINANCIALS ---
  // We snapshot the rate *at the time of booking*
  hourly_rate: { type: Number, required: true },
  total_estimated_hours: { type: Number },
  total_estimated_cost: { type: Number },

  // --- 📅 SCHEDULE ENGINE (AI Compatible) ---
  booking_type: {
    type: String,
    enum: BOOKING_TYPES,
    required: true,
  }, // "specific_date" or "recurring"

  start_date: { type: Date, required: true }, // The anchor start date
  end_date: { type: Date, required: true }, // The anchor end date

  // Stores [1, 3] for Mon/Wed. (0=Sun, 1=Mon...). Empty if type is specific_date.
  days_of_week: { type: [Number], default: [] },

  // The daily shift pattern (e.g. 9am-5pm)
  slots: [timeSlotSchema],

  // --- 📍 LOCATION (GeoJSON) ---
  // Consistent with User/Provider models for map display
  location: {
    address: { type: String, required: true }, // Human readable "123 Main St"
    postal_code: { type: String },
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [Longitude, Latitude]
      required: true,
    },
  },

  notes: { type: String },

  // --- META ---
  request_created_at: { type: Date, default: Date.now },
  confirmed_at: { type: Date },
  cancelled_at: { type: Date },
});

// Index for "Find my bookings" queries
bookingSchema.index({ service_seeker_id: 1, status: 1 });
bookingSchema.index({ service_provider_id: 1, status: 1 });

export default mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);
