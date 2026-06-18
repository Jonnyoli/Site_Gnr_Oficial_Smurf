import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema(
  {
    value: { type: Number, default: 0, min: 0, max: 10 },
    notApplicable: { type: Boolean, default: false },
    note: { type: String, default: "", maxlength: 1500 },
  },
  { _id: false },
);

const AuditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    byDiscordId: { type: String, required: true },
    byName: { type: String, required: true },
    reason: { type: String, default: "", maxlength: 1500 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const HierarchicalEvaluationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["OFFICER_SERGEANT", "COMMAND_OFFICER"],
      required: true,
      index: true,
    },
    evaluatorDiscordId: { type: String, required: true, index: true },
    evaluatorName: { type: String, required: true },
    evaluatorRank: { type: String, default: "" },
    evaluatorAvatarUrl: { type: String, default: null },

    evaluatedDiscordId: { type: String, required: true, index: true },
    evaluatedName: { type: String, required: true },
    evaluatedRank: { type: String, required: true },
    evaluatedUnit: { type: String, default: "Patrulha" },
    evaluatedAvatarUrl: { type: String, default: null },

    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },

    scores: {
      radioCommunication: { type: ScoreSchema, default: () => ({}) },
      supervisionDecision: { type: ScoreSchema, default: () => ({}) },
      disciplinaryApplication: { type: ScoreSchema, default: () => ({}) },
      commandSupport: { type: ScoreSchema, default: () => ({}) },
      meetingParticipation: { type: ScoreSchema, default: () => ({}) },
      emotionalControl: { type: ScoreSchema, default: () => ({}) },
      codeEResponsibility: { type: ScoreSchema, default: () => ({}) },
      subordinateSupport: { type: ScoreSchema, default: () => ({}) },
      pressureDecision: { type: ScoreSchema, default: () => ({}) },
      operationalCoordination: { type: ScoreSchema, default: () => ({}) },
    },

    strengths: { type: String, default: "", maxlength: 4000 },
    improvements: { type: String, default: "", maxlength: 4000 },
    relevantOccurrences: { type: String, default: "", maxlength: 4000 },
    finalOpinion: { type: String, default: "", maxlength: 4000 },
    recommendation: { type: String, default: "", maxlength: 500 },

    average: { type: Number, default: null, min: 0, max: 10 },
    classification: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "IN_REVIEW",
        "CHANGES_REQUESTED",
        "APPROVED",
        "REJECTED",
        "ARCHIVED",
      ],
      default: "DRAFT",
      index: true,
    },
    decision: {
      byDiscordId: { type: String, default: null },
      byName: { type: String, default: null },
      at: { type: Date, default: null },
      reason: { type: String, default: "", maxlength: 1500 },
    },
    discord: {
      channelId: { type: String, default: null },
      messageId: { type: String, default: null },
      jumpUrl: { type: String, default: null },
      publishedAt: { type: Date, default: null },
    },
    audit: { type: [AuditSchema], default: [] },
  },
  { timestamps: true, collection: "hierarchicalevaluations" },
);

HierarchicalEvaluationSchema.index({ type: 1, status: 1, createdAt: -1 });
HierarchicalEvaluationSchema.index({ evaluatedDiscordId: 1, createdAt: -1 });
HierarchicalEvaluationSchema.index({ evaluatorDiscordId: 1, createdAt: -1 });

export default
  mongoose.models.HierarchicalEvaluation ||
  mongoose.model("HierarchicalEvaluation", HierarchicalEvaluationSchema);
