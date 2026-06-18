import mongoose from "mongoose";

const resolutionSchema = new mongoose.Schema(
  {
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    resolvedByDiscordId: { type: String, default: null },
    resolvedByName: { type: String, default: null },
    note: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    alertKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    type: {
      type: String,
      enum: [
        "OPEN_SHIFT",
        "INACTIVITY",
        "ABSENCE_WITHOUT_PROCESS",
        "EXPIRED_ABSENCE_ROLE",
        "MISSING_RANK",
        "MISSING_UNIT",
        "HOURS_MISMATCH",
        "PERMIT_EXPIRING",
        "STALE_PROCESS",
      ],
      required: true,
      index: true,
    },

    severity: {
      type: String,
      enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },

    subjectDiscordId: {
      type: String,
      required: true,
      index: true,
    },

    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    sourceType: {
      type: String,
      default: "DRH_WORKFORCE",
    },

    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },

    lastDetectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    resolution: {
      type: resolutionSchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

schema.index({
  subjectDiscordId: 1,
  type: 1,
  lastDetectedAt: -1,
});

const DRHAlert =
  mongoose.models.DRHAlert ||
  mongoose.model("DRHAlert", schema);

export default DRHAlert;
