import mongoose from "mongoose";

const actionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["APPROVED", "RETURNED", "REJECTED", "CLARIFICATION_REQUESTED"],
      required: true,
    },
    actorDiscordId: { type: String, required: true },
    actorName: { type: String, required: true },
    note: { type: String, default: "", trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    sourceDepartment: {
      type: String,
      enum: ["CSO", "CEG", "DRH", "NIC", "UNIT", "SYSTEM"],
      required: true,
      index: true,
    },

    sourceType: { type: String, required: true, index: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true },

    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
      default: "NORMAL",
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "RETURNED", "REJECTED", "CLARIFICATION"],
      default: "PENDING",
      index: true,
    },

    dueAt: { type: Date, default: null, index: true },

    requestedByDiscordId: { type: String, default: null },
    requestedByName: { type: String, default: null },

    actions: { type: [actionSchema], default: [] },

    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ status: 1, priority: 1, createdAt: -1 });

const ExecutiveDecision =
  mongoose.models.ExecutiveDecision ||
  mongoose.model("ExecutiveDecision", schema);

export default ExecutiveDecision;
