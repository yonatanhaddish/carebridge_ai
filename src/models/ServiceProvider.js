import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];

// Each availability rule is stored as a single iCal entry.
const icalAvailabilitySchema = new mongoose.Schema({
  ical_id: {
    type: String,
    default: uuidv4,
  },
  ical_string: {
    type: String,
    required: true, // Contains full VCALENDAR/VEVENT with RRULE
  },
  description: {
    type: String,
    default: "",
  },
  created_at: { type: Date, default: Date.now },
});

// Main ServiceProvider schema
const serviceProviderSchema = new mongoose.Schema({
  service_provider_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  },
  user_id: {
    type: String,
    required: true,
    ref: "User",
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
    of: Number,
    required: true,
  },

  // Replaces your entire old recurring availability system
  ical_availability_entries: [icalAvailabilitySchema],

  booking_confirmation_deadline_hours: { type: Number, default: 12 },
  required_advance_notice_hours: { type: Number, default: 24 },

  profile_created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

// Automatically update last_updated_at before save
serviceProviderSchema.pre("save", function (next) {
  this.last_updated_at = new Date();
  next();
});

export default mongoose.models.ServiceProvider ||
  mongoose.model("ServiceProvider", serviceProviderSchema);
