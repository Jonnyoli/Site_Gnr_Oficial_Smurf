import mongoose from "mongoose";

const signatureSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      enum: [
        "CSO_CHAIR",
        "CEG_REPRESENTATIVE",
        "COMMAND",
        "DRH",
        "DEPARTMENT_DIRECTOR",
        "INSPECTOR",
        "OTHER",
      ],
    },
    discordId: { type: String, default: null, index: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    signedAt: { type: Date, default: null },
    signatureCode: { type: String, default: null },
  },
  { _id: false },
);

const versionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true, min: 1 },
    generatedAt: { type: Date, default: Date.now },
    generatedByDiscordId: { type: String, default: null },
    generatedByName: { type: String, default: null },
    documentHash: { type: String, required: true },
    reason: { type: String, default: "Emissão inicial", trim: true },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    department: {
      type: String,
      required: true,
      enum: ["CSO", "CEG", "DRH", "COMMAND", "NIC", "UNIT", "OTHER"],
      index: true,
    },

    documentType: {
      type: String,
      required: true,
      enum: [
        "MEETING_MINUTES",
        "DECISION",
        "REPORT",
        "DISMISSAL",
        "ABSENCE",
        "WEAPONS_PERMIT",
        "COMPLAINT_DECISION",
        "OTHER",
      ],
      index: true,
    },

    documentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["DRAFT", "PREVIEW", "ISSUED", "REVOKED"],
      default: "DRAFT",
      index: true,
    },

    sourceModel: { type: String, required: true, trim: true },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    verificationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    documentHash: {
      type: String,
      required: true,
      index: true,
    },

    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    confidentiality: {
      type: String,
      enum: ["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"],
      default: "RESTRICTED",
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    html: {
      type: String,
      required: true,
    },

    signatures: {
      type: [signatureSchema],
      default: [],
    },

    versions: {
      type: [versionSchema],
      default: [],
    },

    issuedAt: { type: Date, default: null },
    issuedByDiscordId: { type: String, default: null },
    issuedByName: { type: String, default: null },

    revokedAt: { type: Date, default: null },
    revokedByDiscordId: { type: String, default: null },
    revokedByName: { type: String, default: null },
    revocationReason: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

schema.index({ department: 1, documentType: 1, createdAt: -1 });
schema.index({ sourceModel: 1, sourceId: 1, version: -1 });

const DepartmentOfficialDocument =
  mongoose.models.DepartmentOfficialDocument ||
  mongoose.model("DepartmentOfficialDocument", schema);

export default DepartmentOfficialDocument;
