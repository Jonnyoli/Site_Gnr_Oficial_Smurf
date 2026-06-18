import mongoose from "mongoose";

const approvalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "CHANGES_REQUESTED", "REJECTED"],
      default: "PENDING",
    },
    actorDiscordId: { type: String, default: null },
    actorName: { type: String, default: null, trim: true },
    actorRoleId: { type: String, default: null },
    note: { type: String, default: "", trim: true },
    at: { type: Date, default: null },
    code: { type: String, default: null },
  },
  { _id: false },
);

const auditEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "CREATED",
        "UPDATED",
        "STATUS_CHANGED",
        "APPROVED",
        "REPORT_SUBMITTED",
        "DIRECTOR_APPROVED",
        "DIRECTOR_CHANGES_REQUESTED",
        "DIRECTOR_REJECTED",
        "COMMAND_APPROVED",
        "COMMAND_CHANGES_REQUESTED",
        "COMMAND_REJECTED",
        "OFFICIAL_DOCUMENT_ISSUED",
        "OFFICIAL_DOCUMENT_REVOKED",
        "PARTICIPANT_ADDED",
        "PARTICIPANT_REMOVED",
        "SUSPECT_ADDED",
        "SUSPECT_UPDATED",
        "WARRANT_ADDED",
        "WARRANT_UPDATED",
        "INTERROGATION_ADDED",
        "CASE_LINKED",
        "TIMELINE_NOTE_ADDED",
        "DISCORD_SYNC_UPDATED",
        "CANCELLED",
        "DELETED",
      ],
      required: true,
    },
    actorDiscordId: { type: String, default: null },
    actorName: { type: String, default: "Utilizador da Central" },
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
    discordId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    rank: { type: String, default: null, trim: true },
    role: { type: String, default: "OPERACIONAL", trim: true },
    canContribute: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
    addedByDiscordId: { type: String, default: null },
  },
  { _id: false },
);


const vehicleSchema = new mongoose.Schema(
  {
    plate: { type: String, default: null, trim: true, uppercase: true },
    model: { type: String, default: null, trim: true },
    color: { type: String, default: null, trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const suspectSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, trim: true },
    name: { type: String, default: null, trim: true },
    aliases: { type: [String], default: [] },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["UNKNOWN", "IDENTIFIED", "WANTED", "DETAINED", "CLEARED"],
      default: "UNKNOWN",
      index: true,
    },
    discordId: { type: String, default: null, index: true },
    vehicles: { type: [vehicleSchema], default: [] },
    notes: { type: String, default: "", trim: true },
    addedByDiscordId: { type: String, required: true },
    addedByName: { type: String, required: true, trim: true },
    addedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const warrantSchema = new mongoose.Schema(
  {
    targetReference: { type: String, required: true, trim: true },
    targetDiscordId: { type: String, default: null, index: true },
    type: {
      type: String,
      enum: ["DETENTION", "SEARCH", "SEIZURE", "LOCATION", "OTHER"],
      default: "DETENTION",
    },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["ACTIVE", "EXECUTED", "CANCELLED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
    issuedByDiscordId: { type: String, required: true },
    issuedByName: { type: String, required: true, trim: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    executedAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
  },
  { _id: true },
);

const interrogationSchema = new mongoose.Schema(
  {
    subjectReference: { type: String, required: true, trim: true },
    subjectDiscordId: { type: String, default: null },
    conductedByDiscordId: { type: String, required: true },
    conductedByName: { type: String, required: true, trim: true },
    participants: { type: [participantSchema], default: [] },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    summary: { type: String, required: true, trim: true },
    statements: { type: String, default: "", trim: true },
    outcome: { type: String, default: "", trim: true },
    attachments: { type: [attachmentSchema], default: [] },
  },
  { _id: true },
);

const relatedInvestigationSchema = new mongoose.Schema(
  {
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnitOperation",
      required: true,
      index: true,
    },
    caseNumber: { type: String, default: null, trim: true },
    title: { type: String, required: true, trim: true },
    relationType: {
      type: String,
      enum: [
        "SAME_SUSPECT",
        "SAME_VEHICLE",
        "SAME_WEAPON",
        "SAME_ORGANIZATION",
        "SAME_LOCATION",
        "EVIDENCE_CONNECTION",
        "OTHER",
      ],
      default: "OTHER",
    },
    reason: { type: String, required: true, trim: true },
    linkedByDiscordId: { type: String, required: true },
    linkedByName: { type: String, required: true, trim: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const discordSyncSchema = new mongoose.Schema(
  {
    guildId: { type: String, default: null, index: true },
    channelId: { type: String, default: null, index: true },
    messageId: { type: String, default: null },
    jumpUrl: { type: String, default: null },
    lastSyncedAt: { type: Date, default: null },
  },
  { _id: false },
);

const resultMetricsSchema = new mongoose.Schema(
  {
    arrests: { type: Number, default: 0, min: 0 },
    seizures: { type: Number, default: 0, min: 0 },
    injured: { type: Number, default: 0, min: 0 },
    seizedVehicles: { type: Number, default: 0, min: 0 },
    fines: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    caseNumber: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    title: { type: String, required: true, trim: true, index: true },

    category: {
      type: String,
      enum: [
        "STOP",
        "MOTORIZED_PATROL",
        "RECRUITMENT",
        "TRAINING",
        "CIVIL_SECURITY",
        "URBAN_PATROL",
        "RAID",
        "HIGH_RISK",
        "INVESTIGATION",
        "INTELLIGENCE",
        "EAGLE",
        "PREVENTIVE_PATROL",
        "JOINT_OPERATION",
        "OTHER",
      ],
      default: "OTHER",
      index: true,
    },

    primaryUnit: {
      type: String,
      enum: ["UNT", "DI", "USHE", "GIOE", "NIC", "GSA", "EG"],
      required: true,
      index: true,
    },

    supportUnits: {
      type: [
        {
          type: String,
          enum: ["UNT", "DI", "USHE", "GIOE", "NIC", "GSA", "EG"],
        },
      ],
      default: [],
    },

    isPrivateInvestigation: { type: Boolean, default: false, index: true },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "OFFICIAL_DOCUMENT_ISSUED",
      ],
      default: "DRAFT",
      index: true,
    },

    reportStatus: {
      type: String,
      enum: [
        "NOT_REQUIRED",
        "DRAFT",
        "PENDING_DIRECTOR",
        "CHANGES_REQUESTED",
        "DIRECTOR_APPROVED",
        "PENDING_COMMAND",
        "VALIDATED",
        "REJECTED",
      ],
      default: "NOT_REQUIRED",
      index: true,
    },

    commanderDiscordId: { type: String, default: null, index: true },
    commanderName: { type: String, default: null, trim: true },
    participants: { type: [participantSchema], default: [] },


    suspects: { type: [suspectSchema], default: [] },
    warrants: { type: [warrantSchema], default: [] },
    interrogations: { type: [interrogationSchema], default: [] },
    relatedInvestigations: {
      type: [relatedInvestigationSchema],
      default: [],
    },
    discordSync: {
      type: discordSyncSchema,
      default: () => ({}),
    },

    location: { type: String, default: null, trim: true },
    briefing: { type: String, default: "", trim: true },
    objective: { type: String, default: "", trim: true },
    result: { type: String, default: "", trim: true },
    finalReport: { type: String, default: "", trim: true },
    reportRejectionReason: { type: String, default: "", trim: true },
    resultMetrics: { type: resultMetricsSchema, default: () => ({}) },

    scheduledAt: { type: Date, required: true, index: true },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null, index: true },

    attachments: { type: [attachmentSchema], default: [] },
    reportAttachments: { type: [attachmentSchema], default: [] },

    createdByDiscordId: { type: String, required: true, index: true },
    createdByName: { type: String, required: true, trim: true },

    approvedByDiscordId: { type: String, default: null },
    approvedByName: { type: String, default: null },
    approvedAt: { type: Date, default: null },

    reportSubmittedByDiscordId: { type: String, default: null },
    reportSubmittedByName: { type: String, default: null },
    reportSubmittedAt: { type: Date, default: null },

    directorApproval: {
      type: approvalSchema,
      default: () => ({ status: "PENDING" }),
    },

    commandApproval: {
      type: approvalSchema,
      default: () => ({ status: "PENDING" }),
    },

    officialDocument: {
      issued: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ["ACTIVE", "REVOKED"],
        default: "ACTIVE",
        index: true,
      },
      issuedAt: { type: Date, default: null },
      issuedByDiscordId: { type: String, default: null },
      issuedByName: { type: String, default: null },
      verificationCode: { type: String, default: null, index: true },
      documentHash: { type: String, default: null },
      fileUrl: { type: String, default: null },
      version: { type: Number, default: 1, min: 1 },
      revokedAt: { type: Date, default: null },
      revokedByDiscordId: { type: String, default: null },
      revokedByName: { type: String, default: null },
      revocationReason: { type: String, default: "", trim: true },
    },

    auditEvents: { type: [auditEventSchema], default: [] },
  },
  { timestamps: true },
);

schema.index({ primaryUnit: 1, status: 1, scheduledAt: -1 });
schema.index({ supportUnits: 1, status: 1, scheduledAt: -1 });
schema.index({ status: 1, reportStatus: 1, completedAt: -1 });
schema.index({ "participants.discordId": 1, scheduledAt: -1 });
schema.index({ commanderDiscordId: 1, scheduledAt: -1 });
schema.index({ "suspects.reference": 1, scheduledAt: -1 });
schema.index({ "suspects.discordId": 1, scheduledAt: -1 });
schema.index({ "warrants.status": 1, scheduledAt: -1 });
schema.index({ "discordSync.channelId": 1 });
schema.index({
  "officialDocument.issued": 1,
  "officialDocument.status": 1,
  "officialDocument.issuedAt": -1,
});

const UnitOperation =
  mongoose.models.UnitOperation ||
  mongoose.model("UnitOperation", schema);

export default UnitOperation;
