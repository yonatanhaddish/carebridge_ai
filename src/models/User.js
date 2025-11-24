import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // ✅ hashed password
  createdAt: { type: Date, default: Date.now },
});

// Prevent model overwrite error in Next.js hot reload
export default mongoose.models.User || mongoose.model("User", UserSchema);
