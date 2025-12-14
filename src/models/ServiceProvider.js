import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const serviceLevelsEnum = ["Level 1", "Level 2", "Level 3"];

/**
 * Time slot schema
 */
const TimeSlotSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // HH:mm
    end: { type: String, required: true }, // HH:mm
  },
  { _id: false }
);

/**
 * Concrete availability per day
 */
const DailyAvailabilitySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    time_slots: { type: [TimeSlotSchema], required: true },
  },
  { _id: false }
);

/**
 * ServiceProvider schema
 */
const ServiceProviderSchema = new mongoose.Schema({
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
    { type: String, enum: serviceLevelsEnum, required: true },
  ],

  service_prices: { type: Map, of: Number, required: true },

  // ✅ Concrete daily availability
  availability: [DailyAvailabilitySchema],

  booking_confirmation_deadline_hours: { type: Number, default: 12 },
  required_advance_notice_hours: { type: Number, default: 24 },

  profile_created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

/**
 * Auto-update last_updated_at
 */
ServiceProviderSchema.pre("save", function (next) {
  this.last_updated_at = new Date();
  next();
});

function setUpdatedAt(next) {
  const update = this.getUpdate();
  if (update) {
    if (!update.$set) update.$set = {};
    update.$set.last_updated_at = new Date();
  }
  next();
}

ServiceProviderSchema.pre("findOneAndUpdate", setUpdatedAt);
ServiceProviderSchema.pre("updateOne", setUpdatedAt);
ServiceProviderSchema.pre("updateMany", setUpdatedAt);

export default mongoose.models.ServiceProvider ||
  mongoose.model("ServiceProvider", ServiceProviderSchema);
