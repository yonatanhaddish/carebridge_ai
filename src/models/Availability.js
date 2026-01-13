import mongoose from "mongoose";

const TimeSlotSchema = new mongoose.Schema(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const AvailabilitySchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["specific_date", "recurring"],
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    daysOfWeek: {
      type: [Number],
      default: [],
    },

    slots: {
      type: [TimeSlotSchema],
      required: true,
    },

    timezone: {
      type: String,
      default: "America/Toronto",
    },
  },
  { timestamps: true }
);

AvailabilitySchema.index({ user_id: 1, startDate: 1, endDate: 1 });

export default mongoose.models.Availability ||
  mongoose.model("Availability", AvailabilitySchema);
