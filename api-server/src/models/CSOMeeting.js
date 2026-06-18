import mongoose from "mongoose";

const patrolPartnerSchema = new mongoose.Schema(
  {
    discordId: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    count: { type: Number, default: 0, min: 0 },
    patrolHours: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);


const sergeantEvaluationSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    evaluatorDiscordId: { type: String, default: null },
    evaluatorName: { type: String, default: "Sargento" },
    score: { type: Number, default: null, min: 0, max: 20 },
    content: { type: String, default: "", trim: true },
    createdAt: { type: Date, default: null },
    jumpUrl: { type: String, default: null },
  },
  { _id: false },
);

const activitySnapshotSchema = new mongoose.Schema(
  {
    capturedAt: { type: Date, default: Date.now },
    snapshotVersion: { type: Number, default: 2, min: 1 },

    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },

    totalHours: { type: Number, default: 0, min: 0 },
    periodHours: { type: Number, default: 0, min: 0 },
    accumulatedHours: { type: Number, default: 0, min: 0 },
    weeklyHours: { type: Number, default: 0, min: 0 },
    monthlyHours: { type: Number, default: 0, min: 0 },

    points: { type: Number, default: 0, min: 0 },

    patrolHours: { type: Number, default: 0, min: 0 },
    patrolCount: { type: Number, default: 0, min: 0 },
    soloPatrols: { type: Number, default: 0, min: 0 },
    jointPatrols: { type: Number, default: 0, min: 0 },

    evaluationCount: { type: Number, default: 0, min: 0 },
    evaluationAverage: { type: Number, default: 0, min: 0 },

    sergeantEvaluationCount: { type: Number, default: 0, min: 0 },
    sergeantEvaluationAverage: { type: Number, default: 0, min: 0 },
    sergeantEvaluations: {
      type: [sergeantEvaluationSchema],
      default: [],
    },

    activeAbsences: { type: Number, default: 0, min: 0 },
    activeSanctions: { type: Number, default: 0, min: 0 },

    lastPromotionAt: { type: Date, default: null },
    lastPromotionType: { type: String, default: null },

    patrolPartners: {
      type: [patrolPartnerSchema],
      default: [],
    },

    sourceSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);

const voteSchema = new mongoose.Schema(
  {
    voterDiscordId: {
      type: String,
      required: true,
    },

    voterName: {
      type: String,
      required: true,
      trim: true,
    },

    choice: {
      type: String,
      enum: [
        "PROMOTE",
        "KEEP_RANK",
        "DEMOTE",
        "ABSTAIN",
      ],
      required: true,
    },

    opinion: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const candidateSchema = new mongoose.Schema(
  {
    guardDiscordId: {
      type: String,
      required: true,
    },

    guardName: {
      type: String,
      required: true,
      trim: true,
    },

    currentRank: {
      type: String,
      default: null,
      trim: true,
    },

    currentUnit: {
      type: String,
      default: null,
      trim: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },

    snapshot: {
      type: activitySnapshotSchema,
      default: () => ({}),
    },

    votes: {
      type: [voteSchema],
      default: [],
    },

    recommendation: {
      type: String,
      enum: [
        "PENDING",
        "PROMOTE",
        "KEEP_RANK",
        "DEMOTE",
      ],
      default: "PENDING",
    },

    recommendationNote: {
      type: String,
      default: "",
      trim: true,
    },

    commandDecision: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "RETURNED"],
      default: "PENDING",
    },

    commandDecisionNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false },
);

const attendeeSchema = new mongoose.Schema(
  {
    discordId: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    present: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      enum: ["CSO", "CEG", "COMMAND"],
      default: "CSO",
    },

    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false },
);

const auditEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      trim: true,
    },

    actorDiscordId: {
      type: String,
      default: null,
    },

    actorName: {
      type: String,
      default: "Utilizador da Central",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    meetingNumber: {
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
      enum: [
        "PREPARATION",
        "VOTING_OPEN",
        "VOTING_CLOSED",
        "AWAITING_CEG",
        "AWAITING_COMMAND",
        "APPROVED",
        "REJECTED",
        "RETURNED",
        "COMPLETED",
      ],
      default: "PREPARATION",
      index: true,
    },

    weekStart: {
      type: Date,
      required: true,
      index: true,
    },

    weekEnd: {
      type: Date,
      required: true,
      index: true,
    },

    openedByDiscordId: {
      type: String,
      required: true,
      index: true,
    },

    openedByName: {
      type: String,
      required: true,
      trim: true,
    },

    attendees: {
      type: [attendeeSchema],
      default: [],
    },

    cegRepresentative: {
      discordId: { type: String, default: null },
      name: { type: String, default: null, trim: true },
      confirmed: { type: Boolean, default: false },
      confirmedAt: { type: Date, default: null },
      validationNote: { type: String, default: "", trim: true },
    },

    candidates: {
      type: [candidateSchema],
      default: [],
    },

    votingOpenedAt: {
      type: Date,
      default: null,
    },

    votingClosedAt: {
      type: Date,
      default: null,
    },

    submittedToCommandAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    auditEvents: {
      type: [auditEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ status: 1, weekStart: -1 });
schema.index({ "candidates.guardDiscordId": 1, createdAt: -1 });
schema.index({ "attendees.discordId": 1, createdAt: -1 });

const CSOMeeting =
  mongoose.models.CSOMeeting ||
  mongoose.model("CSOMeeting", schema);

export default CSOMeeting;
