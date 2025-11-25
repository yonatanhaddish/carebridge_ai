import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];

// Time slot schema
const timeSlotSchema = new mongoose.Schema({
  start: { type: String, required: true }, // "HH:mm"
  end: { type: String, required: true }, // "HH:mm"
});

// Recurring day schema (for a date range)
const recurringSchema = new mongoose.Schema({
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

// Availability entry for a date range
const availabilityEntrySchema = new mongoose.Schema({
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  recurring: [recurringSchema],
});

// Main ServiceProvider schema
const serviceProviderSchema = new mongoose.Schema({
  service_provider_id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, unique: true, required: true, index: true },
  phone_number: { type: String, required: true },
  home_address: { type: String, required: true },
  postal_code: { type: String, required: true, index: true },
  location_latitude: { type: Number, required: true },
  location_longitude: { type: Number, required: true },
  service_levels_offered: [
    {
      type: String,
      enum: serviceLevelsEnum,
      required: true,
    },
  ],
  service_prices: {
    type: Map,
    of: Number, // decimal as Number
    required: true,
  },
  availability_calendar: [availabilityEntrySchema], // multiple ranges allowed
  booking_confirmation_deadline_hours: { type: Number, default: 12 },
  required_advance_notice_hours: { type: Number, default: 24 },
  profile_created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

// Automatically update last_updated_at on save
serviceProviderSchema.pre("save", function (next) {
  this.last_updated_at = new Date();
  next();
});

export default mongoose.model("ServiceProvider", serviceProviderSchema);
