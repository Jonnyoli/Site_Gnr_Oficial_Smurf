import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    actorDiscordId: { type: String, default: null },
    actorName: { type: String, default: "Utilizador da Central", trim: true },
    note: { type: String, default: "", trim: true },
    at: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    contentType: { type: String, default: null },
    size: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const participantSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, default: "MEMBRO", trim: true },
    vote: {
      type: String,
      enum: ["NONE", "APPROVE", "REJECT", "ABSTAIN"],
      default: "NONE",
    },
    note: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    department: {
      type: String,
      enum: ["CEG", "CSO", "DRH"],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "SUPERVISION",
        "COMPLAINT",
        "PROMOTION",
        "CFS_PROPOSAL",
        "SERGEANT_EVALUATION",
        "MEETING",
        "DISMISSAL",
        "TIMESHEET_REVIEW",
        "ABSENCE",
        "SUGGESTION",
        "CRIMINAL_RECORD_CLEARANCE",
        "WEAPON_LICENSE",
        "ONBOARDING",
        "TICKET",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "OPEN",
        "IN_REVIEW",
        "AWAITING_CEG",
        "AWAITING_COMMAND",
        "AWAITING_DRH",
        "APPROVED",
        "REJECTED",
        "COMPLETED",
        "ARCHIVED",
        "REVOKED",
      ],
      default: "OPEN",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
      default: "NORMAL",
      index: true,
    },

    targetDiscordId: { type: String, default: null, index: true },
    targetName: { type: String, default: null, trim: true },
    targetUnit: { type: String, default: null, trim: true, index: true },
    targetRank: { type: String, default: null, trim: true },

    participants: { type: [participantSchema], default: [] },

    meetingDate: { type: Date, default: null },
    cegMemberPresent: { type: Boolean, default: false },
    commandConsent: { type: Boolean, default: false },
    commandConsentByDiscordId: { type: String, default: null },
    commandConsentByName: { type: String, default: null },

    incidents: { type: Number, default: 0, min: 0 },
    calculatedAmount: { type: Number, default: 0, min: 0 },

    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    attachments: { type: [attachmentSchema], default: [] },
    history: { type: [historySchema], default: [] },

    createdByDiscordId: { type: String, required: true, index: true },
    createdByName: { type: String, required: true, trim: true },
    assignedToDiscordId: { type: String, default: null, index: true },
    assignedToName: { type: String, default: null, trim: true },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

schema.index({ department: 1, status: 1, createdAt: -1 });
schema.index({ type: 1, status: 1, createdAt: -1 });
schema.index({
  title: "text",
  description: "text",
  targetName: "text",
  referenceNumber: "text",
});

const DepartmentRecord =
  mongoose.models.DepartmentRecord ||
  mongoose.model("DepartmentRecord", schema);

export default DepartmentRecord;
