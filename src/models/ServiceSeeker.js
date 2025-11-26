import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

// Main ServiceSeeker schema
const serviceSeekerSchema = new mongoose.Schema({
  service_seeker_id: {
    type: String,
    default: uuidv4,
    unique: true,
    index: true,
  },

  first_name: { type: String, required: true },
  last_name: { type: String, required: true },

  email: { type: String, unique: true, required: true, index: true },
  phone_number: { type: String, required: true },

  home_address: { type: String, required: true },
  postal_code: { type: String, required: true, index: true },

  location_latitude: { type: Number, required: true },
  location_longitude: { type: Number, required: true },

  profile_created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

// Automatically update last_updated_at on save
serviceSeekerSchema.pre("save", function (next) {
  this.last_updated_at = new Date();
  next();
});

export default mongoose.models.ServiceSeeker ||
  mongoose.model("ServiceSeeker", serviceSeekerSchema);
