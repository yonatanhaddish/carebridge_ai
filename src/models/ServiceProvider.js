import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// --- Sub-Schemas for Availability (Matches AI & Search Logic) ---

const timeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "17:00"
    crossesMidnight: { type: Boolean, default: false },
  },
  { _id: false }
);

const scheduleRuleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["specific_date", "recurring"],
      required: true,
    },

    // Date Range (Used for both specific dates AND valid range for recurring)
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // Recurring Logic
    daysOfWeek: { type: [Number], default: [] }, // 0=Sun, 1=Mon...

    // The daily shifts
    slots: [timeSlotSchema],
  },
  { _id: false }
);

// --- Main Schema ---

const ServiceProviderSchema = new mongoose.Schema(
  {
    service_provider_id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
      required: true,
    },
    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
      unique: true, // One provider profile per user
    },

    // --- Identity ---
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone_number: { type: String, required: true },
    bio: { type: String }, // Nice to have for "Card" display
    profile_photo: { type: String },

    // --- 📍 LOCATION (GeoJSON - Required for Search API) ---
    // Replaces the old lat/lng fields
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [Longitude, Latitude]
        required: true,
      },
      // Keep address string for display
      address_text: { type: String },
      postal_code: { type: String },
    },

    // --- Business Logic ---
    service_level: {
      type: [String], // Allow multiple service levels
      enum: ["Level 1", "Level 2", "Level 3"],
      default: ["Level 1"],
      index: true, // Indexed for fast filtering
    },

    hourly_rates: {
      type: Map, // Allows keys like "Level 1", "Level 2"
      of: Number, // Values must be numbers (25, 35...)
      default: {},
    },

    // --- 📅 AVAILABILITY ENGINE ---
    availability_calendar: {
      // The "Positive" Rules (When I AM working)
      schedules: [scheduleRuleSchema],
    },

    // The "Negative" Rules (Exceptions / Time Off)
    // We check this array BEFORE checking Bookings.
    // If a date is here, they are invisible in search.
    blocked_dates: { type: [Date], default: [] },

    booking_confirmation_deadline_hours: { type: Number, default: 12 },
    required_advance_notice_hours: { type: Number, default: 24 },
  },
  {
    timestamps: {
      createdAt: "profile_created_at",
      updatedAt: "last_updated_at",
    },
  }
);

// --- ⚡ INDEXES ---
// 1. Geospatial Index (Vital for "Find providers near me")
ServiceProviderSchema.index({ location: "2dsphere" });

export default mongoose.models.ServiceProvider ||
  mongoose.model("ServiceProvider", ServiceProviderSchema);
