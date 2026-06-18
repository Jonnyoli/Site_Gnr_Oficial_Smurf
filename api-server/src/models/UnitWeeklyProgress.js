import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    goalId: { type: String, required: true },
    label: { type: String, required: true },
    target: { type: Number, required: true, min: 0 },
    automaticValue: { type: Number, default: 0, min: 0 },
    manualAdjustment: { type: Number, default: 0 },
    current: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    unit: {
      type: String,
      enum: ["UNT", "DI", "USHE", "GIOE", "NIC", "GSA", "EG"],
      required: true,
      index: true,
    },
    weekStart: { type: Date, required: true, index: true },
    weekEnd: { type: Date, required: true },
    goals: { type: [goalSchema], default: [] },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    completedActions: { type: Number, default: 0, min: 0 },
    targetActions: { type: Number, default: 0, min: 0 },
    lastCalculatedAt: { type: Date, default: Date.now },
    updatedByDiscordId: { type: String, default: null },
    updatedByName: { type: String, default: null },
  },
  { timestamps: true },
);

schema.index({ unit: 1, weekStart: 1 }, { unique: true });

const UnitWeeklyProgress =
  mongoose.models.UnitWeeklyProgress ||
  mongoose.model("UnitWeeklyProgress", schema);

export default UnitWeeklyProgress;
