import mongoose from "mongoose";

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

const attachmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, default: null, trim: true },
    note: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    processNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "ABSENCE",
        "DISMISSAL",
        "TIMESHEET_REVIEW",
        "WEAPONS_PERMIT_ISSUE",
        "WEAPONS_PERMIT_REVOKE",
        "RECORD_CLEANUP",
        "TICKET",
        "OTHER",
      ],
      index: true,
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "OPEN",
        "AWAITING_COMMAND",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "ARCHIVED",
      ],
      default: "OPEN",
      index: true,
    },

    subjectDiscordId: { type: String, required: true, index: true },
    subjectName: { type: String, required: true, trim: true },
    subjectRank: { type: String, default: null },
    subjectUnit: { type: String, default: null },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    requestedByDiscordId: { type: String, required: true },
    requestedByName: { type: String, required: true },

    assignedToDiscordId: { type: String, default: null },
    assignedToName: { type: String, default: null },

    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },

    recordCleanup: {
      incidents: { type: Number, default: 0, min: 0 },
      baseAmount: { type: Number, default: 150000, min: 0 },
      incidentAmount: { type: Number, default: 50000, min: 0 },
      maximumAmount: { type: Number, default: 500000, min: 0 },
      calculatedAmount: { type: Number, default: 0, min: 0 },
      paid: { type: Boolean, default: false },
    },

    weaponsPermit: {
      permitNumber: { type: String, default: null },
      validFrom: { type: Date, default: null },
      validUntil: { type: Date, default: null },
      reason: { type: String, default: "" },
    },

    dismissal: {
      commandConsent: { type: Boolean, default: false },
      vaultCleared: { type: Boolean, default: false },
      accessesRevoked: { type: Boolean, default: false },
      letterIssued: { type: Boolean, default: false },
    },

    attachments: { type: [attachmentSchema], default: [] },

    commandDecision: { type: String, default: "", trim: true },
    commandDecisionAt: { type: Date, default: null },
    commandDecisionByDiscordId: { type: String, default: null },
    commandDecisionByName: { type: String, default: null },

    completedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },

    auditEvents: { type: [auditSchema], default: [] },
  },
  { timestamps: true },
);

schema.index({ type: 1, status: 1, createdAt: -1 });
schema.index({ subjectDiscordId: 1, createdAt: -1 });

const DRHProcess =
  mongoose.models.DRHProcess ||
  mongoose.model("DRHProcess", schema);

export default DRHProcess;
