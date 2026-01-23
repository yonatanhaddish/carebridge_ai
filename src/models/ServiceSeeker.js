import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const serviceSeekerSchema = new mongoose.Schema({
  service_seeker_id: {
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

  // --- ⚡ THE GEOJSON UPGRADE ---
  // This structure allows MongoDB to calculate distance automatically.
  location: {
    type: {
      type: String,
      enum: ["Point"], // Must be 'Point'
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]  <-- NOTE: Mongo uses [Lng, Lat] order!
      required: true,
    },
  },

  profile_created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

// --- ⚡ THE INDEX ---
// This tells MongoDB "Build a map for these coordinates"
serviceSeekerSchema.index({ location: "2dsphere" });

// Automatically update last_updated_at on save
serviceSeekerSchema.pre("save", function (next) {
  this.last_updated_at = new Date();
  next();
});

export default mongoose.models.ServiceSeeker ||
  mongoose.model("ServiceSeeker", serviceSeekerSchema);
