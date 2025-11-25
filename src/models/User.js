import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["Service Provider", "Service Seeker"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Prevent model overwrite error in Next.js hot reload
export default mongoose.models.User || mongoose.model("User", UserSchema);
