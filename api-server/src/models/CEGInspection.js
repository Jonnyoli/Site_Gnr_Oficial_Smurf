import mongoose from "mongoose";

const findingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "INFO",
    },
    description: { type: String, default: "", trim: true },
    recommendation: { type: String, default: "", trim: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false },
);

const evidenceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, default: null, trim: true },
    note: { type: String, default: "", trim: true },
    addedByDiscordId: { type: String, default: null },
    addedByName: { type: String, default: null },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const auditSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    actorDiscordId: { type: String, default: null },
    actorName: { type: String, default: "Sistema" },
    note: { type: String, default: "" },
    at: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    inspectionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    unit: {
      type: String,
      required: true,
      enum: ["UNT", "DI", "USHE", "GIOE", "NIC", "GSA", "EG", "OTHER"],
      index: true,
    },

    title: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "IN_PROGRESS",
        "AWAITING_RESPONSE",
        "AWAITING_COMMAND",
        "APPROVED",
        "RETURNED",
        "ARCHIVED",
      ],
      default: "DRAFT",
      index: true,
    },

    risk: {
      type: String,
      enum: ["REGULAR", "ATTENTION", "CRITICAL"],
      default: "REGULAR",
      index: true,
    },

    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    inspectorDiscordId: { type: String, required: true },
    inspectorName: { type: String, required: true },

    summary: { type: String, default: "", trim: true },
    unitResponse: { type: String, default: "", trim: true },
    commandDecision: { type: String, default: "", trim: true },

    metrics: {
      goalsPercentage: { type: Number, default: 0, min: 0, max: 100 },
      operations: { type: Number, default: 0, min: 0 },
      trainings: { type: Number, default: 0, min: 0 },
      recruitments: { type: Number, default: 0, min: 0 },
      incidents: { type: Number, default: 0, min: 0 },
    },

    findings: { type: [findingSchema], default: [] },
    evidence: { type: [evidenceSchema], default: [] },

    dueAt: { type: Date, default: null, index: true },

    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },

    auditEvents: { type: [auditSchema], default: [] },
  },
  { timestamps: true },
);

schema.index({ unit: 1, status: 1, createdAt: -1 });
schema.index({ dueAt: 1, status: 1 });

const CEGInspection =
  mongoose.models.CEGInspection ||
  mongoose.model("CEGInspection", schema);

export default CEGInspection;
