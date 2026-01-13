import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const UserSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true,
      required: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      select: false, // Security: Hides password from queries by default
    },
    role: {
      type: String,
      enum: ["service_seeker", "service_provider", "team_lead", "super_admin"],
      default: "service_seeker",
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Prevent Next.js from complaining if the model is already defined
export default mongoose.models.User || mongoose.model("User", UserSchema);
