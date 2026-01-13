import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const ServiceProviderSchema = new mongoose.Schema(
  {
    service_provider_id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
      required: true,
    },
    // Link to the Login User
    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone_number: { type: String, required: true },

    // Physical Location
    home_address: { type: String, required: true },
    postal_code: { type: String, required: true },
    location_latitude: { type: Number, required: true },
    location_longitude: { type: Number, required: true },

    // Business Logic
    service_levels_offered: {
      type: [String],
      enum: ["Level 1", "Level 2", "Level 3"],
      default: ["Level 1"],
    },
    service_prices: {
      type: Map,
      of: Number, // e.g. { "Level 1": 25.00 }
      default: {},
    },

    // THE IMPORTANT PART: The Calendar Structure
    // We use "Mixed" because this will hold the complex JSON from the AI
    availability_calendar: {
      type: mongoose.Schema.Types.Mixed,
      default: { schedules: [], exceptions: [] }, // Default empty structure
    },

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

ServiceProviderSchema.index(
  { location_latitude: 1, location_longitude: 1 },
  { name: "geo_index" }
);

export default mongoose.models.ServiceProvider ||
  mongoose.model("ServiceProvider", ServiceProviderSchema);
