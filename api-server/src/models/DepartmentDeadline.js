import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    department: {
      type: String,
      enum: ["CSO", "CEG", "DRH", "COMMAND", "NIC", "UNIT"],
      required: true,
      index: true,
    },
    sourceType: { type: String, required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["OPEN", "COMPLETED", "CANCELLED"],
      default: "OPEN",
      index: true,
    },
    assignedDiscordId: { type: String, default: null },
    assignedName: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ department: 1, status: 1, dueAt: 1 });

const DepartmentDeadline =
  mongoose.models.DepartmentDeadline ||
  mongoose.model("DepartmentDeadline", schema);

export default DepartmentDeadline;
